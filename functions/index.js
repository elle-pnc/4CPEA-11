// Firebase Cloud Functions for Two-Step Verification
// This sends verification codes via email

const functions = require('firebase-functions');
const admin = require('firebase-admin');
const nodemailer = require('nodemailer');
const { defineSecret } = require('firebase-functions/params');

admin.initializeApp();

/** Same mapping as Commuter `src/firebase/rp4Taps.js` — used by tap + seat IR handlers */
const RP4_CARD_UID_TO_USER_ID = {
  '04151F02A51390': '9ij7y7Az7hcES9qmjFAySjqMWeP2',
  '04196702A51390': 'iJq7rGZsUcTZc6HeGAWcZUbHFWk1',
  '041E6502A51390': 'uIsKhAzJECgPVcwJnDePCP1E7Ok1',
  '04295B02A51390': 'Vc1owqvklzOV3PqkO4f98MsOb773',
  '042B5D02A51390': '1WevZnMhS8da4Gtd0j2mrzNM50H2',
  '042B6C02A51390': 'X4EdHVyllXO4RJkLgexzujFbjuU2',
};

function getUserIdFromCardUidRp4(cardUid) {
  if (!cardUid || typeof cardUid !== 'string') return null;
  const normalized = String(cardUid).trim().toUpperCase();
  return RP4_CARD_UID_TO_USER_ID[normalized] || null;
}

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

/**
 * Repair jeepney seat count if out of range (safety net for race conditions)
 * Runs every 5 minutes to clamp seatCount to [0, maxSeats]
 */
exports.repairJeepneySeatCount = functions.pubsub
  .schedule('*/5 * * * *') // Every 5 minutes
  .timeZone('Asia/Manila')
  .onRun(async () => {
    const jeepneysSnap = await admin.firestore().collection('jeepneys').get();
    for (const doc of jeepneysSnap.docs) {
      const data = doc.data();
      const maxSeats = Math.max(1, data.maxSeats || 2);
      const current = data.seatCount ?? 0;
      if (current < 0 || current > maxSeats) {
        const repaired = Math.max(0, Math.min(maxSeats, current));
        await doc.ref.update({
          seatCount: repaired,
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });
        console.log(`Repaired jeepney ${doc.id} seatCount: ${current} -> ${repaired}`);
      }
    }
    return null;
  });

/**
 * Process RP4 card taps automatically when new tap document is created
 * This ensures RTDB and Firestore lastTap are updated even when React app isn't open
 */
