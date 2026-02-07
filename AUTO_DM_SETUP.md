# Auto-DM Setup Guide 🤖💬

This feature automatically sends Direct Messages to users who comment with specific keywords on your Instagram posts.

## 📋 Prerequisites

1. **Instagram Business Account** - Required for API access
2. **Meta Developer App** - Your app needs additional permissions
3. **Webhook Configuration** - To receive real-time comment notifications
4. **HTTPS Endpoint** - Instagram only sends webhooks to HTTPS URLs

---

## 🚀 Step-by-Step Setup

### 1. Enable Instagram Messaging Permissions

Go to your Meta Developer App dashboard:

1. Navigate to **App Dashboard** → **Use Cases** → **Customize**
2. Add the **instagram_manage_messages** permission:
   - Click "Add Permissions"
   - Search for `instagram_manage_messages`
   - Select it and save

### 2. Configure Instagram Webhooks

In your Meta App dashboard:

1. Go to **Products** → **Webhooks**
2. Select **Instagram** from the dropdown
3. Click **Configure** or **Edit Subscription**
4. Subscribe to the **comments** field:
   - Check the box for `comments`
   - Click **Save**

### 3. Set Up Webhook Endpoint

Your webhook URL should be:
```
https://yourdomain.com/api/instagram/webhook
```

**For local development with ngrok:**
```bash
ngrok http 3000
```

Then use the ngrok URL:
```
https://your-ngrok-url.ngrok.io/api/instagram/webhook
```

#### Configure the webhook:

1. Click **Add Callback URL**
2. Enter your webhook URL: `https://yourdomain.com/api/instagram/webhook`
3. Enter a **Verify Token** (create a random secure string)
4. Click **Verify and Save**

### 4. Add Environment Variables

Update your `.env` file:

```env
# Instagram Webhook Configuration
INSTAGRAM_WEBHOOK_VERIFY_TOKEN=your_custom_secure_token_here_12345

# Your existing Instagram credentials
INSTAGRAM_APP_ID=your_app_id
INSTAGRAM_APP_SECRET=your_app_secret
INSTAGRAM_REDIRECT_URI=https://yourdomain.com/api/auth/instagram/callback
```

**Important:** The `INSTAGRAM_WEBHOOK_VERIFY_TOKEN` must match what you entered in Meta Developer Console.

### 5. Initialize Database Tables

Run the setup script to create required tables:

```bash
node scripts/init-auto-dm-db.js
```

This creates:
- `auto_dm_rules` - Stores your keyword-to-message mappings
- `auto_dm_logs` - Tracks all auto-DMs sent

### 6. Reconnect Instagram Account

**Important:** After adding messaging permissions, you need to reconnect your Instagram account to get the updated access token with DM permissions.

1. Go to **Settings** → **Instagram Connection**
2. Click **Disconnect** (if already connected)
3. Click **Connect Instagram**
4. **Authorize ALL permissions** when prompted (including messaging)
5. Complete the OAuth flow

---

## 🎯 How to Use

### Create Auto-DM Rules

1. Go to **Dashboard** → **Auto-DM**
2. Click **Add Rule**
3. Enter:
   - **Trigger Keyword**: Word that triggers the DM (e.g., "link", "price", "info")
   - **DM Message**: The automatic reply message
4. Click **Create Rule**

### Example Rules

**Example 1: Share Website Link**
```
Keyword: link
Message: Hi! 👋 Thanks for your interest! Check out our website: https://example.com
```

**Example 2: Price Information**
```
Keyword: price
Message: Thanks for asking! 💰 Our prices start at $49. DM us for a custom quote!
```

**Example 3: Course Info**
```
Keyword: course
Message: 📚 Great question! Our course includes 50+ videos and lifetime access. Details: https://example.com/course
```

### How It Works

1. Someone comments on your Instagram post with a trigger keyword (e.g., "link")
2. Instagram sends a webhook notification to your server
3. Your server detects the keyword match
4. Automatically sends the configured DM to the commenter
5. Logs the activity in the database

---

## 🔍 Testing Your Setup

### 1. Test Webhook Endpoint

```bash
# Test webhook verification (GET request)
curl "https://yourdomain.com/api/instagram/webhook?hub.mode=subscribe&hub.verify_token=your_token&hub.challenge=test123"

# Should return: test123
```

