"""
SOCIAL MEDIA DASHBOARD - TWITTER-ONLY BACKEND
==============================================
FastAPI backend with real Twitter API integration.

Features:
- Real Twitter posting with media support
- Image & video upload handling
- Retry logic with exponential backoff
- Proper error handling

Run: uvicorn main:app --reload --port 8000
"""

import os
import asyncio
import tempfile
from datetime import datetime
from typing import Optional, List
from pathlib import Path

from fastapi import FastAPI, HTTPException, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv

from twitter_service import TwitterService, get_twitter_service

# Load environment variables
load_dotenv()

# Initialize FastAPI
app = FastAPI(
    title="Social Media Dashboard API",
    description="Twitter-focused social media posting API",
    version="2.0.0"
)

# CORS for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000", "*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Temporary upload directory
UPLOAD_DIR = Path(tempfile.gettempdir()) / "smm_uploads"
UPLOAD_DIR.mkdir(exist_ok=True)

# In-memory post storage (replace with database in production)
POSTS_DB: List[dict] = []
POST_ID_COUNTER = 1


# ============== MODELS ==============

class PostCreate(BaseModel):
    content: str
    image_url: Optional[str] = None
    video_url: Optional[str] = None
    scheduled_time: Optional[str] = None


class PostPublish(BaseModel):
    post_id: int


class TwitterCredentials(BaseModel):
    api_key: str
    api_secret: str
    access_token: str
    access_token_secret: str


# ============== HEALTH CHECK ==============

@app.get("/")
async def root():
    return {"status": "ok", "service": "Social Media Dashboard API", "version": "2.0.0"}


@app.get("/api/health")
async def health_check():
    twitter = get_twitter_service()
    return {
        "status": "healthy",
        "twitter_configured": twitter.enabled,
        "timestamp": datetime.utcnow().isoformat()
    }


# ============== TWITTER STATUS ==============

@app.get("/api/twitter/status")
async def get_twitter_status():
    """Get Twitter connection status with account details."""
    twitter = get_twitter_service()
    return twitter.get_status()


@app.post("/api/twitter/test")
async def test_twitter_connection():
    """Test Twitter credentials without posting."""
    twitter = get_twitter_service()

    if not twitter.enabled:
        raise HTTPException(
            status_code=400,
            detail="Twitter not configured. Add credentials to .env file."
        )

    status = twitter.get_status()

    if not status.get("connected"):
        raise HTTPException(
            status_code=401,
            detail=f"Twitter authentication failed: {status.get('error')}"
        )

    return {
        "success": True,
        "message": f"Connected as @{status.get('username')}",
        "username": status.get("username"),
        "user_id": status.get("user_id")
    }


# ============== POSTS CRUD ==============

@app.get("/api/posts")
async def list_posts():
    """List all posts."""
    return {"posts": POSTS_DB, "total": len(POSTS_DB)}


@app.post("/api/posts")
async def create_post(post: PostCreate):
    """Create a new post (draft)."""
    global POST_ID_COUNTER

    new_post = {
        "id": POST_ID_COUNTER,
        "content": post.content,
        "image_url": post.image_url,
        "video_url": post.video_url,
        "platforms": ["twitter"],
        "status": "scheduled" if post.scheduled_time else "draft",
        "scheduled_time": post.scheduled_time,
        "word_count": len(post.content.split()),
        "char_count": len(post.content),
        "created_at": datetime.utcnow().isoformat(),
        "posted_time": None,
        "tweet_id": None,
        "tweet_url": None,
        "error_message": None
    }

    POSTS_DB.insert(0, new_post)
    POST_ID_COUNTER += 1

    return {"success": True, "post": new_post}


@app.delete("/api/posts/{post_id}")
async def delete_post(post_id: int):
    """Delete a post."""
    global POSTS_DB
    POSTS_DB = [p for p in POSTS_DB if p["id"] != post_id]
    return {"success": True}


# ============== MEDIA UPLOAD ==============

@app.post("/api/upload")
async def upload_media(file: UploadFile = File(...)):
    """
    Upload image or video file.
    Returns the local file path for Twitter posting.
    """
    # Validate file type
    content_type = file.content_type or ""

    if not (content_type.startswith("image/") or content_type.startswith("video/")):
        raise HTTPException(
            status_code=400,
            detail=f"Invalid file type: {content_type}. Use image or video files."
        )

    # Read file content
    content = await file.read()
    file_size = len(content)

    # Check file size limits
    is_video = content_type.startswith("video/")
    max_size = 512 * 1024 * 1024 if is_video else 5 * 1024 * 1024

    if file_size > max_size:
        raise HTTPException(
            status_code=400,
            detail=f"File too large. Max: {'512MB' if is_video else '5MB'}"
        )

    # Determine extension
    ext_map = {
        "image/jpeg": ".jpg",
        "image/png": ".png",
        "image/gif": ".gif",
        "image/webp": ".webp",
        "video/mp4": ".mp4",
        "video/quicktime": ".mov",
    }
    ext = ext_map.get(content_type, ".tmp")

    # Save file
    filename = f"upload_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}_{file.filename or 'media'}{ext}"
    file_path = UPLOAD_DIR / filename

    with open(file_path, "wb") as f:
        f.write(content)

    return {
        "success": True,
        "file_path": str(file_path),
        "file_name": filename,
        "file_size": file_size,
        "content_type": content_type,
        "is_video": is_video
    }