exports.processRp4Tap = functions.firestore
  .document('rp4_debug/{deviceId}/taps/{tapId}')
  .onCreate(async (snap, context) => {
    const tapData = snap.data();
    const deviceId = context.params.deviceId;
    const tapId = context.params.tapId;

    // Skip if already processed
    if (tapData.processed === true) {
      console.log(`Tap ${tapId} already processed, skipping`);
      return null;
    }

    console.log(`Processing tap ${tapId} for device ${deviceId}`, tapData);

    const calculateFare = (origin, destination) => {
      if (!origin || !destination || origin === destination) return 0;
      const fareTable = {
        '1-2': 15.00, '1-3': 30.00, '1-4': 45.00,
        '2-1': 15.00, '2-3': 15.00, '2-4': 30.00,
        '3-1': 30.00, '3-2': 15.00, '3-4': 15.00,
        '4-1': 45.00, '4-2': 30.00, '4-3': 15.00
      };
      const key = `${origin}-${destination}`;
      return fareTable[key] || 25.00;
    };

    const writeLastTap = async (deviceId, tapData, result) => {
      const now = new Date().toISOString();
      const lastTap = {
        uid: tapData.uid || '',
        deviceId: deviceId,
        known: result.known !== false,
        active: result.active === true,
        reason: result.reason || 'Unknown',
        name: result.name || '',
        source: tapData.source || 'acr1252u',
        ts: tapData.ts || Date.now(),
        sentAt: now
      };

      // Firestore: update rp4_debug/{deviceId} lastTap
      await admin.firestore().collection('rp4_debug').doc(deviceId).update({
        lastTap: lastTap,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });

      // RTDB: write to rp4/{deviceId}/lastTap
      await admin.database().ref(`rp4/${deviceId}/lastTap`).set({
        ...lastTap,
        updatedAt: Date.now()
      });

      console.log(`Updated lastTap for ${deviceId}:`, result);
    };

    const cardUid = (tapData.uid || '').trim().toUpperCase();
    const userId = getUserIdFromCardUidRp4(cardUid);
    const unknownResult = { known: false, active: false, reason: 'Unknown card', name: '' };

    if (!userId) {
      await writeLastTap(deviceId, tapData, unknownResult);
      await snap.ref.update({ processed: true, processedAt: admin.firestore.FieldValue.serverTimestamp() });
      return null;
    }

    // Get user from Firestore
    const userDoc = await admin.firestore().collection('users').doc(userId).get();
    if (!userDoc.exists) {
      await writeLastTap(deviceId, tapData, { ...unknownResult, reason: 'User not found' });
      await snap.ref.update({ processed: true, processedAt: admin.firestore.FieldValue.serverTimestamp() });
      return null;
    }

    const user = userDoc.data();
    const userName = [user.firstName, user.lastName].filter(Boolean).join(' ') || user.email || 'Passenger';
    const status = user.status || null;

    // Onboarded: alight at seat ends trip (processSeatEvent). Card tap does not end the trip.
    if (status === 'onboarded') {
      const result = {
        known: true,
        active: false,
        reason: 'Please alight to finish your trip. Tapping your card again does not end your ride.',
        name: userName
      };
      await writeLastTap(deviceId, tapData, result);
      await snap.ref.update({
        processed: true,
        processedAt: admin.firestore.FieldValue.serverTimestamp(),
        active: result.active,
        known: result.known,
        reason: result.reason,
        name: result.name
      });
      return null;
    }

    // Tap-in: user must be waiting
    if (status !== 'waiting') {
      const result = { known: true, active: false, reason: 'No pending trip. Select origin and destination first.', name: userName };
      await writeLastTap(deviceId, tapData, result);
      await snap.ref.update({ processed: true, processedAt: admin.firestore.FieldValue.serverTimestamp() });
      return null;
    }

    const route = user.currentRoute || { from: user.currentTerminal || 1, to: user.currentTerminal || 1 };
    const fare = calculateFare(route.from, route.to);

    try {
      const tapRef = snap.ref;
      // Single transaction: claim tap doc + deduct fare + queue for IR. Prevents double charge if a client also tries to process the same tap.
      const outcome = await admin.firestore().runTransaction(async (transaction) => {
        const tapSnap = await transaction.get(tapRef);
        if (tapSnap.data()?.processed === true) {
          return { kind: 'SKIP', reason: 'already_processed' };
        }

        const userRef = admin.firestore().collection('users').doc(userId);
        const jeepneyRef = admin.firestore().collection('jeepneys').doc('jeep1');
        const deviceRef = admin.firestore().collection('rp4_debug').doc(deviceId);
        const [userSnap, jeepneySnap, deviceSnap] = await Promise.all([
          transaction.get(userRef),
          transaction.get(jeepneyRef),
          transaction.get(deviceRef)
        ]);
        const freshUser = userSnap.exists ? userSnap.data() : null;
        if (freshUser?.status !== 'waiting') {
          return { kind: 'ERR', code: 'ALREADY_PROCESSED' };
        }
        const balance = Number(freshUser.balance ?? 0);
        if (balance < fare) {
          return { kind: 'ERR', code: 'INSUFFICIENT' };
        }
        const freshJeepney = jeepneySnap.exists ? jeepneySnap.data() : { seatCount: 0, maxSeats: 2 };
        const freshSeatCount = Math.max(0, freshJeepney.seatCount || 0);
        if (freshSeatCount >= (freshJeepney.maxSeats || 2)) {
          return { kind: 'ERR', code: 'JEEPNEY_FULL' };
        }

        const newBalance = balance - fare;
        transaction.update(userRef, {
          balance: admin.firestore.FieldValue.increment(-fare),
          status: 'boarding',
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });
        const devData = deviceSnap.exists ? deviceSnap.data() : {};
        const queue = Array.isArray(devData.boardingQueue) ? [...devData.boardingQueue] : [];
        queue.push({ userId, cardUid, queuedAt: Date.now() });
        transaction.update(deviceRef, {
          boardingQueue: queue,
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });
        transaction.update(tapRef, {
          processed: true,
          processedAt: admin.firestore.FieldValue.serverTimestamp(),
          active: false,
          known: true,
          reason: 'Fare paid. Take your seat.',
          name: userName
        });
        return { kind: 'OK', newBalance, route };
      });

      if (outcome.kind === 'SKIP') {
        console.log(`Tap ${tapId} already processed (transaction), skipping`);
        return null;
      }
      if (outcome.kind === 'ERR') {
        const reasonMap = {
          ALREADY_PROCESSED: 'Already tapped in. Tap detected twice.',
          INSUFFICIENT: 'Insufficient balance',
          JEEPNEY_FULL: 'Jeepney full'
        };
        const result = {
          known: true,
          active: false,
          reason: reasonMap[outcome.code] || 'Tap in failed',
          name: userName
        };
        await writeLastTap(deviceId, tapData, result);
        await snap.ref.update({
          processed: true,
          processedAt: admin.firestore.FieldValue.serverTimestamp(),
          active: result.active,
          known: result.known,
          reason: result.reason,
          name: result.name
        });
        return null;
      }

      await admin.firestore().collection('transactions').add({
        userId: userId,
        type: 'trip',
        amount: -fare,
        description: `Trip: Terminal ${route.from} → Terminal ${route.to}`,
        route: route,
        balanceAfter: outcome.newBalance,
        jeepneyId: 'jeep1',
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
        createdAt: admin.firestore.FieldValue.serverTimestamp()
      });

      const payResult = { known: true, active: false, reason: 'Fare paid. Take your seat.', name: userName };
      await writeLastTap(deviceId, tapData, payResult);

      console.log(`Tap-in payment for ${userName}, fare ₱${fare.toFixed(2)} deducted; awaiting IR occupied for seat count`);
      return null;
    } catch (err) {
      console.error('Tap-in error:', err);
      const result = { known: true, active: false, reason: err.message || 'Tap in failed', name: userName };
      await writeLastTap(deviceId, tapData, result);
      await snap.ref.update({ processed: true, processedAt: admin.firestore.FieldValue.serverTimestamp() });
      return null;
    }
  });

