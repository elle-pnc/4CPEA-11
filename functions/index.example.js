// Firebase Cloud Functions for Two-Step Verification
// Place this in a 'functions' folder at project root
// Run: npm install firebase-functions firebase-admin nodemailer cors

const functions = require('firebase-functions')
const admin = require('firebase-admin')
const nodemailer = require('nodemailer')
const cors = require('cors')({ origin: true })

admin.initializeApp()

// Gmail SMTP Configuration
// You'll need a Gmail App Password (not your regular password)
// Get it from: Google Account > Security > 2-Step Verification > App passwords
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: functions.config().gmail.user || 'your-email@gmail.com',
    pass: functions.config().gmail.pass || 'your-app-password'
  }
})

/**
 * Send verification code to user's email
 * POST /sendVerificationCode
 * Body: { email: "user@example.com" }
 */
exports.sendVerificationCode = functions.https.onRequest((req, res) => {
  cors(req, res, async () => {
    if (req.method !== 'POST') {
      return res.status(405).json({ success: false, error: 'Method Not Allowed' })
    }

    const { email } = req.body

    if (!email || !email.includes('@')) {
      return res.status(400).json({ success: false, error: 'Valid email is required' })
    }

    // Generate 6-digit code
    const code = Math.floor(100000 + Math.random() * 900000).toString()
    const expiresAt = Date.now() + 10 * 60 * 1000 // 10 minutes from now

    try {
      // Store code in Firestore
      await admin.firestore().collection('verificationCodes').doc(email).set({
        code: code,
        email: email,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        expiresAt: expiresAt,
        used: false,
        attempts: 0 // Track verification attempts
      })

      // Send email with verification code
      const mailOptions = {
        from: '"CPE11-AFCS" <your-email@gmail.com>',
        to: email,
        subject: 'Your CPE11-AFCS Verification Code',
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .code-box { 
                background: linear-gradient(135deg, #1e88e5 0%, #42a5f5 100%);
                color: white;
                padding: 30px;
                text-align: center;
                border-radius: 12px;
                margin: 20px 0;
              }
              .code { 
                font-size: 36px; 
                font-weight: bold; 
                letter-spacing: 8px;
                font-family: 'Courier New', monospace;
              }
              .footer { color: #757575; font-size: 12px; margin-top: 30px; }
            </style>
          </head>
          <body>
            <div class="container">
              <h2 style="color: #1e88e5;">Two-Step Verification</h2>
              <p>Your verification code is:</p>
              <div class="code-box">
                <div class="code">${code}</div>
              </div>
              <p>This code will expire in <strong>10 minutes</strong>.</p>
              <p>If you didn't request this code, please ignore this email or contact support.</p>
              <div class="footer">
                <p>This is an automated message from CPE11-AFCS. Please do not reply to this email.</p>
              </div>
            </div>
          </body>
          </html>
        `
      }

      await transporter.sendMail(mailOptions)

      return res.status(200).json({ 
        success: true, 
        message: 'Verification code sent to your email' 
      })
    } catch (error) {
      console.error('Error sending verification code:', error)
      return res.status(500).json({ 
        success: false, 
        error: 'Failed to send verification code. Please try again.' 
      })
    }
  })
})

/**
 * Verify the code entered by user
 * POST /verifyCode
 * Body: { email: "user@example.com", code: "123456" }
 */
exports.verifyCode = functions.https.onRequest((req, res) => {
  cors(req, res, async () => {
    if (req.method !== 'POST') {
      return res.status(405).json({ success: false, error: 'Method Not Allowed' })
    }

    const { email, code } = req.body

    if (!email || !code) {
      return res.status(400).json({ success: false, error: 'Email and code are required' })
    }

    if (code.length !== 6 || !/^\d+$/.test(code)) {
      return res.status(400).json({ success: false, error: 'Code must be 6 digits' })
    }

    try {
      const docRef = admin.firestore().collection('verificationCodes').doc(email)
      const doc = await docRef.get()

      if (!doc.exists) {
        return res.status(404).json({ 
          success: false, 
          error: 'No verification code found. Please request a new code.' 
        })
      }

      const data = doc.data()

      // Check if code is expired
      if (Date.now() > data.expiresAt) {
        await docRef.delete()
        return res.status(400).json({ 
          success: false, 
          error: 'Verification code has expired. Please request a new code.' 
        })
      }

      // Check if code is already used
      if (data.used) {
        return res.status(400).json({ 
          success: false, 
          error: 'This verification code has already been used. Please request a new code.' 
        })
      }

      // Check attempts (prevent brute force)
      if (data.attempts >= 5) {
        await docRef.delete()
        return res.status(400).json({ 
          success: false, 
          error: 'Too many failed attempts. Please request a new code.' 
        })
      }

      // Verify code
      if (data.code !== code) {
        // Increment attempts
        await docRef.update({ 
          attempts: admin.firestore.FieldValue.increment(1) 
        })
        return res.status(400).json({ 
          success: false, 
          error: 'Invalid verification code. Please try again.' 
        })
      }

      // Code is valid - mark as used
      await docRef.update({ 
        used: true,
        verifiedAt: admin.firestore.FieldValue.serverTimestamp()
      })

      return res.status(200).json({ 
        success: true, 
        message: 'Verification successful' 
      })
    } catch (error) {
      console.error('Error verifying code:', error)
      return res.status(500).json({ 
        success: false, 
        error: 'Verification failed. Please try again.' 
      })
    }
  })
})

/**
 * Optional: Clean up expired codes (scheduled function)
 * Runs daily to delete old verification codes
 */
exports.cleanupExpiredCodes = functions.pubsub.schedule('every 24 hours').onRun(async (context) => {
  const now = Date.now()
  const expiredCodes = await admin.firestore()
    .collection('verificationCodes')
    .where('expiresAt', '<', now)
    .get()

  const batch = admin.firestore().batch()
  expiredCodes.forEach(doc => {
    batch.delete(doc.ref)
  })

  await batch.commit()
  console.log(`Cleaned up ${expiredCodes.size} expired verification codes`)
  return null
})