# ============== PUBLISH TO TWITTER ==============

@app.post("/api/posts/{post_id}/publish")
async def publish_post(post_id: int):
    """
    Publish a post to Twitter.
    Handles text, images, and videos with retry logic.
    """
    # Find the post
    post = next((p for p in POSTS_DB if p["id"] == post_id), None)

    if not post:
        raise HTTPException(status_code=404, detail="Post not found")

    if post["status"] == "posted":
        raise HTTPException(status_code=400, detail="Post already published")

    # Get Twitter service
    twitter = get_twitter_service()

    if not twitter.enabled:
        raise HTTPException(
            status_code=400,
            detail="Twitter not configured. Add API credentials to .env file."
        )

    # Determine media source
    media_source = post.get("image_url") or post.get("video_url")

    # Post to Twitter with retry
    result = await twitter.post(
        content=post["content"],
        media_url=media_source
    )

    # Update post status
    if result["success"]:
        post["status"] = "posted"
        post["posted_time"] = datetime.utcnow().isoformat()
        post["tweet_id"] = result.get("post_id")
        post["tweet_url"] = result.get("url")
        post["error_message"] = None
    else:
        post["status"] = "failed"
        post["error_message"] = result.get("error")

    return {
        "success": result["success"],
        "post": post,
        "twitter_result": result
    }


@app.post("/api/publish-direct")
async def publish_direct(
    content: str = Form(...),
    file: Optional[UploadFile] = File(None)
):
    """
    Direct publish to Twitter with optional file upload.
    One-step posting without creating a draft first.
    """
    twitter = get_twitter_service()

    if not twitter.enabled:
        raise HTTPException(
            status_code=400,
            detail="Twitter not configured. Add API credentials to .env file."
        )

    media_path = None

    # Handle file upload if provided
    if file:
        content_type = file.content_type or ""

        if not (content_type.startswith("image/") or content_type.startswith("video/")):
            raise HTTPException(status_code=400, detail="Invalid file type")

        file_content = await file.read()

        ext_map = {
            "image/jpeg": ".jpg",
            "image/png": ".png",
            "image/gif": ".gif",
            "video/mp4": ".mp4",
        }
        ext = ext_map.get(content_type, ".tmp")

        filename = f"direct_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}{ext}"
        media_path = UPLOAD_DIR / filename

        with open(media_path, "wb") as f:
            f.write(file_content)

        media_path = str(media_path)

    # Post to Twitter
    result = await twitter.post(
        content=content,
        media_path=media_path
    )

    # Create record
    global POST_ID_COUNTER
    new_post = {
        "id": POST_ID_COUNTER,
        "content": content,
        "platforms": ["twitter"],
        "status": "posted" if result["success"] else "failed",
        "created_at": datetime.utcnow().isoformat(),
        "posted_time": datetime.utcnow().isoformat() if result["success"] else None,
        "tweet_id": result.get("post_id"),
        "tweet_url": result.get("url"),
        "error_message": result.get("error")
    }
    POSTS_DB.insert(0, new_post)
    POST_ID_COUNTER += 1

    return {
        "success": result["success"],
        "post": new_post,
        "twitter_result": result
    }


# ============== DASHBOARD STATS ==============

@app.get("/api/stats")
async def get_stats():
    """Get dashboard statistics."""
    twitter = get_twitter_service()

    total = len(POSTS_DB)
    posted = len([p for p in POSTS_DB if p["status"] == "posted"])
    failed = len([p for p in POSTS_DB if p["status"] == "failed"])
    scheduled = len([p for p in POSTS_DB if p["status"] == "scheduled"])

    return {
        "totalPosts": total,
        "postedPosts": posted,
        "failedPosts": failed,
        "scheduledPosts": scheduled,
        "connectedPlatforms": 1 if twitter.enabled else 0,
        "twitter_connected": twitter.enabled
    }


# ============== PLATFORM STATUS (Compatibility) ==============

@app.get("/api/platforms/status")
async def get_platform_status():
    """Get all platform connection status."""
    twitter = get_twitter_service()
    twitter_status = twitter.get_status()

    return [
        {
            "id": 1,
            "platform": "twitter",
            "connected": twitter_status.get("connected", False),
            "account_name": twitter_status.get("username", ""),
            "username": f"@{twitter_status.get('username', '')}" if twitter_status.get("username") else None,
            "avatar_url": twitter_status.get("profile_image"),
            "error": twitter_status.get("error")
        },
        {"id": 2, "platform": "facebook", "connected": False, "account_name": ""},
        {"id": 3, "platform": "linkedin", "connected": False, "account_name": ""},
        {"id": 4, "platform": "instagram", "connected": False, "account_name": ""},
        {"id": 5, "platform": "youtube", "connected": False, "account_name": ""},
    ]


# ============== RUN SERVER ==============

if __name__ == "__main__":
    import uvicorn
    print("\n" + "=" * 60)
    print("SOCIAL MEDIA DASHBOARD - TWITTER API SERVER")
    print("=" * 60)
    print("\nStarting server on http://localhost:8000")
    print("API docs: http://localhost:8000/docs")
    print("\nMake sure your .env file has Twitter credentials!")
    print("=" * 60 + "\n")

    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