### 2. Test Comment Detection

1. Create a test rule with keyword "test"
2. Post something on your Instagram
3. Comment "test" on your own post
4. Check the **View Logs** to see if DM was sent

### 3. Check Logs

In the Auto-DM page:
- Click **View Logs** to see all auto-DMs sent
- Verify the keyword detection is working
- Check message delivery timestamps

---

## 🛠️ Troubleshooting

### Webhook Not Receiving Events

**Problem:** Comments aren't triggering auto-DMs

**Solutions:**
1. Verify webhook is subscribed to `comments` field
2. Check webhook URL is HTTPS (not HTTP)
3. Ensure verify token matches `.env` file
4. Check Meta App is in **Live Mode** (not Development Mode)
5. Verify webhook status is "Active" (green) in Meta dashboard

### Permission Errors

**Problem:** "Permission denied" when sending DMs

**Solutions:**
1. Verify `instagram_manage_messages` permission is approved
2. Reconnect Instagram account after adding permissions
3. Check access token has messaging scope
4. Submit app for review if permission is in "Development Mode"

### DMs Not Sending

**Problem:** Keyword detected but DM fails to send

**Solutions:**
1. Check access token is still valid (not expired)
2. Verify Instagram account is Business/Creator (not Personal)
3. Check rate limits (Instagram has DM sending limits)
4. Look at server logs for API error messages

### Database Errors

**Problem:** "Table doesn't exist" errors

**Solutions:**
```bash
# Re-run the database initialization
node scripts/init-auto-dm-db.js

# Or manually create tables
psql $DATABASE_URL -f scripts/init-auto-dm-tables.sql
```

---

## 📊 API Endpoints

### Manage Rules

```bash
# Get all rules
GET /api/auto-dm/rules

# Create new rule
POST /api/auto-dm/rules
Body: { "keyword": "link", "dmMessage": "Check https://..." }

# Update rule
PUT /api/auto-dm/rules
Body: { "ruleId": 1, "isActive": false }

# Delete rule
DELETE /api/auto-dm/rules?ruleId=1
```

### View Logs

```bash
# Get auto-DM history
GET /api/auto-dm/logs?limit=50&offset=0
```

### Webhook Endpoint

```bash
# Receives Instagram comment webhooks
POST /api/instagram/webhook
```

---

## ⚠️ Important Notes

### Rate Limits
- Instagram has rate limits on DM sending
- Don't spam users with multiple messages
- Consider adding cooldown period per user

### Privacy & Compliance
- Users must opt-in to receive DMs
- Include unsubscribe options
- Follow Instagram's Community Guidelines
- Don't send promotional content without consent

### Best Practices
- Keep messages helpful and relevant
- Use clear, friendly language
- Include your business name
- Provide value (links, info, support)
- Monitor logs regularly

### App Review
- For production use, submit your app for review
- Provide clear use case explanation
- Demonstrate privacy compliance
- May take 3-5 business days

---

## 🔐 Security Considerations

1. **Verify Webhook Signatures** - Already implemented in the code
2. **Store Access Tokens Securely** - Already using database encryption
3. **Validate Input** - Prevent SQL injection
4. **Rate Limiting** - Consider adding rate limits
5. **Audit Logs** - Keep track of all auto-DMs sent

---

## 📚 Additional Resources

- [Instagram Graph API - Messaging](https://developers.facebook.com/docs/messenger-platform/instagram)
- [Instagram Webhooks](https://developers.facebook.com/docs/graph-api/webhooks/getting-started)
- [Meta App Review Process](https://developers.facebook.com/docs/app-review)
- [Instagram Platform Policies](https://developers.facebook.com/docs/instagram-platform/instagram-api-with-instagram-login/overview)

---

## 💡 Need Help?

If you encounter issues:
1. Check the browser console for errors
2. Look at server logs (`console.log` output)
3. Verify all environment variables are set
4. Test webhook with Meta's webhook testing tool
5. Check Instagram API status page

---

## 🎉 You're All Set!

Once configured, the Auto-DM feature will:
- ✅ Monitor comments in real-time
- ✅ Detect trigger keywords automatically
- ✅ Send instant DMs to interested users
- ✅ Log all activities for tracking
- ✅ Help you engage with your audience 24/7

Happy automating! 🚀
