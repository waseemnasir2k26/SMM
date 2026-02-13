"""
TWITTER SERVICE - MASTER MODULE
================================
Full Twitter API integration with:
- Image uploads (JPEG, PNG, GIF, WEBP)
- Video uploads (MP4, MOV) with chunked upload
- URL-to-file conversion for remote media
- Retry logic with exponential backoff
- Comprehensive error handling

Environment Variables Required:
- TWITTER_API_KEY
- TWITTER_API_SECRET
- TWITTER_ACCESS_TOKEN
- TWITTER_ACCESS_TOKEN_SECRET
"""

import os
import asyncio
import tempfile
from typing import Optional, Dict, Any, List
from pathlib import Path
from functools import wraps

import httpx
import tweepy
from dotenv import load_dotenv

load_dotenv()


# ============== RETRY DECORATOR ==============

def retry_async(max_retries: int = 3, base_delay: float = 2.0, max_delay: float = 30.0):
    """
    Async retry decorator with exponential backoff.

    Args:
        max_retries: Maximum number of retry attempts
        base_delay: Initial delay between retries (seconds)
        max_delay: Maximum delay cap (seconds)
    """
    def decorator(func):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            last_error = None

            for attempt in range(max_retries):
                try:
                    return await func(*args, **kwargs)

                except tweepy.errors.TooManyRequests as e:
                    # Rate limited - wait longer
                    wait_time = min(base_delay * (3 ** attempt), max_delay)
                    print(f"[TWITTER] Rate limited. Waiting {wait_time}s before retry {attempt + 1}/{max_retries}")
                    last_error = e
                    await asyncio.sleep(wait_time)

                except tweepy.errors.TwitterServerError as e:
                    # Server error - retry with backoff
                    wait_time = min(base_delay * (2 ** attempt), max_delay)
                    print(f"[TWITTER] Server error. Retry {attempt + 1}/{max_retries} in {wait_time}s")
                    last_error = e
                    await asyncio.sleep(wait_time)

                except Exception as e:
                    # Other errors - retry with shorter backoff
                    if attempt < max_retries - 1:
                        wait_time = min(base_delay * (2 ** attempt), max_delay)
                        print(f"[TWITTER] Error: {e}. Retry {attempt + 1}/{max_retries} in {wait_time}s")
                        last_error = e
                        await asyncio.sleep(wait_time)
                    else:
                        last_error = e
                        break

            # All retries exhausted
            error_msg = str(last_error) if last_error else "Unknown error after retries"
            print(f"[TWITTER] All {max_retries} retries failed: {error_msg}")
            raise last_error if last_error else Exception(error_msg)

        return wrapper
    return decorator


# ============== TWITTER SERVICE CLASS ==============

