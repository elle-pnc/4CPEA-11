# Post-Deployment Steps - 2FA Backend Setup

Congratulations! Your Cloud Functions are deployed. Now you need to:

## Step 1: Set Gmail Secrets (REQUIRED)

Before the function can send emails, you need to configure your Gmail credentials:

```bash
cd /Users/lloyd/4CPEA-11

# Set Gmail user secret
npm run firebase functions:secrets:set GMAIL_USER
# When prompted, enter: cadangjohnlloyd92@gmail.com
# Press Enter

# Set Gmail app password secret
npm run firebase functions:secrets:set GMAIL_APP_PASSWORD
# When prompted, enter: ymvwlphyswbeiwcc (NO SPACES!)
# Remove all spaces! "ymvw lphy swbe iwcc" → "ymvwlphyswbeiwcc"
# Press Enter
```

**Important:** 
- Make sure you have a Gmail App Password ready
- Get it from: https://myaccount.google.com/apppasswords
- Remove ALL spaces when entering it

## Step 2: Redeploy Function (After Setting Secrets)

After setting secrets, you need to redeploy so the function has access to them:

```bash
cd /Users/lloyd/4CPEA-11
npm run firebase:deploy
```

This will redeploy with access to the secrets.

## Step 3: Test the 2FA Flow

1. **Open your app** (locally or deployed)
2. **Try logging in** with a valid account
3. **Check your email** (and spam folder) for the verification code
4. **Enter the code** on the verification page
5. **Verify login works**

## Step 4: Check Function Logs (If Issues)

If emails aren't arriving, check the function logs:

```bash
cd /Users/lloyd/4CPEA-11
npm run firebase:logs
```

Or view in Firebase Console:
- Go to: https://console.firebase.google.com/project/cpe11-48f3f/functions
- Click on `sendVerificationCode`
- View "Logs" tab

## Troubleshooting

### Emails Not Arriving?

1. **Check spam folder**
2. **Verify secrets are set:**
   - Check in Firebase Console: https://console.firebase.google.com/project/cpe11-48f3f/functions
   - Or verify you ran the `functions:secrets:set` commands
3. **Check function logs** (see Step 4 above)
4. **Verify Gmail App Password** is correct (no spaces)
5. **Make sure you redeployed** after setting secrets

### Function Not Found Error?

- Make sure you redeployed after setting secrets
- Check function name matches: `sendVerificationCode`

### Permission Errors?

- Verify Firebase Functions API is enabled
- Check you have Blaze plan enabled
- Verify secrets are accessible by the function

## Verify Secrets Are Set

To check if secrets are configured, you can view them in Firebase Console:

1. Go to: https://console.firebase.google.com/project/cpe11-48f3f/functions
2. Click on "Secrets" tab (if available)

Or try to access them directly:

```bash
cd /Users/lloyd/4CPEA-11
npm run firebase functions:secrets:access GMAIL_USER
npm run firebase functions:secrets:access GMAIL_APP_PASSWORD
```

You should see the secret values (or confirmation they exist).

## Next Steps Summary

1. ✅ Deploy functions (DONE!)
2. ⏳ Set Gmail secrets (DO THIS NOW)
3. ⏳ Redeploy function (after secrets)
4. ⏳ Test login with 2FA
5. ⏳ Verify emails are sent
6. ⏳ Check spam folder if needed

## Success Checklist

- [ ] Gmail secrets set (GMAIL_USER and GMAIL_APP_PASSWORD)
- [ ] Function redeployed after setting secrets
- [ ] Test login attempted
- [ ] Verification email received
- [ ] Code entered successfully
- [ ] Login completed

---

**Most Important:** Set the Gmail secrets now! The function won't send emails without them.
