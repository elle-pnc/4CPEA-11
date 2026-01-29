# Backend 2FA Implementation Guide

This guide explains how to implement backend-based 2FA that sends verification codes via email using Firebase Cloud Functions or a custom Node.js backend.

## Architecture Overview

**Current Flow (Frontend-only):**
```
User Login → Generate Code in Frontend → Store in Firestore → Show in Console
```

**New Flow (Backend-based):**
```
User Login → Backend Generates Code → Backend Sends Email → Store in Firestore → User Receives Email
```

## Option 1: Firebase Cloud Functions (Recommended)

Firebase Cloud Functions are serverless functions that run on Google's infrastructure. They're free for reasonable usage and integrate seamlessly with Firebase.

### Prerequisites

1. **Firebase CLI (use npx - recommended):**
   ```bash
   # No installation needed, just use npx
   npx firebase login
   ```
   
   If you get permission errors when installing globally, just use `npx firebase` instead of `firebase` in all commands.

2. **Firebase project configured**

3. **Billing enabled** (Cloud Functions require Blaze plan, but free tier is generous)

### Step 1: Initialize Firebase Functions

```bash
# In your project root (use npx to avoid permission issues)
npx firebase init functions
```

# Select:
# - JavaScript or TypeScript (your preference)
# - Install dependencies with npm? Yes
```

### Step 2: Install Email Dependencies

For sending emails via Gmail or other providers:

**Option A: Using Nodemailer with Gmail (SMTP)**
```bash
cd functions
npm install nodemailer
```

**Option B: Using SendGrid (Recommended for production)**
```bash
cd functions
npm install @sendgrid/mail
```

**Option C: Using Mailgun**
```bash
cd functions
npm install mailgun-js
```

### Step 3: Create Cloud Function for Sending 2FA Code

Create `functions/index.js`:

```javascript
const functions = require('firebase-functions');
const admin = require('firebase-admin');
const nodemailer = require('nodemailer'); // For Gmail SMTP

admin.initializeApp();

// Configure Gmail SMTP (Option A)
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: functions.config().gmail.user, // Your Gmail address
    pass: functions.config().gmail.appPassword, // Gmail App Password (not regular password)
  },
});

// Cloud Function: Send 2FA verification code
exports.sendVerificationCode = functions.https.onCall(async (data, context) => {
  // Verify the request is from an authenticated user (optional)
  // if (!context.auth) {
  //   throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
  // }

  const { email } = data;

  if (!email) {
    throw new functions.https.HttpsError('invalid-argument', 'Email is required');
  }

  try {
    // Generate 6-digit code
    const code = Math.floor(100000 + Math.random() * 900000).toString();

    // Store code in Firestore
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 10); // 10 minutes expiration

    await admin.firestore().collection('verificationCodes').doc(email).set({
      code,
      email,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      expiresAt: expiresAt,
      used: false,
      attempts: 0,
    });

    // Send email via Gmail SMTP
    const mailOptions = {
      from: functions.config().gmail.user,
      to: email,
      subject: 'Your AFCS Verification Code',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #667eea;">AFCS Verification Code</h2>
          <p>Hello,</p>
          <p>Your verification code is:</p>
          <div style="background: #f5f5f5; padding: 20px; text-align: center; margin: 20px 0;">
            <h1 style="color: #667eea; font-size: 32px; letter-spacing: 8px; margin: 0;">${code}</h1>
          </div>
          <p>This code will expire in 10 minutes.</p>
          <p>If you didn't request this code, please ignore this email.</p>
          <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
          <p style="color: #999; font-size: 12px;">This is an automated message from AFCS. Please do not reply.</p>
        </div>
      `,
      text: `Your AFCS verification code is: ${code}. This code will expire in 10 minutes.`,
    };

    await transporter.sendMail(mailOptions);

    return { success: true, message: 'Verification code sent' };
  } catch (error) {
    console.error('Error sending verification code:', error);
    throw new functions.https.HttpsError('internal', 'Failed to send verification code');
  }
});
```

### Step 4: Configure Gmail App Password

1. **Enable 2-Step Verification** on your Google Account
2. **Generate App Password:**
   - Go to: https://myaccount.google.com/apppasswords
   - Select "Mail" and "Other (Custom name)"
   - Enter "AFCS" as the name
   - Copy the generated 16-character password

3. **Set Firebase Functions Config:**
   ```bash
   npx firebase functions:config:set gmail.user="your-email@gmail.com"
   npx firebase functions:config:set gmail.apppassword="your-16-char-app-password"
   ```

### Step 5: Deploy Cloud Function

```bash
cd functions
npx firebase deploy --only functions
```

### Step 6: Update Frontend to Call Cloud Function

Update `src/pages/LoginPage.jsx`:

```javascript
import { getFunctions, httpsCallable } from 'firebase/functions';
import { functions } from '../firebase/config'; // Add to your config exports

// In handleSubmit:
try {
  const userCredential = await signInWithEmailAndPassword(auth, email, password);
  await signOut(auth);
  await new Promise(resolve => setTimeout(resolve, 200));

  // Call Cloud Function to send verification code
  const sendVerificationCode = httpsCallable(functions, 'sendVerificationCode');
  const result = await sendVerificationCode({ email });
  
  if (result.data.success) {
    console.log('Verification code sent to email');
    setLoading(false);
    navigate('/verify', { replace: true });
  } else {
    throw new Error('Failed to send verification code');
  }
} catch (error) {
  // Handle errors
}
```

### Step 7: Update Firebase Config

Add Functions to `src/firebase/config.js`:

```javascript
import { getFunctions } from 'firebase/functions';

export const functions = getFunctions(app);
```

---

## Option 2: Custom Node.js Backend (Express)

If you prefer a standalone backend server (e.g., for more control or existing infrastructure).

### Step 1: Create Backend Server

Create `server/index.js`:

```javascript
const express = require('express');
const cors = require('cors');
const nodemailer = require('nodemailer');
const admin = require('firebase-admin');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

// Initialize Firebase Admin SDK
const serviceAccount = require('./path-to-service-account-key.json');
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

// Configure Gmail SMTP
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD,
  },
});

// API Endpoint: Send 2FA Code
app.post('/api/send-verification-code', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    // Generate code
    const code = Math.floor(100000 + Math.random() * 900000).toString();

    // Store in Firestore
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 10);

    await admin.firestore().collection('verificationCodes').doc(email).set({
      code,
      email,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      expiresAt,
      used: false,
      attempts: 0,
    });

    // Send email
    await transporter.sendMail({
      from: process.env.GMAIL_USER,
      to: email,
      subject: 'Your AFCS Verification Code',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #667eea;">AFCS Verification Code</h2>
          <p>Your verification code is:</p>
          <div style="background: #f5f5f5; padding: 20px; text-align: center; margin: 20px 0;">
            <h1 style="color: #667eea; font-size: 32px; letter-spacing: 8px;">${code}</h1>
          </div>
          <p>This code will expire in 10 minutes.</p>
        </div>
      `,
    });

    res.json({ success: true, message: 'Verification code sent' });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Failed to send verification code' });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
```

### Step 2: Update Frontend

```javascript
// In LoginPage.jsx
const sendVerificationCode = async (email) => {
  const response = await fetch('https://your-backend-url.com/api/send-verification-code', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email }),
  });
  return response.json();
};

