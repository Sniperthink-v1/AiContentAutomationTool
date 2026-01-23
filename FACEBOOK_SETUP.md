# 🔧 Facebook App Configuration Guide

## Step-by-Step: Where to Set URLs in Facebook

### 1. Go to Facebook Developer Console

1. Open: https://developers.facebook.com/apps
2. Log in with your Facebook account
3. Select your app (or click "Create App" if you don't have one)

---

## 2. Configure Basic Settings

### Navigate to: **Settings → Basic**

![Settings - Basic](https://i.imgur.com/example.png)

**Set these fields:**

| Field | Value | Example |
|-------|-------|---------|
| **App Domains** | Your ngrok domain (without https://) | `abc123.ngrok-free.app` |
| **Privacy Policy URL** | Optional | `https://abc123.ngrok-free.app/privacy` |
| **Terms of Service URL** | Optional | `https://abc123.ngrok-free.app/terms` |

**Important:** 
- Remove `https://` from App Domains
- Remove trailing slashes `/`
- Just use: `abc123.ngrok-free.app`

---

## 3. Configure Facebook Login Settings

### Navigate to: **Products → Facebook Login → Settings**

If you don't see "Facebook Login" in your products:
1. Click "Add Product" in the left sidebar
2. Find "Facebook Login" 
3. Click "Set Up"

### In Facebook Login Settings, find:

### **Valid OAuth Redirect URIs** ⭐ (MOST IMPORTANT)

This is where you add your callback URL!

```
https://abc123.ngrok-free.app/api/auth/instagram/callback
```

**Click "+ Add Another"** if you need multiple URLs:
```
https://abc123.ngrok-free.app/api/auth/instagram/callback
http://localhost:3000/api/auth/instagram/callback
```

**Important:**
- ✅ Must use HTTPS (except localhost)
- ✅ Must match `.env.local` EXACTLY
- ✅ No trailing slash
- ✅ Include the full path: `/api/auth/instagram/callback`

---

## 4. Configure Other OAuth Settings (Same Page)

### **Client OAuth Login** 
- Set to: `Yes` ✅

### **Web OAuth Login**
- Set to: `Yes` ✅

### **Enforce HTTPS**
- Set to: `Yes` ✅ (for production)
- Set to: `No` if testing with localhost

### **Login from Devices**
- Leave default or `No`

---

## 5. Configure Instagram API (If Using Instagram Basic Display)

### Navigate to: **Products → Instagram Basic Display → Basic Display**

(Skip this if you're using Instagram Graph API through Facebook Business)

**OAuth Redirect URIs:**
```
https://abc123.ngrok-free.app/api/auth/instagram/callback
```

**Deauthorize Callback URL:**
```
https://abc123.ngrok-free.app/api/auth/instagram/deauthorize
```

**Data Deletion Request URL:**
```
https://abc123.ngrok-free.app/api/auth/instagram/delete
```

---

## 6. Save Your App ID and Secret

### Get Your Credentials:

1. Go to: **Settings → Basic**
2. Copy **App ID** → This is your `INSTAGRAM_APP_ID`
3. Click **Show** on **App Secret** → This is your `INSTAGRAM_APP_SECRET`

### Update your `.env.local`:

```env
INSTAGRAM_APP_ID=1234567890123456
INSTAGRAM_APP_SECRET=abc123def456ghi789jkl012mno345pq
```

---

## 7. Set App Mode

### For Testing: **Development Mode**
- Go to top of the page
- Toggle should say "Development"
- Only you and test users can use the app

### For Production: **Live Mode**
- App Review required
- Must submit for permissions
- Available to all users

---

## 📋 Complete Configuration Checklist

**Settings → Basic:**
- [ ] App Domains: `abc123.ngrok-free.app`
- [ ] App ID: Copied to `.env.local`
- [ ] App Secret: Copied to `.env.local`

**Facebook Login → Settings:**
- [ ] Valid OAuth Redirect URIs: `https://abc123.ngrok-free.app/api/auth/instagram/callback`
- [ ] Client OAuth Login: Yes
- [ ] Web OAuth Login: Yes
- [ ] Enforce HTTPS: Yes

**App Mode:**
- [ ] Development mode (for testing)
- [ ] Test users added (if needed)

**.env.local:**
- [ ] INSTAGRAM_APP_ID set
- [ ] INSTAGRAM_APP_SECRET set
- [ ] INSTAGRAM_REDIRECT_URI matches Facebook settings exactly
- [ ] NEXT_PUBLIC_APP_URL set to ngrok URL

---

## 🎯 Quick Reference

### Your URLs Should Look Like:

```env
# In .env.local
INSTAGRAM_REDIRECT_URI=https://abc123.ngrok-free.app/api/auth/instagram/callback
NEXT_PUBLIC_APP_URL=https://abc123.ngrok-free.app

# In Facebook App Settings
App Domains: abc123.ngrok-free.app
OAuth Redirect: https://abc123.ngrok-free.app/api/auth/instagram/callback
```

### Common Mistakes ❌

| Wrong ❌ | Correct ✅ |
|---------|----------|
| `https://abc123.ngrok-free.app` in App Domains | `abc123.ngrok-free.app` |
| `http://abc123.ngrok-free.app/callback` | `https://abc123.ngrok-free.app/api/auth/instagram/callback` |
| `/api/auth/instagram/callback/` (trailing slash) | `/api/auth/instagram/callback` |
| URLs don't match between Facebook and .env.local | Must match EXACTLY |

---

## 🔍 Testing Your Configuration

After setting everything up:

1. Start ngrok: `.\start-ngrok.bat`
2. Start dev server: `.\start-dev.bat`
3. Open: `https://abc123.ngrok-free.app`
4. Click "Connect Instagram" or "Login"
5. Watch for any redirect errors

### Debug with ngrok Inspector:
- Open: http://127.0.0.1:4040
- See all OAuth requests in real-time
- Check callback URL being used

---

## 🆘 Troubleshooting

### "Invalid OAuth Redirect URI"
**Cause:** URLs don't match between Facebook and `.env.local`

**Fix:**
1. Copy exact URL from Facebook settings
2. Paste into `.env.local` as `INSTAGRAM_REDIRECT_URI`
3. Restart Next.js server
4. Make sure it's HTTPS for ngrok

### "App Not Setup Correctly"
**Cause:** Missing permissions or Instagram not connected

**Fix:**
1. Go to **App Review → Permissions and Features**
2. Request: `instagram_basic`, `instagram_content_publish`
3. Link Instagram Business Account to Facebook Page
4. Make sure app is in correct mode (Development/Live)

### "Redirect URI Mismatch"
**Cause:** Using wrong domain or path

**Fix:**
1. Check ngrok is running and URL hasn't changed
2. Verify path is: `/api/auth/instagram/callback`
3. Check for typos in Facebook settings
4. No extra slashes or missing parts

---

## 📸 Visual Guide

### Facebook Developer Console Layout:

```
┌─────────────────────────────────────┐
│ My App                        [Dev] │
├─────────────────────────────────────┤
│ Dashboard                           │
│ Settings                            │
│   ├─ Basic        ← Set App Domains│
│   └─ Advanced                       │
│ Products                            │
│   ├─ Facebook Login                 │
│   │   └─ Settings ← Set Callback   │
│   └─ Instagram Basic Display        │
│ App Review                          │
└─────────────────────────────────────┘
```

---

## 🎉 Ready to Test!

Once everything is configured:

```powershell
# Terminal 1
.\start-ngrok.bat

# Terminal 2  
.\start-dev.bat

# Browser
https://abc123.ngrok-free.app
```

Your Instagram OAuth should now work! 🚀
