# SniperThinkAI - Complete Documentation

A professional dark-themed Instagram management platform with AI video, photo, and music generation. Built with Next.js 15, TypeScript, and TailwindCSS.

---

## Table of Contents
1. [Quick Start](#quick-start)
2. [Features](#features)
3. [Tech Stack](#tech-stack)
4. [Environment Setup](#environment-setup)
5. [Authentication](#authentication)
6. [AI Features](#ai-features)
7. [Instagram API Integration](#instagram-api-integration)
8. [Database Schema](#database-schema)
9. [API Endpoints](#api-endpoints)
10. [Troubleshooting](#troubleshooting)

---

## Quick Start

### Prerequisites
- Node.js 18+
- npm or yarn
- FFmpeg (for audio/video merge)

### Installation

```bash
# Install dependencies
npm install

# Initialize database
node scripts/init-neon-db.js

# Start development server
npm run dev
```

**Access:** http://localhost:3003

---

## Features

### 🎨 Design
- Pitch black theme (#000000)
- Blue accent (#3b82f6)
- Glass-morphism effects
- Fully responsive

### 📱 Dashboard Pages
| Page | URL | Description |
|------|-----|-------------|
| Dashboard | `/dashboard` | Overview with stats |
| Posts | `/dashboard/posts` | Manage drafts & posts |
| Stories | `/dashboard/stories` | Instagram stories |
| AI Photos | `/dashboard/ai-photos` | Text/Image to Image |
| AI Video | `/dashboard/ai-video` | Text/Image to Video |
| AI Music | `/dashboard/ai-music` | AI music generation |
| My Songs | `/dashboard/my-songs` | Saved music library |
| My Media | `/dashboard/my-media` | Generated media |
| Analytics | `/dashboard/analytics` | Performance metrics |
| Settings | `/dashboard/settings` | Profile & Instagram |

---

## Tech Stack

- **Framework:** Next.js 15 (App Router)
- **Language:** TypeScript
- **Styling:** TailwindCSS
- **Database:** PostgreSQL (Neon)
- **Storage:** Cloudflare R2
- **AI Services:**
  - Replicate (FLUX for images, SVD for videos)
  - Google Gemini (prompt enhancement)
  - Runway (video generation)
  - Suno (music generation)

---

## Environment Setup

Create `.env` file with:

```env
# Database
DATABASE_URL="postgresql://..."

# Authentication
JWT_SECRET="your-secret-key-min-32-chars"

# Cloudflare R2 Storage
R2_ACCOUNT_ID=xxx
R2_ACCESS_KEY_ID=xxx
R2_SECRET_ACCESS_KEY=xxx
R2_BUCKET_NAME=instap
R2_PUBLIC_URL=https://...

# AI APIs
GEMINI_API_KEY=xxx
VEO_API_KEY=xxx
REPLICATE_API_KEY=xxx
RUNWAY_API_KEY=xxx
RUNWAY_API_SECRET=xxx
SUNO_API_KEY=xxx

# Instagram/Meta
INSTAGRAM_APP_ID=xxx
INSTAGRAM_APP_SECRET=xxx
INSTAGRAM_REDIRECT_URI=https://your-domain/api/auth/instagram/callback
GRAPH_API_VERSION=v24.0
```

---

## Authentication

### Features
- Secure password hashing (bcrypt)
- JWT sessions (7-day expiry)
- HTTP-only cookies
- Middleware route protection

### User Flow
1. Sign up → 1000 free credits
2. Login → JWT token in cookie
3. Protected routes auto-redirect
4. Logout clears session

### API Endpoints
- `POST /api/auth/signup` - Create account
- `POST /api/auth/login` - Sign in
- `POST /api/auth/logout` - Sign out
- `GET /api/auth/me` - Current user

---

## AI Features

### AI Photos
**Models:** Replicate FLUX
- **Text-to-Image:** FLUX Schnell (2-5 seconds)
- **Image-to-Image:** FLUX Dev (10-20 seconds)

**Features:**
- 8 artistic styles
- Multiple aspect ratios (1:1, 4:5, 9:16, 16:9)
- AI prompt enhancement
- Quality levels (720p, 1080p, 4K)

### AI Video
**Models:** Runway, Replicate
- Gen4 Turbo (Image to Video) - 5 credits/sec
- Veo 3.1 Fast (Text/Image to Video) - 15 credits/sec
- Upscale V1 (Video enhancement) - 2 credits/sec

**Durations:** 5s, 8s, 10s, 15s

### AI Music
**API:** Suno
**Models:**
| Model | Credits | Duration |
|-------|---------|----------|
| V3.5 | 10 | ~2 min |
| V4 | 15 | ~4 min |
| V4.5 | 20 | ~8 min |
| V5 | 30 | ~8 min |

**Modes:**
- Simple: Just describe what you want
- Custom: Full control (style, title, lyrics)

### Audio-Video Merge
**Requires:** FFmpeg installed

**Install FFmpeg (Windows):**
```bash
choco install ffmpeg
# or
winget install --id=Gyan.FFmpeg -e
```

---

## Instagram API Integration

### Setup Requirements
1. Meta Developer App
2. Instagram Business/Creator account
3. Facebook Page connected to Instagram
4. HTTPS redirect URI (use ngrok for local dev)

### Permissions Needed
- `instagram_basic`
- `instagram_content_publish`
- `pages_show_list`
- `pages_read_engagement`

### API Endpoints
- `GET /api/auth/instagram` - Start OAuth
- `GET /api/auth/instagram/callback` - OAuth callback
- `GET /api/instagram/status` - Connection status
- `GET /api/instagram/profile` - Profile & media
- `POST /api/instagram/post` - Post content

### Media Requirements
**Images:** JPEG, 320px-1440px, ratio 4:5 to 1.91:1
**Videos:** MP4, max 1GB, 3-90 seconds

---

## Database Schema

### Tables
- `users` - User accounts
- `sessions` - Active sessions
- `credits` - User credits (1000 initial)
- `credit_transactions` - Usage history
- `drafts` - Video/post drafts
- `saved_songs` - Music library
- `stories` - Instagram stories
- `notifications` - User notifications

### Initialize Database
```bash
node scripts/init-neon-db.js
```

---

## API Endpoints

### Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/signup` | Create account |
| POST | `/api/auth/login` | Login |
| POST | `/api/auth/logout` | Logout |
| GET | `/api/auth/me` | Current user |

### AI Generation
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/gemini/generate-image` | Generate image |
| POST | `/api/runway/generate-video` | Generate video |
| POST | `/api/suno/generate` | Generate music |
| GET | `/api/suno/status` | Music status |

### Content Management
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/drafts/list` | List drafts |
| POST | `/api/drafts/save` | Save draft |
| DELETE | `/api/drafts/delete` | Delete draft |
| GET | `/api/songs/list` | List songs |
| POST | `/api/songs/save` | Save song |

### Notifications
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/notifications` | Get notifications |
| POST | `/api/notifications/send` | Send notification |
| POST | `/api/notifications/read` | Mark as read |

---

## Troubleshooting

### Common Issues

**Port already in use:**
- App uses port 3003 automatically
- Access: http://localhost:3003

**Database connection failed:**
- Check `DATABASE_URL` in `.env`
- Restart server after env changes

**AI generation errors:**
- Verify API keys in `.env`
- Check API quotas/credits

**Image upload fails:**
- Max size: 5MB
- Formats: PNG, JPG, WEBP

**FFmpeg not found:**
- Install FFmpeg and add to PATH
- Set `FFMPEG_PATH` in `.env` if needed

### Clear Cache
```bash
rd /s /q .next
npm run dev
```

---

## Scripts

```bash
npm run dev      # Development server
npm run build    # Production build
npm run start    # Production server
npm run lint     # Run ESLint
```

### Database Scripts
```bash
node scripts/init-neon-db.js       # Initialize all tables
node scripts/setup-all-tables.js   # Setup tables
node scripts/reset-credits.js      # Reset user credits
```

---

## Deployment

### Vercel (Recommended)
1. Push to GitHub
2. Import in Vercel
3. Add environment variables
4. Deploy

### Environment Variables for Production
- Change `JWT_SECRET` to a secure value
- Update `INSTAGRAM_REDIRECT_URI` to production URL

---

## Support

For issues, check the troubleshooting section or review the error logs in the browser console.

**Built with ❤️ using Next.js, TypeScript, TailwindCSS, and AI**