class TwitterService:
    """
    Complete Twitter API Service with media support and retry logic.
    """

    # Twitter API Limits
    MAX_TWEET_LENGTH = 280
    MAX_IMAGE_SIZE = 5 * 1024 * 1024      # 5MB
    MAX_VIDEO_SIZE = 512 * 1024 * 1024    # 512MB
    MAX_GIF_SIZE = 15 * 1024 * 1024       # 15MB

    SUPPORTED_IMAGE_TYPES = ['.jpg', '.jpeg', '.png', '.gif', '.webp']
    SUPPORTED_VIDEO_TYPES = ['.mp4', '.mov']

    def __init__(self):
        """Initialize Twitter service with credentials from environment."""
        self.api_key = os.getenv("TWITTER_API_KEY")
        self.api_secret = os.getenv("TWITTER_API_SECRET")
        self.access_token = os.getenv("TWITTER_ACCESS_TOKEN")
        self.access_token_secret = os.getenv("TWITTER_ACCESS_TOKEN_SECRET")

        self.enabled = all([
            self.api_key,
            self.api_secret,
            self.access_token,
            self.access_token_secret
        ])

        self._client: Optional[tweepy.Client] = None
        self._api: Optional[tweepy.API] = None
        self._temp_files: List[str] = []

        if self.enabled:
            self._initialize_clients()
        else:
            print("[TWITTER] Not configured - missing credentials")
            self._print_missing_credentials()

    def _print_missing_credentials(self):
        """Print which credentials are missing."""
        missing = []
        if not self.api_key:
            missing.append("TWITTER_API_KEY")
        if not self.api_secret:
            missing.append("TWITTER_API_SECRET")
        if not self.access_token:
            missing.append("TWITTER_ACCESS_TOKEN")
        if not self.access_token_secret:
            missing.append("TWITTER_ACCESS_TOKEN_SECRET")

        if missing:
            print(f"[TWITTER] Missing: {', '.join(missing)}")

    def _initialize_clients(self):
        """Initialize Twitter API clients."""
        try:
            # Client for Twitter API v2 (tweets)
            self._client = tweepy.Client(
                consumer_key=self.api_key,
                consumer_secret=self.api_secret,
                access_token=self.access_token,
                access_token_secret=self.access_token_secret,
                wait_on_rate_limit=True
            )

            # API v1.1 for media uploads
            auth = tweepy.OAuth1UserHandler(
                self.api_key,
                self.api_secret,
                self.access_token,
                self.access_token_secret
            )
            self._api = tweepy.API(auth, wait_on_rate_limit=True)

            print("[TWITTER] Clients initialized successfully")

        except Exception as e:
            print(f"[TWITTER] Failed to initialize: {e}")
            self.enabled = False

    def get_status(self) -> Dict[str, Any]:
        """
        Get Twitter connection status with account details.

        Returns:
            Dict with connection status, username, user_id, and profile image
        """
        if not self.enabled:
            return {
                "connected": False,
                "error": "Twitter credentials not configured",
                "required_keys": [
                    "TWITTER_API_KEY",
                    "TWITTER_API_SECRET",
                    "TWITTER_ACCESS_TOKEN",
                    "TWITTER_ACCESS_TOKEN_SECRET"
                ]
            }

        try:
            user = self._api.verify_credentials()
            return {
                "connected": True,
                "username": user.screen_name,
                "user_id": str(user.id),
                "name": user.name,
                "profile_image": user.profile_image_url_https,
                "followers_count": user.followers_count,
                "following_count": user.friends_count
            }

        except tweepy.errors.Unauthorized as e:
            return {
                "connected": False,
                "error": "Invalid credentials - check your API keys"
            }

        except Exception as e:
            return {
                "connected": False,
                "error": str(e)
            }

    async def download_media(self, url: str) -> Optional[str]:
        """
        Download media from URL to temporary file.

        Args:
            url: URL of the image or video

        Returns:
            Local file path or None if download failed
        """
        try:
            print(f"[TWITTER] Downloading media from: {url[:80]}...")

            async with httpx.AsyncClient(timeout=60.0, follow_redirects=True) as client:
                response = await client.get(url)
                response.raise_for_status()

                # Determine file extension from content type
                content_type = response.headers.get('content-type', '')

                ext_map = {
                    'image/jpeg': '.jpg',
                    'image/jpg': '.jpg',
                    'image/png': '.png',
                    'image/gif': '.gif',
                    'image/webp': '.webp',
                    'video/mp4': '.mp4',
                    'video/quicktime': '.mov',
                }

                ext = None
                for ct, extension in ext_map.items():
                    if ct in content_type:
                        ext = extension
                        break

                if not ext:
                    # Try to get from URL
                    url_path = url.split('?')[0]
                    ext = Path(url_path).suffix.lower()
                    if ext not in self.SUPPORTED_IMAGE_TYPES + self.SUPPORTED_VIDEO_TYPES:
                        ext = '.jpg'  # Default

                # Create temp file
                temp_file = tempfile.NamedTemporaryFile(
                    delete=False,
                    suffix=ext,
                    prefix='twitter_'
                )
                temp_file.write(response.content)
                temp_file.close()

                self._temp_files.append(temp_file.name)

                file_size = len(response.content)
                print(f"[TWITTER] Downloaded: {temp_file.name} ({file_size:,} bytes)")

                return temp_file.name

        except Exception as e:
            print(f"[TWITTER] Download failed: {e}")
            return None

    def _get_media_type(self, file_path: str) -> str:
        """Determine media type from file extension."""
        ext = Path(file_path).suffix.lower()

        if ext in self.SUPPORTED_VIDEO_TYPES:
            return 'video'
        elif ext == '.gif':
            return 'gif'
        elif ext in self.SUPPORTED_IMAGE_TYPES:
            return 'image'
        else:
            return 'unknown'

    def _upload_image(self, file_path: str) -> Optional[int]:
        """Upload image to Twitter."""
        try:
            print(f"[TWITTER] Uploading image: {file_path}")
            media = self._api.media_upload(filename=file_path)
            print(f"[TWITTER] Image uploaded. Media ID: {media.media_id}")
            return media.media_id

        except Exception as e:
            print(f"[TWITTER] Image upload error: {e}")
            return None

    def _upload_video_chunked(self, file_path: str) -> Optional[int]:
        """
        Upload video using chunked upload API.
        Required for videos > 5MB and all GIFs.
        """
        try:
            file_size = os.path.getsize(file_path)
            ext = Path(file_path).suffix.lower()

            # Determine media type and category
            if ext == '.mp4':
                media_type = 'video/mp4'
                media_category = 'tweet_video'
            elif ext == '.mov':
                media_type = 'video/quicktime'
                media_category = 'tweet_video'
            elif ext == '.gif':
                media_type = 'image/gif'
                media_category = 'tweet_gif'
            else:
                media_type = 'video/mp4'
                media_category = 'tweet_video'

            print(f"[TWITTER] Chunked upload: {file_path} ({file_size:,} bytes)")
            print(f"[TWITTER] Media type: {media_type}, Category: {media_category}")

            # Chunked upload with progress
            media = self._api.chunked_upload(
                filename=file_path,
                media_type=media_type,
                media_category=media_category,
                wait_for_async_finalize=True
            )

            print(f"[TWITTER] Video uploaded. Media ID: {media.media_id}")
            return media.media_id

        except Exception as e:
            print(f"[TWITTER] Video upload error: {e}")
            return None

    async def upload_media(self, media_source: str) -> Optional[int]:
        """
        Upload media to Twitter from URL or local path.

        Args:
            media_source: URL (http/https) or local file path

        Returns:
            Twitter media ID or None if upload failed
        """
        if not self.enabled:
            print("[TWITTER] Cannot upload - not configured")
            return None

        file_path = media_source

        # Handle file:// prefix
        if media_source.startswith('file://'):
            file_path = media_source[7:]
            print(f"[TWITTER] Using local file: {file_path}")

        # Download if URL
        elif media_source.startswith('http://') or media_source.startswith('https://'):
            file_path = await self.download_media(media_source)
            if not file_path:
                print("[TWITTER] Media download failed")
                return None

        # Verify file exists
        if not os.path.exists(file_path):
            print(f"[TWITTER] File not found: {file_path}")
            return None

        # Determine type and upload
        media_type = self._get_media_type(file_path)

        if media_type == 'video':
            return self._upload_video_chunked(file_path)
        elif media_type == 'gif':
            return self._upload_video_chunked(file_path)
        elif media_type == 'image':
            return self._upload_image(file_path)
        else:
            print(f"[TWITTER] Unsupported media type: {media_type}")
            return None

    @retry_async(max_retries=3, base_delay=2.0)
    async def post(
        self,
        content: str,
        media_url: Optional[str] = None,
        media_path: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Post a tweet with optional media.

        This method includes automatic retry with exponential backoff
        for rate limits and temporary failures.

        Args:
            content: Tweet text (auto-truncated to 280 chars)
            media_url: URL to image/video (will be downloaded)
            media_path: Local path to image/video file

        Returns:
            Dict with success status, tweet ID, URL, and any errors
        """
        if not self.enabled:
            return {
                "success": False,
                "error": "Twitter not configured. Add API credentials to .env file.",
                "platform": "twitter"
            }

        try:
            # Truncate content if needed
            original_length = len(content)
            if original_length > self.MAX_TWEET_LENGTH:
                content = content[:self.MAX_TWEET_LENGTH - 3] + "..."
                print(f"[TWITTER] Content truncated: {original_length} -> {len(content)} chars")

            # Handle media upload
            media_ids = None
            media_source = media_url or media_path

            if media_source:
                print(f"[TWITTER] Processing media...")
                media_id = await self.upload_media(media_source)

                if media_id:
                    media_ids = [media_id]
                    print(f"[TWITTER] Media ready: {media_id}")
                else:
                    print("[TWITTER] Media upload failed - posting text only")

            # Create tweet
            print(f"[TWITTER] Posting tweet ({len(content)} chars)...")

            response = self._client.create_tweet(
                text=content,
                media_ids=media_ids
            )

            tweet_id = str(response.data["id"])
            tweet_url = f"https://twitter.com/i/web/status/{tweet_id}"

            print(f"[TWITTER] SUCCESS! Tweet ID: {tweet_id}")
            print(f"[TWITTER] URL: {tweet_url}")

            return {
                "success": True,
                "post_id": tweet_id,
                "url": tweet_url,
                "platform": "twitter",
                "char_count": len(content),
                "has_media": media_ids is not None
            }

        except tweepy.errors.Forbidden as e:
            error_msg = str(e)

            if "duplicate" in error_msg.lower():
                error_msg = "Duplicate content - this tweet was already posted"
            elif "403" in error_msg:
                error_msg = "Access forbidden - check your app permissions"

            print(f"[TWITTER] Forbidden: {error_msg}")
            return {
                "success": False,
                "error": error_msg,
                "platform": "twitter"
            }

        except tweepy.errors.Unauthorized as e:
            print(f"[TWITTER] Unauthorized: {e}")
            return {
                "success": False,
                "error": "Authentication failed - check your API credentials",
                "platform": "twitter"
            }

        except tweepy.errors.TweepyException as e:
            print(f"[TWITTER] Tweepy error: {e}")
            raise  # Let retry decorator handle it

        except Exception as e:
            print(f"[TWITTER] Unexpected error: {e}")
            return {
                "success": False,
                "error": str(e),
                "platform": "twitter"
            }

        finally:
            # Cleanup temporary files
            self._cleanup_temp_files()

    def _cleanup_temp_files(self):
        """Remove temporary downloaded files."""
        for file_path in self._temp_files:
            try:
                if os.path.exists(file_path):
                    os.remove(file_path)
                    print(f"[TWITTER] Cleaned up: {file_path}")
            except Exception as e:
                print(f"[TWITTER] Cleanup warning: {e}")

        self._temp_files = []


# ============== SINGLETON INSTANCE ==============

_twitter_service: Optional[TwitterService] = None


def get_twitter_service() -> TwitterService:
    """Get singleton TwitterService instance."""
    global _twitter_service

    if _twitter_service is None:
        _twitter_service = TwitterService()

    return _twitter_service


# ============== TESTING ==============

if __name__ == "__main__":
    import asyncio

    async def test():
        print("\n" + "=" * 50)
        print("TWITTER SERVICE TEST")
        print("=" * 50)

        service = get_twitter_service()

        print("\n1. Checking status...")
        status = service.get_status()
        print(f"   Connected: {status.get('connected')}")

        if status.get('connected'):
            print(f"   Username: @{status.get('username')}")
            print(f"   User ID: {status.get('user_id')}")
        else:
            print(f"   Error: {status.get('error')}")

        print("\n" + "=" * 50)

    asyncio.run(test())
