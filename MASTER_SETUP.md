# MASTER SETUP GUIDE - Twitter Social Media Dashboard

## Quick Start (5 Steps)

### Step 1: Get Twitter API Keys

1. Go to [Twitter Developer Portal](https://developer.twitter.com/en/portal/dashboard)
2. Create a **Project** and **App**
3. Set App permissions to **"Read and write"**
4. Generate these 4 keys:
   - API Key (Consumer Key)
   - API Secret (Consumer Secret)
   - Access Token
   - Access Token Secret

### Step 2: Configure Backend

```bash
# Go to backend folder
cd backend

# Create .env file
copy .env.example .env

# Edit .env with your keys:
# TWITTER_API_KEY=your_api_key
# TWITTER_API_SECRET=your_api_secret
# TWITTER_ACCESS_TOKEN=your_access_token
# TWITTER_ACCESS_TOKEN_SECRET=your_access_token_secret
```

### Step 3: Install Dependencies

```bash
# Backend (Python)
cd backend
pip install -r requirements.txt

# Frontend (Node.js)
cd ..
npm install
```

### Step 4: Start Servers

**Terminal 1 - Backend:**
```bash
cd backend
python main.py
```
Backend runs at: http://localhost:8000

**Terminal 2 - Frontend:**
```bash
npm run dev
```
Frontend runs at: http://localhost:5173

### Step 5: Test & Post

1. Open http://localhost:5173
2. Go to **Settings** → Check "Backend Online" and "Twitter Connected"
3. Go to **Create Post** → Write tweet → Click "Post to Twitter"

---

## Features

- **Real Twitter Posting** - Actually posts to your Twitter account
- **Image Upload** - Upload JPG, PNG, GIF, WEBP (max 5MB)
- **Video Upload** - Upload MP4, MOV (max 512MB)
- **Retry Logic** - Auto-retries failed posts 3 times with exponential backoff
- **Character Counter** - Shows Twitter's 280 char limit
- **Live Preview** - See how your tweet will look
- **Draft System** - Save drafts and publish later

---

## Project Structure

```
SMM/
├── backend/                 # Python FastAPI Server
│   ├── main.py             # API endpoints
│   ├── twitter_service.py  # Twitter API with retry logic
│   ├── requirements.txt    # Python dependencies
│   └── .env                # Your API keys (create this!)
│
├── pages/                  # React Pages
│   ├── CreatePost.tsx      # Tweet creation UI
│   ├── Posts.tsx           # Posts list & management
│   ├── Dashboard.tsx       # Overview stats
│   └── Settings.tsx        # Twitter configuration
│
├── services/
│   └── api.ts              # Frontend API client
│
└── package.json            # Node dependencies
```

---

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/health` | GET | Check backend status |
| `/api/twitter/status` | GET | Check Twitter connection |
| `/api/twitter/test` | POST | Test Twitter credentials |
| `/api/posts` | GET | List all posts |
| `/api/posts` | POST | Create new post |
| `/api/posts/{id}/publish` | POST | Publish to Twitter |
| `/api/publish-direct` | POST | Direct post with file upload |
| `/api/upload` | POST | Upload media file |

---

## Retry Logic

The Twitter service includes automatic retry with exponential backoff:

```
Attempt 1: Immediate
Attempt 2: Wait 2 seconds
Attempt 3: Wait 4 seconds
```

Handles:
- Rate limits (429 errors)
- Server errors (5xx)
- Temporary network issues

---

## Troubleshooting

### "Backend Offline"
```bash
cd backend
python main.py
```

### "Twitter Not Connected"
1. Check your `.env` file has all 4 keys
2. Verify keys at [Twitter Developer Portal](https://developer.twitter.com)
3. Make sure App permissions are "Read and write"

### "403 Forbidden"
- Your Twitter App needs "Read and write" permissions
- Regenerate Access Token after changing permissions

### "Duplicate Content"
- Twitter doesn't allow identical tweets
- Modify your content slightly

### Video Upload Fails
- Max duration: 2 minutes 20 seconds
- Max size: 512MB
- Format: MP4 or MOV

---

## Environment Variables

Create `backend/.env`:

```env
TWITTER_API_KEY=your_api_key_here
TWITTER_API_SECRET=your_api_secret_here
TWITTER_ACCESS_TOKEN=your_access_token_here
TWITTER_ACCESS_TOKEN_SECRET=your_access_token_secret_here
```

---

## Twitter API Setup Details

1. **Create Developer Account**
   - Go to: https://developer.twitter.com/en/portal/petition/essential/basic-info
   - Sign up for Free tier

2. **Create Project & App**
   - Dashboard → Create Project
   - Name: "Social Media Dashboard"
   - Create App within project

3. **Configure User Authentication**
   - App Settings → User authentication settings → Set up
   - App permissions: **Read and write**
   - Type of App: **Web App, Automated App or Bot**
   - Callback URL: `http://localhost:5173`
   - Website URL: `http://localhost:5173`

4. **Generate Keys**
   - Keys and Tokens tab
   - Generate API Key and Secret
   - Generate Access Token and Secret

---

## Production Deployment

### Vercel (Frontend)
```bash
npm run build
vercel --prod
```

### Backend
Deploy `backend/` folder to:
- Railway
- Render
- Heroku
- Any Python host

Update `API_BASE_URL` in `services/api.ts` to your backend URL.

---

## Support

- Twitter API Docs: https://developer.twitter.com/en/docs
- Tweepy Docs: https://docs.tweepy.org/
- FastAPI Docs: https://fastapi.tiangolo.com/

---

Created for Twitter-only social media posting with real API integration.
