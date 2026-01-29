# Firebase Two-Step Verification Setup Instructions

## Quick Start Guide

### Method 1: Using Firebase Cloud Functions (Recommended for Production)

#### Step 1: Install Firebase SDK
```bash
npm install firebase
```

#### Step 2: Create Firebase Project
1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Create a new project
3. Enable Firestore Database
4. Enable Cloud Functions
5. Copy your Firebase config from Project Settings

#### Step 3: Setup Cloud Functions
1. Install Firebase CLI:
```bash
npm install -g firebase-tools
```

2. Login to Firebase:
```bash
firebase login
```

3. Initialize Functions:
```bash
firebase init functions
```
   - Select JavaScript
   - Install dependencies? Yes

4. Copy `functions/index.example.js` to `functions/index.js` and configure

5. Install function dependencies:
```bash
cd functions
npm install firebase-functions firebase-admin nodemailer cors
```

6. Set Gmail credentials (use environment variables or Firebase config):
```bash
firebase functions:config:set gmail.user="your-email@gmail.com"
firebase functions:config:set gmail.pass="your-app-password"
```

7. Deploy functions:
```bash
firebase deploy --only functions
```

#### Step 4: Get Gmail App Password
1. Go to [Google Account Security](https://myaccount.google.com/security)
2. Enable 2-Step Verification if not already enabled
3. Go to "App passwords"
4. Select "Mail" and device
5. Copy the 16-character password
6. Use this password in your Cloud Function config (NOT your regular Gmail password)

#### Step 5: Update React App
1. Copy `src/firebase/config.example.js` to `src/firebase/config.js`
2. Add your Firebase config
3. Update `LoginPage.jsx` to call the sendVerificationCode function
4. Update `TwoStepVerificationPage.jsx` to call the verifyCode function

---

### Method 2: Using EmailJS (Simpler, No Backend Required)

#### Step 1: Sign up for EmailJS
1. Go to [EmailJS](https://www.emailjs.com/)
2. Create a free account (200 emails/month free)
3. Add Gmail service
4. Create email template

#### Step 2: Install EmailJS
```bash
npm install @emailjs/browser
```

#### Step 3: Update LoginPage.jsx
```javascript
import emailjs from '@emailjs/browser'

const sendVerificationCode = async (email) => {
  // Generate code
  const code = Math.floor(100000 + Math.random() * 900000).toString()
  
  // Store in Firestore or localStorage temporarily
  // ...store code...
  
  // Send via EmailJS
  await emailjs.send(
    'YOUR_SERVICE_ID',
    'YOUR_TEMPLATE_ID',
    {
      to_email: email,
      verification_code: code,
      to_name: 'User'
    },
    'YOUR_PUBLIC_KEY'
  )
}
```

---

### Method 3: Using SendGrid (More Reliable, Better for Production)

#### Step 1: Sign up for SendGrid
1. Go to [SendGrid](https://sendgrid.com/)
2. Create account (free tier: 100 emails/day)
3. Verify sender email
4. Get API key

#### Step 2: Update Cloud Function
Replace nodemailer with SendGrid:
```bash
cd functions
npm install @sendgrid/mail
```

Update `functions/index.js`:
```javascript
const sgMail = require('@sendgrid/mail')
sgMail.setApiKey(process.env.SENDGRID_API_KEY)

// Replace transporter.sendMail with:
await sgMail.send({
  to: email,
  from: 'your-verified-email@yourdomain.com',
  subject: 'CPE11-AFCS Verification Code',
  html: `...email template...`
})
```

---

## Recommended Approach

For your commuter app, I recommend:

1. **Start with EmailJS** (easiest, good for testing)
   - No backend setup needed
   - Quick to implement
   - Free tier sufficient for development

2. **Move to Cloud Functions + SendGrid** (for production)
   - More reliable
   - Better email delivery
   - More control over the process
   - Better for scaling

---

## Testing Checklist

- [ ] Verification code is sent to email
- [ ] Code is 6 digits
- [ ] Code expires after 10 minutes
- [ ] Code can only be used once
- [ ] Invalid code shows error message
- [ ] Expired code shows error message
- [ ] Used code cannot be reused
- [ ] Multiple failed attempts are blocked

---

## Security Considerations

1. **Rate Limiting**: Add rate limiting to prevent abuse
2. **IP Tracking**: Track IP addresses for security
3. **Code Complexity**: 6 digits is good, but consider 8 digits for higher security
4. **Expiration**: 10 minutes is standard, adjust based on needs
5. **Attempts**: Limit verification attempts (recommended: 5 attempts)

---

## Firestore Structure

```
verificationCodes/
  {email}/
    code: "123456"
    email: "user@example.com"
    createdAt: Timestamp
    expiresAt: 1234567890 (timestamp)
    used: false
    attempts: 0
    verifiedAt: Timestamp (if verified)
```

---

## Troubleshooting

### Gmail not sending emails
- Check App Password is correct
- Ensure 2-Step Verification is enabled
- Check spam folder
- Verify "Less secure app access" is enabled (if not using App Password)

### Cloud Functions not deploying
- Check Node.js version (should be 18)
- Verify billing is enabled on Firebase (required for Cloud Functions)
- Check Firebase CLI is up to date

### Code not verifying
- Check Firestore rules allow read/write
- Verify code hasn't expired
- Check timezone issues with expiration
- Ensure code format matches (6 digits)

