# 🚀 Deployment Guide - AI Content Automation Tool

## Overview
This guide will help you deploy the application to **Vercel** (hosting) using your existing **Neon PostgreSQL** database.

---

## Prerequisites
- [x] Neon Database already configured
- [ ] GitHub account with repository pushed
- [ ] Vercel account
- [ ] All API keys ready (see `.env.example`)

---

## Deployment Steps

### **Step 1: Prepare for Deployment**

#### 1.1 Verify Database Tables
Your Neon database should already have all required tables. You can verify by connecting to Neon:
1. Go to [Neon Console](https://console.neon.tech)
2. Select your project
3. Click "SQL Editor"
4. Run: `SELECT table_name FROM information_schema.tables WHERE table_schema = 'public';`

Expected tables:
- `users`
- `credits_history`
- `notifications`
- `songs`
- `stories`
- `drafts`
- `sessions`

#### 1.2 Update Instagram Redirect URI
You'll need to update this after getting your Vercel URL. For now, note it down.

---

### **Step 2: Deploy to Vercel**

#### 2.1 Sign Up / Login to Vercel
1. Go to [vercel.com](https://vercel.com)
2. Click **"Sign Up"** or **"Login"**
3. Choose **"Continue with GitHub"**
4. Authorize Vercel to access your GitHub account

#### 2.2 Import Your Project
1. From Vercel dashboard, click **"Add New..."** → **"Project"**
2. Find **`Sniperthink-v1/AiContentAutomationTool`** in the list
3. Click **"Import"**

#### 2.3 Configure Project Settings
Vercel will auto-detect Next.js. Verify these settings:
- **Framework Preset**: Next.js
- **Root Directory**: `./` (default)
- **Build Command**: `npm run build`
- **Output Directory**: `.next`
- **Install Command**: `npm install`
- **Node.js Version**: 18.x or higher

Leave these as default and click **"Deploy"** (don't worry, we'll add environment variables next)

---

### **Step 3: Configure Environment Variables**

#### 3.1 Add Environment Variables
1. While the first deployment is running (or after it fails), go to your project
2. Click **"Settings"** → **"Environment Variables"**
3. Add ALL variables from your `.env` file:

**Critical Variables:**
```bash
# Database (from Neon)
DATABASE_URL=your_neon_database_url_here

# Authentication
JWT_SECRET=your-super-secret-jwt-key-min-32-chars

# Cloudflare R2 Storage
R2_ACCOUNT_ID=your_r2_account_id
R2_ACCESS_KEY_ID=your_r2_access_key_id
R2_SECRET_ACCESS_KEY=your_r2_secret_access_key
R2_BUCKET_NAME=your_bucket_name
R2_PUBLIC_URL=https://your-r2-public-url.r2.dev

# AI APIs
GEMINI_API_KEY=your_gemini_api_key
VEO_API_KEY=your_veo_api_key

REPLICATE_API_KEY=your_replicate_api_key

RUNWAY_API_KEY=your_runway_api_key
RUNWAY_API_SECRET=your_runway_api_secret

SUNO_API_KEY=your_suno_api_key

# Instagram
INSTAGRAM_APP_ID=your_instagram_app_id
INSTAGRAM_APP_SECRET=your_instagram_app_secret
GRAPH_API_VERSION=v24.0
```

**Note:** Copy these values from your local `.env` file when setting up Vercel.

**Important:** For `INSTAGRAM_REDIRECT_URI`, use your Vercel URL:
```bash
INSTAGRAM_REDIRECT_URI=https://your-app-name.vercel.app/api/auth/instagram/callback
```

#### 3.2 Save Environment Variables
- Set environment: **Production**, **Preview**, and **Development** (select all three)
- Click **"Save"**

---

### **Step 4: Redeploy with Environment Variables**

1. Go to **"Deployments"** tab
2. Click on the latest deployment
3. Click **"..."** (three dots) → **"Redeploy"**
4. Check **"Use existing Build Cache"**
5. Click **"Redeploy"**

Wait 2-3 minutes for the build to complete.

---

### **Step 5: Get Your Vercel URL**

Once deployed successfully:
1. You'll see your app URL: `https://your-app-name.vercel.app`
2. Click **"Visit"** to open your application
3. Copy this URL - you'll need it for the next steps

---

### **Step 6: Update Instagram App Settings**

#### 6.1 Update Facebook Developers Console
1. Go to [developers.facebook.com](https://developers.facebook.com)
2. Select your app (ID: 865080999545998)
3. Go to **Instagram Basic Display** → **Basic Display**
4. Update **Valid OAuth Redirect URIs**:
   ```
   https://your-app-name.vercel.app/api/auth/instagram/callback
   ```
5. Update **Deauthorize Callback URL**:
   ```
   https://your-app-name.vercel.app/api/auth/instagram/deauthorize
   ```
6. Click **"Save Changes"**

#### 6.2 Update Vercel Environment Variable
1. Go back to Vercel → **Settings** → **Environment Variables**
2. Find `INSTAGRAM_REDIRECT_URI`
3. Click **"Edit"** and update with your actual Vercel URL
4. Click **"Save"**
5. Redeploy again

---

### **Step 7: Configure Cloudflare R2 CORS**

1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com)
2. Navigate to **R2** → Your bucket (`instap`)
3. Click **"Settings"** → **"CORS Policy"**
4. Add this configuration:

```json
[
  {
    "AllowedOrigins": [
      "https://your-app-name.vercel.app",
      "http://localhost:3000"
    ],
    "AllowedMethods": [
      "GET",
      "PUT",
      "POST",
      "DELETE"
    ],
    "AllowedHeaders": [
      "*"
    ],
    "ExposeHeaders": [
      "ETag"
    ],
    "MaxAgeSeconds": 3600
  }
]
```

5. Replace `your-app-name.vercel.app` with your actual Vercel URL
6. Click **"Save"**

---

### **Step 8: Test Your Deployment**

#### 8.1 Basic Tests
1. Visit your Vercel URL
2. Check if the homepage loads
3. Try the signup page: `/signup`
4. Try the login page: `/login`

#### 8.2 Database Connection Test
1. Try signing up with a test account
2. Check Neon dashboard for new user entry
3. Verify credits were initialized

#### 8.3 Instagram OAuth Test
1. Click "Connect Instagram"
2. Should redirect to Instagram authorization
3. After authorization, should redirect back to your app

#### 8.4 File Upload Test
1. Try uploading an image
2. Check R2 bucket for the uploaded file
3. Verify file URL is accessible

---

### **Step 9: Monitor Your Application**

#### 9.1 Vercel Monitoring
- **Analytics**: Track page views and performance
- **Logs**: Real-time function logs
- **Speed Insights**: Core Web Vitals
- **Error Tracking**: Runtime errors

Access: Vercel Dashboard → Your Project → Each tab

#### 9.2 Neon Monitoring
- **Monitoring**: Database queries and connections
- **Operations**: Track active connections
- **Metrics**: CPU, memory, storage usage

Access: Neon Console → Your Project → Monitoring

---

## Post-Deployment Checklist

- [ ] Application loads successfully
- [ ] Database connection works
- [ ] User signup/login functional
- [ ] Instagram OAuth working
- [ ] File uploads to R2 working
- [ ] AI features operational (Gemini, Runway, etc.)
- [ ] Custom domain configured (optional)
- [ ] SSL certificate active (automatic with Vercel)

---

## Custom Domain (Optional)

### Add Your Own Domain
1. In Vercel, go to **Settings** → **Domains**
2. Add your domain (e.g., `app.sniperthink.com`)
3. Follow Vercel's DNS configuration instructions
4. Update `INSTAGRAM_REDIRECT_URI` with new domain
5. Update Instagram app settings with new domain

---

## Troubleshooting

### Build Fails
- Check Vercel build logs
- Verify all environment variables are set
- Ensure TypeScript has no errors locally

### Database Connection Errors
- Verify DATABASE_URL is correct
- Check Neon database is active
- Ensure connection string includes `sslmode=require`

### Instagram OAuth Fails
- Verify redirect URI matches exactly
- Check Instagram app is in Live mode
- Ensure app has required permissions

### File Upload Fails
- Check R2 credentials
- Verify CORS configuration
- Test R2 bucket accessibility

### AI Features Not Working
- Verify all API keys are valid
- Check API rate limits
- Review function logs in Vercel

---

## Useful Commands

### View Logs
```bash
# Install Vercel CLI
npm i -g vercel

# Login
vercel login

# View logs
vercel logs
```

### Redeploy
```bash
vercel --prod
```

### Environment Variables
```bash
# List env vars
vercel env ls

# Add env var
vercel env add
```

---

## Support & Resources

- **Vercel Docs**: https://vercel.com/docs
- **Neon Docs**: https://neon.tech/docs
- **Next.js Docs**: https://nextjs.org/docs
- **Instagram API**: https://developers.facebook.com/docs/instagram-basic-display-api

---

## Security Notes

⚠️ **Important:**
1. Never commit `.env` file to Git
2. Rotate API keys regularly
3. Use strong JWT_SECRET in production
4. Monitor API usage and costs
5. Set up rate limiting for public APIs
6. Enable Vercel authentication for preview deployments

---

## Scaling Considerations

As your app grows:
1. **Neon**: Upgrade to Neon Pro for higher limits
2. **Vercel**: Consider Pro plan for better performance
3. **R2**: Monitor storage and bandwidth usage
4. **API Quotas**: Track AI API usage and costs
5. **Database Optimization**: Add indexes, optimize queries

---

**Deployment Status**: ✅ Ready to Deploy

**Estimated Time**: 15-20 minutes

**Difficulty**: Intermediate

Good luck with your deployment! 🚀
