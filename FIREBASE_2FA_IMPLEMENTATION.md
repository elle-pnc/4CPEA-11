# Firebase Two-Step Verification Implementation Guide

## Overview
This guide explains how to implement real two-step verification using Firebase Firestore and Cloud Functions to send verification codes via email (Gmail).

## Architecture

### Components Needed:
1. **Firebase SDK** - Client-side Firebase integration
2. **Firestore Database** - Store verification codes with expiration
3. **Firebase Cloud Functions** - Server-side function to send emails
4. **Email Service** - Nodemailer with Gmail SMTP or SendGrid

---

## Step 1: Install Firebase Dependencies

```bash
npm install firebase
```

---

## Step 2: Firebase Configuration

Create `src/firebase/config.js`:

```javascript
import { initializeApp } from 'firebase/app'
import { getAuth } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'
import { getFunctions } from 'firebase/functions'

const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
  databaseURL: "https://YOUR_PROJECT_ID-default-rtdb.firebaseio.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT_ID.appspot.com",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_APP_ID"
}

const app = initializeApp(firebaseConfig)
export const auth = getAuth(app)
export const db = getFirestore(app)
export const functions = getFunctions(app)
export default app
```

---

## Step 3: Firebase Cloud Function (Backend)

Create `functions/index.js` in a separate `functions` folder:

### Option A: Using Nodemailer with Gmail

**Prerequisites:**
1. Enable "Less secure app access" OR use OAuth2 (recommended)
2. Or use App Password for Gmail

```javascript
const functions = require('firebase-functions')
const admin = require('firebase-admin')
const nodemailer = require('nodemailer')
const cors = require('cors')({ origin: true })

admin.initializeApp()

// Gmail SMTP Configuration
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: 'your-email@gmail.com', // Your Gmail address
    pass: 'your-app-password' // Gmail App Password (not regular password)
  }
})

exports.sendVerificationCode = functions.https.onRequest((req, res) => {
  cors(req, res, async () => {
    if (req.method !== 'POST') {
      return res.status(405).send('Method Not Allowed')
    }

    const { email } = req.body

    if (!email) {
      return res.status(400).send('Email is required')
    }

    // Generate 6-digit code
    const code = Math.floor(100000 + Math.random() * 900000).toString()
    const expirationTime = Date.now() + 10 * 60 * 1000 // 10 minutes

    try {
      // Store code in Firestore
      await admin.firestore().collection('verificationCodes').doc(email).set({
        code: code,
        email: email,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        expiresAt: expirationTime,
        used: false
      })

      // Send email
      const mailOptions = {
        from: 'your-email@gmail.com',
        to: email,
        subject: 'CPE11-AFCS Verification Code',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #1e88e5;">Two-Step Verification</h2>
            <p>Your verification code is:</p>
            <h1 style="color: #1e88e5; font-size: 32px; letter-spacing: 8px; text-align: center;">${code}</h1>
            <p>This code will expire in 10 minutes.</p>
            <p>If you didn't request this code, please ignore this email.</p>
          </div>
        `
      }

      await transporter.sendMail(mailOptions)

      return res.status(200).send({ success: true, message: 'Verification code sent' })
    } catch (error) {
      console.error('Error sending verification code:', error)
      return res.status(500).send({ success: false, error: error.message })
    }
  })
})

exports.verifyCode = functions.https.onRequest((req, res) => {
  cors(req, res, async () => {
    if (req.method !== 'POST') {
      return res.status(405).send('Method Not Allowed')
    }

    const { email, code } = req.body

    if (!email || !code) {
      return res.status(400).send('Email and code are required')
    }

    try {
      const docRef = admin.firestore().collection('verificationCodes').doc(email)
      const doc = await docRef.get()

      if (!doc.exists) {
        return res.status(404).send({ success: false, error: 'Verification code not found' })
      }

      const data = doc.data()

      // Check if code is expired
      if (Date.now() > data.expiresAt) {
        await docRef.delete()
        return res.status(400).send({ success: false, error: 'Verification code expired' })
      }

      // Check if code is already used
      if (data.used) {
        return res.status(400).send({ success: false, error: 'Verification code already used' })
      }

      // Verify code
      if (data.code !== code) {
        return res.status(400).send({ success: false, error: 'Invalid verification code' })
      }

      // Mark as used
      await docRef.update({ used: true })

      return res.status(200).send({ success: true, message: 'Verification successful' })
    } catch (error) {
      console.error('Error verifying code:', error)
      return res.status(500).send({ success: false, error: error.message })
    }
  })
})
```

### Option B: Using SendGrid (Easier, More Reliable)

```javascript
const sgMail = require('@sendgrid/mail')

sgMail.setApiKey(process.env.SENDGRID_API_KEY)

