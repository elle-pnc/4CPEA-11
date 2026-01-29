// Firebase Cloud Functions for Two-Step Verification
// This sends verification codes via email

const functions = require('firebase-functions');
const admin = require('firebase-admin');
const nodemailer = require('nodemailer');
const { defineSecret } = require('firebase-functions/params');

admin.initializeApp();

// Define secrets for Gmail credentials (new method)
const gmailUser = defineSecret('GMAIL_USER');
const gmailAppPassword = defineSecret('GMAIL_APP_PASSWORD');

// Configure Gmail SMTP
// Secrets are set using: firebase functions:secrets:set GMAIL_USER
// and: firebase functions:secrets:set GMAIL_APP_PASSWORD
// For local testing, create a .env file with GMAIL_USER and GMAIL_APP_PASSWORD

/**
 * Send verification code via email
 * Called from frontend after user enters valid credentials
 */
exports.sendVerificationCode = functions
  .runWith({ secrets: [gmailUser, gmailAppPassword] })
  .https.onCall(async (data, context) => {
  // Optional: Verify user is authenticated (commented out for 2FA flow)
  // if (!context.auth) {
  //   throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
  // }

  const { email } = data;

  if (!email || !email.includes('@')) {
    throw new functions.https.HttpsError(
      'invalid-argument',
      'Valid email address is required'
    );
  }

  try {
    // Generate 6-digit verification code
    const code = Math.floor(100000 + Math.random() * 900000).toString();

    // Calculate expiration time (10 minutes from now)
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 10);

    // Store code in Firestore
    await admin.firestore().collection('verificationCodes').doc(email).set({
      code: code,
      email: email,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      expiresAt: expiresAt,
      used: false,
      attempts: 0,
      lastSent: admin.firestore.FieldValue.serverTimestamp(),
    });

    // Create transporter with secrets (must be inside function to access secrets)
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: gmailUser.value(),
        pass: gmailAppPassword.value(),
      },
    });

    // Send email with verification code
    const mailOptions = {
      from: `"CPE11-AFCS" <${gmailUser.value()}>`,
      to: email,
      subject: 'Your AFCS Verification Code',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
              line-height: 1.6;
              color: #333;
              background-color: #f5f5f5;
              margin: 0;
              padding: 0;
            }
            .container {
              max-width: 600px;
              margin: 20px auto;
              background: white;
              border-radius: 12px;
              overflow: hidden;
              box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
            }
            .header {
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              color: white;
              padding: 30px;
              text-align: center;
            }
            .header h1 {
              margin: 0;
              font-size: 24px;
            }
            .content {
              padding: 30px;
            }
            .code-box {
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              color: white;
              padding: 30px;
              text-align: center;
              border-radius: 12px;
              margin: 30px 0;
            }
            .code {
              font-size: 42px;
              font-weight: bold;
              letter-spacing: 12px;
              font-family: 'Courier New', monospace;
              margin: 10px 0;
            }
            .info {
              background: #f8f9fa;
              padding: 20px;
              border-radius: 8px;
              margin: 20px 0;
              border-left: 4px solid #667eea;
            }
            .footer {
              background: #f8f9fa;
              padding: 20px;
              text-align: center;
              color: #666;
              font-size: 12px;
            }
            .warning {
              background: #fff3cd;
              border: 1px solid #ffc107;
              padding: 15px;
              border-radius: 8px;
              margin: 20px 0;
              color: #856404;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🔐 AFCS Verification Code</h1>
            </div>
            <div class="content">
              <p>Hello,</p>
              <p>You have requested a verification code for your AFCS account. Use the code below to complete your login:</p>
              
              <div class="code-box">
                <div style="font-size: 16px; margin-bottom: 10px;">Your Verification Code</div>
                <div class="code">${code}</div>
              </div>
              
              <div class="info">
                <strong>⏱️ Important:</strong> This code will expire in <strong>10 minutes</strong>.
              </div>
              
              <div class="warning">
                <strong>🔒 Security Notice:</strong> If you didn't request this code, please ignore this email or contact support immediately.
              </div>
              
              <p>Enter this code on the verification page to complete your login.</p>
            </div>
            <div class="footer">
              <p>This is an automated message from CPE11-AFCS.</p>
              <p>Please do not reply to this email.</p>
              <p>&copy; ${new Date().getFullYear()} CPE11-AFCS. All rights reserved.</p>
            </div>
          </div>
        </body>
        </html>
      `,
      text: `
Your AFCS Verification Code

Your verification code is: ${code}

This code will expire in 10 minutes.

If you didn't request this code, please ignore this email or contact support.

This is an automated message from CPE11-AFCS.
      `,
    };

    await transporter.sendMail(mailOptions);

    console.log(`Verification code sent to ${email}`);

    return {
      success: true,
      message: 'Verification code sent to your email',
    };
  } catch (error) {
    console.error('Error sending verification code:', error);
    
    // Handle specific errors
    if (error.code === 'EAUTH') {
      throw new functions.https.HttpsError(
        'failed-precondition',
        'Email service not configured. Please contact support.'
      );
    }
    
    throw new functions.https.HttpsError(
      'internal',
      'Failed to send verification code. Please try again.'
    );
  }
});

/**
 * Optional: Clean up expired verification codes
 * Runs daily at midnight to delete old codes
 */
exports.cleanupExpiredCodes = functions.pubsub
  .schedule('0 0 * * *') // Every day at midnight
  .timeZone('Asia/Manila')
  .onRun(async (context) => {
    const now = new Date();
    const expiredCodes = await admin
      .firestore()
      .collection('verificationCodes')
      .where('expiresAt', '<', now)
      .get();

    const batch = admin.firestore().batch();
    let count = 0;

    expiredCodes.forEach((doc) => {
      batch.delete(doc.ref);
      count++;
    });

    if (count > 0) {
      await batch.commit();
      console.log(`Cleaned up ${count} expired verification codes`);
    }

    return null;
  });