/**
 * Process seat events for tap-out: when a seat becomes "available", tap out the user who was in that seat
 */
exports.processSeatEvent = functions.firestore
  .document('rp4_debug/{deviceId}/seatEvents/{eventId}')
  .onCreate(async (snap, context) => {
    const eventData = snap.data();
    const deviceId = context.params.deviceId;
    const eventId = context.params.eventId;

    // --- IR seat occupied: increment seatCount + assign seat (mirror path of decrement) ---
    if (eventData.status === 'occupied') {
      const occType = eventData.event || '';
      if (occType !== 'ir_occupied' && occType !== 'BECAME_OCCUPIED') {
        console.log(`Seat event ${eventId} status occupied but event not ir_occupied (got ${occType}), skipping`);
        return null;
      }

      let seat = eventData.seatId || eventData.seat;
      if (!seat && eventId.includes('_')) {
        const parts = eventId.split('_');
        if (parts.length >= 2 && (parts[1] === 'seat1' || parts[1] === 'seat2')) seat = parts[1];
      }
      if (!seat || !seat.startsWith('seat')) {
        console.log(`Invalid seat in occupied event ${eventId}: ${seat}`);
        return null;
      }

      const writeLastTapFromSeat = async (tapUid, result) => {
        const now = new Date().toISOString();
        const lastTap = {
          uid: tapUid || '',
          deviceId: deviceId,
          known: result.known !== false,
          active: result.active === true,
          reason: result.reason || 'Unknown',
          name: result.name || '',
          source: eventData.source || 'ir',
          ts: eventData.tsMs || eventData.ts || Date.now(),
          sentAt: now
        };
        await admin.firestore().collection('rp4_debug').doc(deviceId).update({
          lastTap: lastTap,
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });
        await admin.database().ref(`rp4/${deviceId}/lastTap`).set({
          ...lastTap,
          updatedAt: Date.now()
        });
      };

      const deviceDoc = await admin.firestore().collection('rp4_debug').doc(deviceId).get();
      if (!deviceDoc.exists) {
        console.log(`Device ${deviceId} not found for occupied event`);
        return null;
      }

      const deviceDataPre = deviceDoc.data();
      const cardFromEvent = (eventData.uid || eventData.cardUid || '').trim().toUpperCase();
      let resolvedUserId = getUserIdFromCardUidRp4(cardFromEvent);
      let resolvedCardUid = cardFromEvent || null;

      const queue = Array.isArray(deviceDataPre.boardingQueue) ? [...deviceDataPre.boardingQueue] : [];
      if (!resolvedUserId && queue.length > 0) {
        const head = queue[0];
        if (head && head.userId) {
          resolvedUserId = head.userId;
          resolvedCardUid = (head.cardUid || '').trim().toUpperCase() || resolvedCardUid;
        }
      }

      if (!resolvedUserId) {
        console.log(`Occupied event ${eventId}: no user from uid/cardUid and empty boardingQueue`);
        return null;
      }

      const userDoc = await admin.firestore().collection('users').doc(resolvedUserId).get();
      if (!userDoc.exists) {
        console.log(`User ${resolvedUserId} not found for occupied event`);
        return null;
      }
      const user = userDoc.data();
      const userName = [user.firstName, user.lastName].filter(Boolean).join(' ') || user.email || 'Passenger';

      if (user.status !== 'boarding') {
        console.log(`User ${resolvedUserId} not in boarding (status: ${user.status}), skipping ir_occupied`);
        return null;
      }

      try {
        await admin.firestore().runTransaction(async (transaction) => {
          const userRef = admin.firestore().collection('users').doc(resolvedUserId);
          const jeepneyRef = admin.firestore().collection('jeepneys').doc('jeep1');
          const deviceRef = admin.firestore().collection('rp4_debug').doc(deviceId);

          const [userSnap, jeepneySnap, deviceSnap] = await Promise.all([
            transaction.get(userRef),
            transaction.get(jeepneyRef),
            transaction.get(deviceRef)
          ]);

          const freshUser = userSnap.exists ? userSnap.data() : null;
          if (freshUser?.status !== 'boarding') {
            return;
          }

          const freshJeepney = jeepneySnap.exists ? jeepneySnap.data() : { seatCount: 0, maxSeats: 2 };
          const currentSeatCount = Math.max(0, freshJeepney.seatCount || 0);
          const maxSeats = freshJeepney.maxSeats || 2;
          if (currentSeatCount >= maxSeats) {
            throw new Error('JEEPNEY_FULL');
          }

          const devData = deviceSnap.exists ? deviceSnap.data() : {};
          const seatData = devData[seat] || {};
          if (seatData.occupantUserId && seatData.occupantUserId !== resolvedUserId) {
            throw new Error('SEAT_TAKEN');
          }
          if (seatData.occupantUserId === resolvedUserId) {
            return; // idempotent
          }

          let newQueue = Array.isArray(devData.boardingQueue) ? [...devData.boardingQueue] : [];
          if (cardFromEvent) {
            newQueue = newQueue.filter((e) => e.userId !== resolvedUserId);
          } else {
            newQueue = newQueue.slice(1);
          }

          transaction.update(userRef, {
            status: 'onboarded',
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
          });

          transaction.update(jeepneyRef, {
            seatCount: currentSeatCount + 1,
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
          });

          transaction.update(deviceRef, {
            [seat]: {
              occupantUid: resolvedCardUid || cardFromEvent,
              occupantUserId: resolvedUserId,
              occupiedAt: admin.firestore.FieldValue.serverTimestamp()
            },
            [`${seat}UpdatedAt`]: admin.firestore.FieldValue.serverTimestamp(),
            boardingQueue: newQueue,
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
          });
        });

        const userAfter = await admin.firestore().collection('users').doc(resolvedUserId).get();
        if (!userAfter.exists || userAfter.data().status !== 'onboarded') {
          console.log(`ir_occupied ${eventId}: transaction skipped or no-op`);
          return null;
        }

        await writeLastTapFromSeat(resolvedCardUid || cardFromEvent, {
          known: true,
          active: true,
          reason: 'Boarded',
          name: userName
        });
        // Keep status: "occupied" on the event doc; add ack so Console shows it was handled
        await snap.ref.update({
          functionProcessedAt: admin.firestore.FieldValue.serverTimestamp(),
          functionResult: 'ir_occupied_applied'
        });
        console.log(`IR occupied: ${userName} seated at ${seat}, seatCount incremented`);
        return null;
      } catch (err) {
        if (err.message === 'JEEPNEY_FULL') {
          console.log(`Occupied event ${eventId}: jeepney full`);
        } else if (err.message === 'SEAT_TAKEN') {
          console.log(`Occupied event ${eventId}: seat already taken`);
        } else {
          console.error('IR occupied error:', err);
        }
        return null;
      }
    }

    // Only process ir_available (user got off) or legacy BECAME_AVAILABLE - skip boot_state, tap_reserved, etc.
    if (eventData.status !== 'available') {
      console.log(`Seat event ${eventId} is not an "available" event, skipping`);
      return null;
    }
    const eventType = eventData.event || '';
    if (eventType !== 'ir_available' && eventType !== 'BECAME_AVAILABLE') {
      console.log(`Seat event ${eventId} is not ir_available/BECAME_AVAILABLE (got ${eventType}), skipping`);
      return null;
    }

    // New schema uses seatId; parse from eventId if needed: {tsMs}_{seatId}_ir_available
    let seat = eventData.seatId || eventData.seat;
    if (!seat && eventId.includes('_')) {
      const parts = eventId.split('_');
      if (parts.length >= 2 && (parts[1] === 'seat1' || parts[1] === 'seat2')) seat = parts[1];
    }
    if (!seat || !seat.startsWith('seat')) {
      console.log(`Invalid seat in event ${eventId}: ${seat}`);
      return null;
    }

    console.log(`Processing seat event ${eventId}: ${seat} became available`);

    // Get device document to find who was in this seat
    const deviceDoc = await admin.firestore().collection('rp4_debug').doc(deviceId).get();
    if (!deviceDoc.exists) {
      console.log(`Device ${deviceId} not found`);
      return null;
    }

    const deviceData = deviceDoc.data();
    const seatData = deviceData[seat]; // e.g., deviceData.seat1 or deviceData.seat2

    if (!seatData || !seatData.occupantUserId) {
      console.log(`No occupant found in ${seat}, skipping tap-out`);
      return null;
    }

    const userId = seatData.occupantUserId; // Firebase Auth UID
    const cardUid = seatData.occupantUid; // Card UID for lastTap

    // Get user document
    const userDoc = await admin.firestore().collection('users').doc(userId).get();
    if (!userDoc.exists) {
      console.log(`User ${userId} not found`);
      return null;
    }

    const user = userDoc.data();
    const userName = [user.firstName, user.lastName].filter(Boolean).join(' ') || user.email || 'Passenger';

    // Only tap out if user is currently onboarded
    if (user.status !== 'onboarded') {
      console.log(`User ${userId} is not onboarded (status: ${user.status}), skipping tap-out`);
      return null;
    }

    try {
      const now = new Date().toISOString();
      const ts = eventData.tsMs || eventData.ts || Date.now();
      const lastTap = {
        uid: cardUid || '',
        deviceId: deviceId,
        known: true,
        active: true,
        reason: 'Tap out successful',
        name: userName,
        source: eventData.source || 'ir',
        ts: ts,
        sentAt: now
      };

      const userRef = admin.firestore().collection('users').doc(userId);
      const jeepneyRef = admin.firestore().collection('jeepneys').doc('jeep1');
      const deviceRef = admin.firestore().collection('rp4_debug').doc(deviceId);

      // Use transaction for atomic tap-out: prevents race when IR + card tap fire together,
      // or when two users tap out simultaneously (seat count going negative)
      await admin.firestore().runTransaction(async (transaction) => {
        const [userSnap, jeepneySnap] = await Promise.all([
          transaction.get(userRef),
          transaction.get(jeepneyRef)
        ]);

        const freshUser = userSnap.exists ? userSnap.data() : null;
        if (freshUser?.status !== 'onboarded') {
          console.log(`User ${userId} already tapped out (status: ${freshUser?.status}), skipping`);
          return;
        }

        const freshJeepney = jeepneySnap.exists ? jeepneySnap.data() : { seatCount: 0, maxSeats: 2 };
        const currentSeatCount = Math.max(0, freshJeepney.seatCount || 0);
        const newSeatCount = currentSeatCount > 0 ? currentSeatCount - 1 : 0;

        transaction.update(userRef, {
          status: null,
          currentRoute: null,
          currentRideExtended: false,
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });

        transaction.update(jeepneyRef, {
          seatCount: newSeatCount,
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });

        transaction.update(deviceRef, {
          [seat]: {
            occupantUid: null,
            occupantUserId: null,
            occupiedAt: null
          },
          [`${seat}UpdatedAt`]: admin.firestore.FieldValue.serverTimestamp(),
          lastTap: lastTap,
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });
      });

      await admin.database().ref(`rp4/${deviceId}/lastTap`).set({
        ...lastTap,
        updatedAt: Date.now()
      });

      await snap.ref.update({
        functionProcessedAt: admin.firestore.FieldValue.serverTimestamp(),
        functionResult: 'ir_available_applied'
      });
      console.log(`Tap-out successful for ${userName} from ${seat}`);
      return null;
    } catch (err) {
      console.error('Seat event tap-out error:', err);
      return null;
    }
  });
