# Render Deployment Guide - OTP Email Fix

## 🔴 Root Cause

Your OTP emails work locally but fail on Render because:

1. **Gmail SMTP is blocked on cloud servers** - Google blocks "less secure app" access from cloud IPs (AWS, Render, etc.)
2. **Environment variables not set on Render** - You need to manually configure them in Render dashboard
3. **Resend requires domain verification** - Without it, emails can only be sent to your own domain
4. **Silent failures** - Background email sending hides errors

## ✅ Solution: Use Resend (Recommended)

Resend is the best option for production - free tier includes 3,000 emails/month.

### Step 1: Sign up for Resend

1. Go to https://resend.com and create an account
2. Verify your account

### Step 2: Add and verify your domain

1. In Resend dashboard, go to "Domains" → "Add Domain"
2. Enter your domain (e.g., `tpexhealthcare.com` or your custom domain)
3. Add the DNS records shown in Resend to your domain provider
4. Wait for verification (usually instant to a few minutes)

### Step 3: Get API Key

1. In Resend dashboard, go to "API Keys"
2. Click "Create API Key"
3. Name it "Production" or "Render"
4. Copy the key (starts with `re_`)

### Step 4: Configure Environment Variables on Render

1. Go to your Render dashboard → Select your service
2. Click "Environment" tab
3. Add these variables:

```
RESEND_API_KEY=re_YOUR_API_KEY_HERE
EMAIL_FROM=otp@yourdomain.com
NODE_ENV=production
```

**Remove these (not needed with Resend):**
```
EMAIL_SERVICE=gmail
EMAIL_USER=...
EMAIL_PASS=...
```

### Step 5: Update your Flutter app API URL

In your Flutter app, update the base URL to your Render deployed URL:

```dart
// lib/core/constants/api_endpoints.dart or wherever you set base URL
static const String baseUrl = 'https://your-service.onrender.com';
```

## 🔧 Alternative Solutions

### Option A: SendGrid (if Resend doesn't work)

1. Sign up at https://sendgrid.com
2. Verify sender identity
3. Create API key
4. Update code to use SendGrid SDK instead of Resend

### Option B: AWS SES (most reliable, but complex setup)

Best for high volume, requires AWS account and domain verification.

### Option C: Brevo (formerly Sendinblue)

Free tier: 300 emails/day. Good alternative.

## 🔍 Debugging Checklist

If emails still don't work after setup:

1. **Check Render logs**: Dashboard → Logs tab
2. **Test API manually**:
   ```bash
   curl -X POST https://your-api.onrender.com/auth/login \
     -H "Content-Type: application/json" \
     -d '{"email":"your-email@example.com"}'
   ```
3. **Check spam folder** in your email
4. **Verify Resend logs**: Resend dashboard shows sent/failed emails
5. **Test Resend directly**:
   ```bash
   curl -X POST https://api.resend.com/emails \
     -H "Authorization: Bearer re_YOUR_API_KEY" \
     -H "Content-Type: application/json" \
     -d '{
       "from": "onboarding@resend.dev",
       "to": "your-email@example.com",
       "subject": "Test",
       "text": "Hello"
     }'
   ```

## ⚠️ Important Notes

### Resend Domain Verification Issues

- **Without domain verification**: You can only send to the email used to sign up for Resend
- **With domain verification**: You can send to any email address
- **Testing**: Use `onboarding@resend.dev` as sender for testing without domain

### Gmail SMTP Issues (Why it fails on Render)

Gmail considers Render/AWS IPs "untrusted" and blocks SMTP. Even with "less secure apps" enabled, it often fails. Don't use Gmail SMTP in production.

### Testing on Render

Use a test email you control to verify:
```bash
# Test endpoint
curl -X POST https://your-api.onrender.com/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"your-gmail@gmail.com"}'
```

## 📱 Flutter App Changes

Update your API base URL in Flutter:

```dart
// In your ApiClient or constants file
class ApiConfig {
  // Local development
  // static const String baseUrl = 'http://192.168.1.X:5000';
  
  // Production (Render)
  static const String baseUrl = 'https://your-service-name.onrender.com';
}
```

## ✅ Quick Test Script

Create this file to test your email configuration:

```javascript
// test-email.js
require('dotenv').config();
const { sendOtpEmail } = require('./src/services/email.service');

async function test() {
  try {
    await sendOtpEmail({
      to: 'your-test-email@gmail.com',
      otp: '123456'
    });
    console.log('✅ Email sent successfully');
  } catch (err) {
    console.error('❌ Failed:', err.message);
  }
}

test();
```

Run: `node test-email.js`

## 🎯 Summary

| Solution | Setup Time | Reliability | Cost |
|----------|-----------|-------------|------|
| **Resend** | 5 min | ⭐⭐⭐⭐⭐ | Free 3k/mo |
| SendGrid | 10 min | ⭐⭐⭐⭐ | Free 100/day |
| Gmail SMTP | 1 min | ⭐⭐ (blocked) | Free |
| AWS SES | 30 min | ⭐⭐⭐⭐⭐ | Pay per use |

**Recommendation**: Use Resend for fastest, most reliable setup.
