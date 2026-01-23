# ngrok Setup Guide for Instagram/Facebook Testing

This guide will help you set up ngrok to test your Instagram and Facebook connectivity with OAuth callbacks.

## Step 1: Install ngrok

### Option A: Using Chocolatey (Recommended for Windows)
```powershell
choco install ngrok
```

### Option B: Using winget
```powershell
winget install ngrok
```

### Option C: Manual Installation
1. Download ngrok from https://ngrok.com/download
2. Extract the ZIP file to a folder (e.g., `C:\ngrok`)
3. Add the folder to your system PATH
4. Or move `ngrok.exe` to a folder already in your PATH

## Step 2: Sign up and Get Auth Token

1. Go to https://ngrok.com/signup
2. Sign up for a free account
3. Go to your dashboard: https://dashboard.ngrok.com/get-started/your-authtoken
4. Copy your authtoken
5. Run in terminal:
```powershell
ngrok config add-authtoken YOUR_AUTH_TOKEN
```

## Step 3: Configure Environment Variables

1. Copy `.env.example` to `.env.local`:
```powershell
Copy-Item .env.example .env.local
```

2. Update the following variables in `.env.local`:
- `INSTAGRAM_APP_ID` - Your Facebook App ID
- `INSTAGRAM_APP_SECRET` - Your Facebook App Secret
- `DATABASE_URL` - Your database connection string
- `JWT_SECRET` - A secure random string (at least 32 characters)

**Note:** We'll update `INSTAGRAM_REDIRECT_URI` and `NEXT_PUBLIC_APP_URL` after starting ngrok.

## Step 4: Start ngrok Tunnel

Open a **NEW** terminal window and run:

```powershell
ngrok http 3000
```

This will:
- Create a public HTTPS URL (e.g., `https://abc123.ngrok-free.app`)
- Forward all traffic to your local Next.js app on port 3000
- Display the forwarding URL in the terminal

**Keep this terminal window open!**

## Step 5: Update Environment Variables with ngrok URL

1. Copy the ngrok URL from the terminal (e.g., `https://abc123.ngrok-free.app`)
2. Update your `.env.local` file:

```env
INSTAGRAM_REDIRECT_URI=https://abc123.ngrok-free.app/api/auth/instagram/callback
NEXT_PUBLIC_APP_URL=https://abc123.ngrok-free.app
```

3. **Important:** Replace `abc123` with your actual ngrok subdomain

## Step 6: Configure Facebook App Settings

1. Go to https://developers.facebook.com/apps
2. Select your app
3. Go to **Settings** > **Basic**
4. Update:
   - **App Domains:** Add `abc123.ngrok-free.app` (without https://)
   
5. Go to **Facebook Login** > **Settings**
6. Update **Valid OAuth Redirect URIs:**
   - Add: `https://abc123.ngrok-free.app/api/auth/instagram/callback`
   
7. Save changes

## Step 7: Start Your Next.js App

In your original terminal (not the ngrok terminal), run:

```powershell
npm run dev
```

## Step 8: Test the Integration

1. Open your ngrok URL in a browser: `https://abc123.ngrok-free.app`
2. Navigate to login or settings page
3. Click "Connect Instagram" button
4. Complete the OAuth flow

## Troubleshooting

### Issue: "Invalid OAuth Redirect URI"
- Make sure the redirect URI in Facebook App Settings exactly matches your `.env.local`
- Check for trailing slashes (should NOT have one)
- Ensure you're using the HTTPS ngrok URL

### Issue: "Application Not Set Up Correctly"
- Verify your Facebook App is in Development or Live mode
- Check that your Instagram Business account is connected to your Facebook Page
- Make sure all required permissions are requested in the OAuth URL

### Issue: ngrok "Too Many Connections"
- Free ngrok accounts have connection limits
- Consider upgrading to a paid plan for production testing
- Or restart ngrok to get a new URL (you'll need to update Facebook App Settings again)

### Issue: "Tunnel not found"
- Make sure ngrok is running in a separate terminal window
- Check that ngrok is forwarding to the correct port (3000)

## Tips

1. **Static Domain (Paid Feature):** Consider ngrok's paid plans for a static domain so you don't have to update Facebook App Settings every time you restart ngrok

2. **Use ngrok Web Interface:** Open http://127.0.0.1:4040 to see all HTTP requests in real-time

3. **Environment Variables:** Always restart your Next.js dev server after changing `.env.local` files

4. **Keep Multiple Terminals Open:**
   - Terminal 1: ngrok tunnel
   - Terminal 2: Next.js dev server

## Quick Start Commands

```powershell
# Terminal 1 - Start ngrok
ngrok http 3000

# Terminal 2 - Start Next.js (after updating .env.local with ngrok URL)
npm run dev
```

## Security Notes

- Never commit `.env.local` to git (it's already in `.gitignore`)
- Use a strong, random `JWT_SECRET`
- ngrok free tier URLs expire when you stop the tunnel
- Anyone with your ngrok URL can access your local app
