# Setup Backend 2FA with Email (Gmail)

This guide walks you through setting up backend-based 2FA that sends verification codes via email.

## Prerequisites

1. **Firebase CLI Setup:**
   
   **If you're getting npm permission errors**, first fix npm (see `FIX_NPM_PERMISSIONS.md`):
   
   **Option A: Use nvm (Recommended - Best Solution):**
   ```bash
   # Install nvm to avoid permission issues
   curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
   source ~/.zshrc
   nvm install 20
   nvm use 20
   
   # Then install Firebase CLI locally
   npm install --save-dev firebase-tools
   
   # Use via npm scripts (see package.json)
   npm run firebase:login
   ```
   
   **Option B: Install locally in project:**
   ```bash
   # In project directory
   npm install --save-dev firebase-tools
   
   # Then use: npm run firebase:login
   # Or: ./node_modules/.bin/firebase login
   ```
   
   **Option C: Use npx (if npm works):**
   ```bash
   npx firebase login
   ```
   
   **If you see npm permission errors**, see `FIX_NPM_PERMISSIONS.md` first.

2. **Firebase Blaze Plan** (required for Cloud Functions, but free tier is generous)

3. **Gmail account with 2-Step Verification enabled**

## Step 1: Initialize Firebase Functions

```bash
# In your project root directory

# If using npm scripts (recommended if installed locally):
npm run firebase:init

# OR if using npx:
npx firebase init functions

# OR if installed globally:
firebase init functions

# Select:
# - JavaScript
# - Yes to install dependencies
```

## Step 2: Install Dependencies

```bash
cd functions
npm install
```

The `package.json` already includes:
- `firebase-admin` - Firebase Admin SDK
- `firebase-functions` - Cloud Functions SDK
- `nodemailer` - Email sending library

## Step 3: Get Gmail App Password

1. **Enable 2-Step Verification on your Google Account:**
   - Go to: https://myaccount.google.com/security
   - Enable "2-Step Verification"

2. **Generate App Password:**
   - Go to: https://myaccount.google.com/apppasswords
   - Select "Mail" and device type
   - Copy the 16-character password (looks like: `abcd efgh ijkl mnop`)

## Step 4: Configure Firebase Functions

Set your Gmail credentials:

```bash
# Using npm scripts (if installed locally):
npm run firebase:config:set gmail.user="your-email@gmail.com"
npm run firebase:config:set gmail.apppassword="your-16-char-app-password"

# OR using npx:
npx firebase functions:config:set gmail.user="your-email@gmail.com"
npx firebase functions:config:set gmail.apppassword="your-16-char-app-password"

# OR if installed globally:
firebase functions:config:set gmail.user="your-email@gmail.com"
firebase functions:config:set gmail.apppassword="your-16-char-app-password"
```

**Important:** Remove spaces from the app password when setting it.

Example:
```bash
firebase functions:config:set gmail.user="myapp@gmail.com"
firebase functions:config:set gmail.apppassword="abcdefghijklmnop"
```

## Step 5: Deploy Cloud Function

```bash
# From project root

# Using npm scripts (recommended if installed locally):
npm run firebase:deploy

# OR using npx:
npx firebase deploy --only functions

# OR if installed globally:
firebase deploy --only functions
```

Wait for deployment to complete. You'll see a URL like:
```
https://us-central1-cpe11-48f3f.cloudfunctions.net/sendVerificationCode
```

## Step 6: Update Frontend

The frontend code has already been updated in `LoginPage.jsx` to use the Cloud Function instead of local code generation.

The function automatically:
- Generates a 6-digit code
- Stores it in Firestore
- Sends it via email
- Sets 10-minute expiration

## Step 7: Test

1. **Try logging in** with a valid account
2. **Check your email** (and spam folder) for the verification code
3. **Enter the code** on the verification page
4. **Verify login works**

## Troubleshooting

### Issue: "Email service not configured"

**Solution:**
- Verify you set the config: `npx firebase functions:config:get`
- Make sure you deployed after setting config: `npx firebase deploy --only functions`

### Issue: Emails not arriving

**Solution:**
- Check spam folder
- Verify Gmail app password is correct (no spaces)
- Check Firebase Functions logs: `firebase functions:log`
- Verify sender email in Firebase config matches your Gmail

### Issue: Authentication error (EAUTH)

**Solution:**
- Make sure 2-Step Verification is enabled on Gmail
- Regenerate app password
- Update Firebase config with new password
- Redeploy functions

### Issue: Function not found

**Solution:**
- Make sure function is deployed: `npx firebase deploy --only functions`
- Check function name matches: `sendVerificationCode`
- Verify `functions/index.js` exists and is correct

## Viewing Logs

To see Cloud Functions logs in real-time:

```bash
npx firebase functions:log --only sendVerificationCode
```

Or view in Firebase Console:
- Go to Firebase Console → Functions → Logs

## Cost

**Firebase Cloud Functions:**
- Free tier: 2 million invocations/month
- After free tier: $0.40 per million invocations
- Typical app: ~100-1000 logins/month = **FREE**

**Gmail SMTP:**
- Free (unlimited emails from your Gmail account)

## Security Best Practices

1. **Rate Limiting:** The function stores `lastSent` timestamp. You can add rate limiting in the function if needed.

2. **Code Expiration:** Codes expire after 10 minutes (already implemented)

3. **Attempt Limiting:** Frontend handles attempt limiting via Firestore

4. **Email Validation:** Only sends to email addresses used during login

## Alternative: Using SendGrid (For Production)

If you need more reliable email delivery or want to send from a custom domain:

1. **Sign up at:** https://sendgrid.com (free tier: 100 emails/day)

2. **Update `functions/index.js`:**
   ```javascript
   const sgMail = require('@sendgrid/mail');
   sgMail.setApiKey(functions.config().sendgrid.apikey);
   ```

3. **Install SendGrid:**
   ```bash
   cd functions
   npm install @sendgrid/mail
   ```

4. **Set API key:**
   ```bash
   firebase functions:config:set sendgrid.apikey="your-sendgrid-api-key"
   ```

5. **Update email sending code** to use SendGrid instead of Nodemailer

## Next Steps

1. ✅ Deploy Cloud Functions
2. ✅ Configure Gmail credentials
3. ✅ Test email delivery
4. ✅ Remove console.log from frontend (optional)
5. ✅ Consider using SendGrid for production (optional)

---

**Your 2FA is now backend-based and sends codes via email!** 🎉
