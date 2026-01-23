# 🚀 Quick Start Guide - Instagram App with ngrok

## ✅ Prerequisites Completed
- [x] ngrok auth token configured
- [x] .env.local file created
- [x] Security measures in place
- [x] Strong JWT secret generated

## 📝 Step-by-Step Setup

### Step 1: Configure Environment Variables

Open `.env.local` and update these values:

```env
# ⚠️ REQUIRED - Get from Facebook Developers Console
INSTAGRAM_APP_ID=your_facebook_app_id_here
INSTAGRAM_APP_SECRET=your_facebook_app_secret_here

# ⚠️ REQUIRED - Your database connection
DATABASE_URL=postgresql://user:pass@host:5432/dbname

# ✅ SECURE - Already generated for you
JWT_SECRET=nb7HPwzh/qcvR2fTMsr/0c//TR232r1+LC6VuvJC64k=

# Graph API
GRAPH_API_VERSION=v24.0

# 🔄 UPDATE AFTER STARTING NGROK (Step 2)
INSTAGRAM_REDIRECT_URI=https://REPLACE-WITH-NGROK-URL.ngrok-free.app/api/auth/instagram/callback
NEXT_PUBLIC_APP_URL=https://REPLACE-WITH-NGROK-URL.ngrok-free.app
```

### Step 2: Start ngrok Tunnel

Open **Terminal 1** (keep it open):

```powershell
.\start-ngrok.bat
```

**COPY the ngrok URL** shown (e.g., `https://abc123.ngrok-free.app`)

### Step 3: Update .env.local with ngrok URL

Replace the placeholder URLs in `.env.local`:

```env
INSTAGRAM_REDIRECT_URI=https://abc123.ngrok-free.app/api/auth/instagram/callback
NEXT_PUBLIC_APP_URL=https://abc123.ngrok-free.app
```

**Important:** Replace `abc123` with your actual ngrok subdomain!

### Step 4: Configure Facebook App

1. Go to https://developers.facebook.com/apps
2. Select your app (or create a new one)
3. Go to **Settings → Basic**
4. Add App Domains: `abc123.ngrok-free.app`
5. Go to **Facebook Login → Settings**  
6. Add to **Valid OAuth Redirect URIs**:
   ```
   https://abc123.ngrok-free.app/api/auth/instagram/callback
   ```
7. Save changes

### Step 5: Start Next.js Server

Open **Terminal 2** (new terminal):

```powershell
.\start-dev.bat
```

### Step 6: Test OAuth Flow

1. Open your ngrok URL: `https://abc123.ngrok-free.app`
2. Click "Login" or go to Settings
3. Click "Connect Instagram"
4. Complete the OAuth authorization
5. You should be redirected back to your app!

## 🎯 Quick Commands

```powershell
# Terminal 1 - ngrok
.\start-ngrok.bat

# Terminal 2 - Next.js
.\start-dev.bat

# Check ngrok web interface
start http://127.0.0.1:4040
```

## 🔍 Troubleshooting

### "Invalid OAuth Redirect URI"
- ✅ Check `.env.local` INSTAGRAM_REDIRECT_URI matches Facebook App Settings exactly
- ✅ Ensure no trailing slashes
- ✅ Use HTTPS ngrok URL (not http)

### "App Not Setup Correctly"  
- ✅ Verify Instagram Business account linked to Facebook Page
- ✅ Check Facebook App is in correct mode (Development/Live)
- ✅ Confirm all required permissions in OAuth scopes

### "Connection Failed"
- ✅ Ensure ngrok is running (Terminal 1)
- ✅ Ensure Next.js is running (Terminal 2)
- ✅ Check ngrok URL is still active
- ✅ Verify DATABASE_URL is correct

### ngrok URL Changed
- ✅ Update `.env.local` with new URL
- ✅ Update Facebook App Settings with new callback URL  
- ✅ Restart Next.js server (`Ctrl+C` then `.\start-dev.bat`)

## 📊 Monitor Requests

ngrok provides a web interface to inspect all HTTP/HTTPS traffic:

```powershell
start http://127.0.0.1:4040
```

Use this to debug OAuth callbacks and API requests!

## 🔐 Security Reminders

- ✅ `.env.local` is gitignored (safe)
- ✅ Never commit API keys or secrets
- ✅ JWT secret is cryptographically secure
- ✅ ngrok config is excluded from git

## 📚 Additional Resources

- **ngrok Setup:** See [NGROK_SETUP.md](NGROK_SETUP.md)
- **Security Guide:** See [SECURITY.md](SECURITY.md)
- **Facebook Developers:** https://developers.facebook.com/docs/instagram-api

## ✨ You're All Set!

Your Instagram app is now ready to test with OAuth!

Keep both terminals open:
- Terminal 1: ngrok tunnel
- Terminal 2: Next.js dev server

Happy coding! 🎉