// Use it in handleSubmit
await sendVerificationCode(email);
```

---

## Option 3: Using SendGrid (Recommended for Production)

SendGrid is more reliable than Gmail SMTP and has a generous free tier (100 emails/day).

### Setup SendGrid

1. **Sign up at:** https://sendgrid.com
2. **Create API Key:**
   - Settings → API Keys → Create API Key
   - Give it "Mail Send" permissions
   - Copy the API key

3. **Update Cloud Function:**

```javascript
const sgMail = require('@sendgrid/mail');

sgMail.setApiKey(functions.config().sendgrid.apikey);

// In your function:
const msg = {
  to: email,
  from: 'noreply@yourdomain.com', // Verified sender in SendGrid
  subject: 'Your AFCS Verification Code',
  html: `...`, // Same HTML as above
  text: `Your verification code is: ${code}`,
};

await sgMail.send(msg);
```

4. **Configure:**
   ```bash
   firebase functions:config:set sendgrid.apikey="your-sendgrid-api-key"
   ```

---

## Security Considerations

### 1. Rate Limiting

Prevent abuse by limiting code generation:

```javascript
// In Cloud Function
const emailRef = admin.firestore().collection('verificationCodes').doc(email);
const doc = await emailRef.get();

if (doc.exists) {
  const data = doc.data();
  const lastSent = data.lastSent?.toMillis() || 0;
  const now = Date.now();
  
  // Only allow one code per minute
  if (now - lastSent < 60000) {
    throw new functions.https.HttpsError('resource-exhausted', 'Please wait before requesting another code');
  }
}
```

### 2. Code Expiration

Already implemented (10 minutes), but verify it's working.

### 3. Attempt Limiting

Prevent brute force attacks:

```javascript
// In verifyCode function
if (attempts >= 5) {
  throw new Error('Too many attempts. Please request a new code.');
}
```

### 4. Email Verification

Only send codes to verified email addresses (optional but recommended).

---

## Testing

### Local Testing (Cloud Functions)

```bash
# Start emulator (using npx, no install needed)
npx firebase emulators:start --only functions

# Test locally
curl -X POST http://localhost:5001/your-project/us-central1/sendVerificationCode \
  -H "Content-Type: application/json" \
  -d '{"data":{"email":"test@example.com"}}'
```

---

## Migration Steps

1. **Deploy Cloud Function** (Option 1) or **Deploy Backend** (Option 2)
2. **Update Frontend:**
   - Remove local code generation
   - Add call to backend/Cloud Function
   - Remove console.log for codes
3. **Test thoroughly**
4. **Remove old frontend code** after confirming it works

---

## Cost Considerations

- **Firebase Cloud Functions:**
  - Free tier: 2 million invocations/month
  - After: $0.40 per million invocations
  - Gmail SMTP: Free

- **SendGrid:**
  - Free tier: 100 emails/day forever
  - Paid plans start at $15/month for 50k emails

- **Custom Backend:**
  - Hosting costs (Heroku, AWS, etc.)
  - Email service costs

---

## Recommended Approach

For your use case, **Firebase Cloud Functions with SendGrid** is recommended because:
- ✅ Integrated with Firebase (your current stack)
- ✅ Serverless (no server management)
- ✅ Generous free tiers
- ✅ Reliable email delivery
- ✅ Easy to deploy and maintain
- ✅ Scales automatically

Would you like me to implement the Cloud Functions approach with SendGrid or Gmail SMTP?
