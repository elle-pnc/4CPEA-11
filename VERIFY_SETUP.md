# Verify 2FA Backend Setup

If you already set the Gmail secrets **before deployment**, you should be all set! Just verify and test.

## Quick Verification

### 1. Check if Secrets Are Set (Optional)

You can verify in Firebase Console:
- Go to: https://console.firebase.google.com/project/cpe11-48f3f/functions
- Look for "Secrets" section (if available in UI)

Or try to access them:
```bash
cd /Users/lloyd/4CPEA-11
npm run firebase functions:secrets:access GMAIL_USER
npm run firebase functions:secrets:access GMAIL_APP_PASSWORD
```

### 2. Verify Function Code Has Secrets Configured

The function code should have this (check `functions/index.js`):

```javascript
exports.sendVerificationCode = functions
  .runWith({ secrets: [gmailUser, gmailAppPassword] })
  .https.onCall(async (data, context) => {
    // ... code uses gmailUser.value() and gmailAppPassword.value()
  });
```

If you deployed AFTER setting secrets AND after I updated the code, you're good!

### 3. Test the 2FA Flow

1. **Open your app** (locally or deployed)
2. **Try logging in** with a valid account
3. **Check your email** (and spam folder) for the verification code
4. **Enter the code** on the verification page
5. **Verify login works**

## If It Works

✅ **You're done!** No need to set secrets again.

## If Emails Don't Arrive

1. **Check spam folder**
2. **Check function logs:**
   ```bash
   cd /Users/lloyd/4CPEA-11
   npm run firebase:logs
   ```
3. **Verify secrets are set:**
   - Check Firebase Console
   - Or verify you ran the `functions:secrets:set` commands
4. **Make sure you redeployed AFTER setting secrets** (if you set them before the code was updated)

## Do You Need to Set Secrets Again?

**No, you don't need to set them again if:**
- ✅ You set them before deployment
- ✅ You deployed AFTER I updated the code to use secrets
- ✅ The function code has `runWith({ secrets: [...] })`

**You might need to redeploy if:**
- ❌ You set secrets but deployed BEFORE the code was updated to use them
- ❌ The function code doesn't have `runWith({ secrets: [...] })`

## Next Step: Just Test It!

Try logging in and see if you receive the verification email. That's the best way to verify everything is working!