// In the sendVerificationCode function, replace transporter.sendMail with:
await sgMail.send({
  to: email,
  from: 'your-verified-sender@yourdomain.com', // Must be verified in SendGrid
  subject: 'CPE11-AFCS Verification Code',
  html: `...same HTML as above...`
})
```

---

## Step 4: Setup Firebase Functions

Create `functions/package.json`:

```json
{
  "name": "functions",
  "description": "Cloud Functions for Firebase",
  "scripts": {
    "serve": "firebase emulators:start --only functions",
    "shell": "firebase functions:shell",
    "start": "npm run shell",
    "deploy": "firebase deploy --only functions",
    "logs": "firebase functions:log"
  },
  "engines": {
    "node": "18"
  },
  "main": "index.js",
  "dependencies": {
    "firebase-admin": "^12.0.0",
    "firebase-functions": "^4.5.0",
    "nodemailer": "^6.9.7",
    "cors": "^2.8.5"
  },
  "devDependencies": {
    "firebase-functions-test": "^3.1.0"
  },
  "private": true
}
```

---

## Step 5: Gmail App Password Setup

To use Gmail SMTP, you need to:

1. **Enable 2-Step Verification** on your Google Account
2. **Generate App Password:**
   - Go to Google Account → Security → 2-Step Verification
   - Scroll to "App passwords"
   - Generate a new app password for "Mail"
   - Use this password in the Cloud Function (NOT your regular Gmail password)

---

## Step 6: Update React Components

### Update LoginPage to send verification code:

```javascript
import { sendPasswordResetEmail, signInWithEmailAndPassword } from 'firebase/auth'
import { httpsCallable } from 'firebase/functions'
import { functions } from '../firebase/config'

const handleSubmit = async (e) => {
  e.preventDefault()
  
  try {
    // First, verify user exists (optional - you might skip this)
    // await signInWithEmailAndPassword(auth, email, password)
    
    // Send verification code
    const sendCode = httpsCallable(functions, 'sendVerificationCode')
    const result = await sendCode({ email })
    
    if (result.data.success) {
      // Store email in session/localStorage for verification page
      sessionStorage.setItem('pendingVerificationEmail', email)
      navigate('/verify')
    }
  } catch (error) {
    console.error('Error:', error)
    alert('Failed to send verification code. Please try again.')
  }
}
```

### Update TwoStepVerificationPage to verify code:

```javascript
import { httpsCallable } from 'firebase/functions'
import { functions } from '../firebase/config'

const handleVerify = async () => {
  if (!codes.every(code => code !== '')) return

  const enteredCode = codes.join('')
  const email = sessionStorage.getItem('pendingVerificationEmail')

  try {
    const verifyCode = httpsCallable(functions, 'verifyCode')
    const result = await verifyCode({ email, code: enteredCode })

    if (result.data.success) {
      sessionStorage.removeItem('pendingVerificationEmail')
      onVerify()
      navigate('/dashboard')
    } else {
      alert(result.data.error || 'Invalid verification code')
      // Clear inputs
      setCodes(['', '', '', '', '', ''])
      inputRefs.current[0]?.focus()
    }
  } catch (error) {
    console.error('Verification error:', error)
    alert('Verification failed. Please try again.')
    setCodes(['', '', '', '', '', ''])
    inputRefs.current[0]?.focus()
  }
}
```

---

## Step 7: Firebase Setup Commands

1. **Install Firebase CLI:**
```bash
npm install -g firebase-tools
```

2. **Login to Firebase:**
```bash
firebase login
```

3. **Initialize Firebase in your project:**
```bash
firebase init functions
firebase init firestore
```

4. **Deploy Cloud Functions:**
```bash
cd functions
npm install
cd ..
firebase deploy --only functions
```

---

## Alternative: Simpler Approach (Without Cloud Functions)

If you want to avoid Cloud Functions initially, you can use a free email service API:

### Option 1: EmailJS (Free tier available)
- No backend needed
- Works directly from React
- Limited to 200 emails/month on free tier

### Option 2: Resend (Modern, Simple API)
- Easy to integrate
- Good free tier
- Requires minimal setup

---

## Security Best Practices

1. **Code Expiration:** Codes expire after 10 minutes
2. **One-time Use:** Codes are marked as used after verification
3. **Rate Limiting:** Add rate limiting to prevent abuse
4. **HTTPS Only:** Always use HTTPS for API calls
5. **Environment Variables:** Store sensitive data in environment variables

---

## Testing

1. Test with a real email address
2. Verify code expiration works
3. Test invalid codes
4. Test expired codes
5. Test already-used codes

---

## Resources

- [Firebase Cloud Functions Docs](https://firebase.google.com/docs/functions)
- [Firestore Documentation](https://firebase.google.com/docs/firestore)
- [Nodemailer Documentation](https://nodemailer.com/about/)
- [Gmail App Passwords](https://support.google.com/accounts/answer/185833)

