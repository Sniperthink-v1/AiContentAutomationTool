# 🔐 Security Checklist for Instagram App

## ✅ Completed Security Measures

### 1. Environment Variables Protection
- ✅ `.env.local` created (NOT committed to git)
- ✅ `.gitignore` configured to exclude all environment files
- ✅ `.env.example` provided as template (safe to commit)

### 2. ngrok Configuration
- ✅ ngrok auth token configured
- ✅ ngrok.yml excluded from git

### 3. Files NEVER to Commit
The following files contain sensitive data and are protected:
- `.env`, `.env.*`, `.env.local` - Contains API keys and secrets
- `ngrok.yml` - Contains ngrok auth token
- `document/` - Personal documents

## 🔑 Required Environment Variables

Edit your `.env.local` file with these values:

### Critical Security Keys (Required)
```env
# Generate a strong random string (32+ characters)
JWT_SECRET=CHANGE_THIS_TO_RANDOM_32_CHAR_STRING

# Your database connection string
DATABASE_URL=your_database_connection_string_here
```

### Instagram/Facebook API (Required for OAuth)
```env
INSTAGRAM_APP_ID=your_facebook_app_id
INSTAGRAM_APP_SECRET=your_facebook_app_secret
INSTAGRAM_REDIRECT_URI=https://YOUR-NGROK-URL.ngrok-free.app/api/auth/instagram/callback
NEXT_PUBLIC_APP_URL=https://YOUR-NGROK-URL.ngrok-free.app
```

### Storage (Optional - if using Cloudflare R2)
```env
R2_ACCOUNT_ID=your_r2_account_id
R2_ACCESS_KEY_ID=your_r2_access_key
R2_SECRET_ACCESS_KEY=your_r2_secret_key
R2_BUCKET_NAME=your_bucket_name
R2_PUBLIC_URL=your_r2_public_url
```

### AI Services (Optional - if using AI features)
```env
GEMINI_API_KEY=your_gemini_key
REPLICATE_API_TOKEN=your_replicate_token
RUNWAY_API_SECRET=your_runway_secret
SUNO_API_KEY=your_suno_key
```

## 🛡️ Security Best Practices

### DO:
- ✅ Keep `.env.local` file locally only
- ✅ Use strong, random JWT_SECRET (at least 32 characters)
- ✅ Rotate API keys regularly
- ✅ Use different credentials for development/production
- ✅ Store production secrets in secure environment (Vercel, Railway, etc.)
- ✅ Review `.gitignore` before committing

### DON'T:
- ❌ Never commit `.env.local` or any `.env.*` files
- ❌ Never share API keys in screenshots or chat
- ❌ Never hardcode secrets in source code
- ❌ Never use production keys in development
- ❌ Never commit ngrok.yml

## 🚨 If You Accidentally Commit Secrets

1. **Immediately rotate/regenerate ALL exposed credentials:**
   - Facebook App Secret
   - JWT Secret
   - Database credentials
   - All API keys

2. **Remove from Git history:**
```powershell
# WARNING: This rewrites history
git filter-branch --force --index-filter `
  "git rm --cached --ignore-unmatch .env.local" `
  --prune-empty --tag-name-filter cat -- --all

# Force push (use with caution)
git push origin --force --all
```

3. **Better approach - Use BFG Repo-Cleaner:**
```powershell
# Download BFG from https://rtyley.github.io/bfg-repo-cleaner/
java -jar bfg.jar --delete-files .env.local
git reflog expire --expire=now --all
git gc --prune=now --aggressive
```

## 📋 Pre-Deployment Checklist

Before deploying to production:
- [ ] All secrets in `.env.local` are filled with real values
- [ ] JWT_SECRET is a strong random string
- [ ] Instagram/Facebook OAuth URLs are updated with production domain
- [ ] Database backups are configured
- [ ] Production environment variables are set in hosting platform
- [ ] `.gitignore` is working (check with `git status`)
- [ ] No sensitive data in committed files

## 🔍 Verify Security

Run this command to check for accidentally committed secrets:
```powershell
git log --all --full-history -- .env.local
git log --all --full-history -- .env
```

If these commands show any results, secrets were committed! Follow the emergency steps above.

## 📞 Emergency Contacts

If secrets are exposed:
- **Facebook App:** Regenerate App Secret at https://developers.facebook.com/apps
- **Database:** Rotate credentials immediately
- **Vercel/Hosting:** Update environment variables in dashboard

---

**Last Updated:** $(Get-Date -Format "yyyy-MM-dd")
**Status:** 🟢 Secure Configuration Active
