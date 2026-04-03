/**
 * RP4 Tap-in / Tap-out integration
 * Structure: Firestore rp4_debug / cpe11-afcs document with:
 * - lastTap: map (result for RP4 to read: active, known, reason, name, uid, ts, deviceId, source, sentAt)
 * - taps: subcollection (historical tap events; RP4 writes new docs here)
 */
import {
  doc,
  collection,
  getDoc,
  updateDoc,
  onSnapshot,
  query,
  orderBy,
  limit,
  serverTimestamp
} from 'firebase/firestore'
import { ref, set } from 'firebase/database'
import { db, realtimeDb } from './config'
import {
  getUser,
  getJeepney,
  updateUserBalance,
  updateUserStatus,
  updateUserRoute,
  updateJeepneySeatCount,
  addTransaction
} from './firestore'
import { calculateFare } from '../utils/fareCalculator'

// RP4 Firestore paths (from your structure)
export const RP4_COLLECTION = 'rp4_debug'
export const RP4_DEVICE_ID = 'cpe11-afcs'

/**
 * Predefined card UID → Firebase Auth UID mapping
 */
export const CARD_UID_TO_USER_ID = {
  '04151F02A51390': '9ij7y7Az7hcES9qmjFAySjqMWeP2',   // minajustin613@gmail.com
  '04196702A51390': 'iJq7rGZsUcTZc6HeGAWcZUbHFWk1',   // mananquilivankier23@gmail.com
  '041E6502A51390': 'uIsKhAzJECgPVcwJnDePCP1E7Ok1',   // galangreniel68@gmail.com
  '04295B02A51390': 'Vc1owqvklzOV3PqkO4f98MsOb773',   // avelinomedwin24@gmail.com
  '042B5D02A51390': '1WevZnMhS8da4Gtd0j2mrzNM50H2',   // cadangjohnlloyd92@gmail.com
  '042B6C02A51390': 'X4EdHVyllXO4RJkLgexzujFbjuU2'    // johnlloydcadang@gmail.com
}

export function getRp4DocRef(deviceId = RP4_DEVICE_ID) {
  return doc(db, RP4_COLLECTION, deviceId)
}

export function getTapsRef(deviceId = RP4_DEVICE_ID) {
  return collection(db, RP4_COLLECTION, deviceId, 'taps')
}

export function getSeatEventsRef(deviceId = RP4_DEVICE_ID) {
  return collection(db, RP4_COLLECTION, deviceId, 'seatEvents')
}

/**
 * Resolve card UID to Firebase Auth UID
 * @param {string} cardUid
 * @returns {string|null} userId or null if unknown
 */
export function getUserIdFromCardUid(cardUid) {
  if (!cardUid || typeof cardUid !== 'string') return null
  const normalized = cardUid.trim().toUpperCase()
  return CARD_UID_TO_USER_ID[normalized] ?? null
}

/** Reverse map: Firebase Auth UID → card UID (for commuter app to match lastTap to current user) */
const USER_ID_TO_CARD_UID = Object.fromEntries(
  Object.entries(CARD_UID_TO_USER_ID).map(([cardUid, userId]) => [userId, cardUid])
)

export function getCardUidForUser(userId) {
  if (!userId || typeof userId !== 'string') return null
  return USER_ID_TO_CARD_UID[userId] ?? null
}

/**
 * Write tap result to lastTap so RP4 can read it (Firestore + RTDB)
 * @param {string} deviceId
 * @param {object} tapData - original tap from RP4 (uid, deviceId, ts, source, sentAt)
 * @param {object} result - { active: boolean, known: boolean, reason: string, name?: string }
 */
export async function writeLastTap(deviceId, tapData, result) {
  const now = new Date().toISOString()
  const lastTap = {
    uid: tapData.uid || '',
    deviceId: deviceId,
    known: result.known ?? true,
    active: result.active ?? false,
    reason: result.reason || 'Unknown',
    name: result.name || '',
    source: tapData.source || 'acr1252u',
    ts: tapData.ts ?? Date.now(),
    sentAt: now
  }

  // Firestore (rp4_debug / cpe11-afcs document)
  const fsRef = getRp4DocRef(deviceId)
  await updateDoc(fsRef, {
    lastTap,
    updatedAt: serverTimestamp()
  })

  // RTDB (rp4/{deviceId}/lastTap) so RP4 can read from Realtime Database
  try {
    const rtdbPath = `rp4/${deviceId}/lastTap`
    await set(ref(realtimeDb, rtdbPath), { ...lastTap, updatedAt: Date.now() })
  } catch (e) {
    console.warn('RTDB lastTap write failed (Firestore updated):', e)
  }
}

/**
 * Update a tap document with processed result (for history)
 */
export async function markTapProcessed(deviceId, tapDocId, result) {
  const tapRef = doc(db, RP4_COLLECTION, deviceId, 'taps', tapDocId)
  await updateDoc(tapRef, {
    processed: true,
    processedAt: serverTimestamp(),
    active: result.active,
    known: result.known,
    reason: result.reason,
    name: result.name || null
  })
}

/**
 * Process a single tap from RP4: resolve user, run tap-in or tap-out, write lastTap
 * @param {string} tapDocId - document ID in taps subcollection
 * @param {object} tapData - { uid, deviceId, ts, source, sentAt, ... }
 * @param {object} [jeepney] - current jeepney (seatCount, maxSeats); if omitted, fetched from Firestore
 * @returns {Promise<object>} result { active, known, reason, name }
 */
export async function processTap(tapDocId, tapData, jeepney) {
  const deviceId = tapData.deviceId || RP4_DEVICE_ID
  const j = jeepney ?? await getJeepney('jeep1')
  const cardUid = (tapData.uid || '').trim().toUpperCase()

  const unknownResult = {
    known: false,
    active: false,
    reason: 'Unknown card',
    name: ''
  }

  const userId = getUserIdFromCardUid(cardUid)
  if (!userId) {
    await writeLastTap(deviceId, tapData, unknownResult)
    await markTapProcessed(deviceId, tapDocId, unknownResult).catch(() => {})
    return unknownResult
  }

  const user = await getUser(userId)
  if (!user) {
    await writeLastTap(deviceId, tapData, { ...unknownResult, reason: 'User not found' })
    await markTapProcessed(deviceId, tapDocId, unknownResult).catch(() => {})
    return unknownResult
  }

  const userName = [user.firstName, user.lastName].filter(Boolean).join(' ') || user.email || 'Passenger'
  const status = user.status || null

  // Tap-out: user is onboarded
  if (status === 'onboarded') {
    try {
      // Double-tap guard: reject tap-out if user tapped in less than 3 seconds ago
      const deviceDoc = await getDoc(getRp4DocRef(deviceId))
      const deviceData = deviceDoc.exists() ? deviceDoc.data() : {}
      const seat1 = deviceData.seat1 || {}
      const seat2 = deviceData.seat2 || {}
      const occupiedAt = (seat1.occupantUserId === userId ? seat1.occupiedAt : null) ||
        (seat2.occupantUserId === userId ? seat2.occupiedAt : null)
      if (occupiedAt) {
        const occupiedMs = occupiedAt.toDate ? occupiedAt.toDate().getTime() : (occupiedAt._seconds || 0) * 1000
        const elapsedMs = Date.now() - occupiedMs
        if (elapsedMs < 3000) {
          const result = { known: true, active: false, reason: 'Already tapped in. Wait 3 seconds before tapping out.', name: userName }
          await writeLastTap(deviceId, tapData, result)
          await markTapProcessed(deviceId, tapDocId, result).catch(() => {})
          return result
        }
      }

      const route = user.currentRoute || { from: 1, to: 1 }
      await updateUserStatus(userId, null)
      await updateUserRoute(userId, null)
      const currentSeatCount = Math.max(0, j?.seatCount ?? 0)
      if (currentSeatCount > 0) {
        await updateJeepneySeatCount('jeep1', currentSeatCount - 1)
      }
      const result = { known: true, active: true, reason: 'Tap out successful', name: userName }
      await writeLastTap(deviceId, tapData, result)
      await markTapProcessed(deviceId, tapDocId, result).catch(() => {})
      return result
    } catch (err) {
      console.error('RP4 tap-out error:', err)
      const result = { known: true, active: false, reason: err.message || 'Tap out failed', name: userName }
      await writeLastTap(deviceId, tapData, result)
      await markTapProcessed(deviceId, tapDocId, result).catch(() => {})
      return result
    }
  }

  // Tap-in: user must be waiting
  if (status !== 'waiting') {
    const result = {
      known: true,
      active: false,
      reason: 'No pending trip. Select origin and destination first.',
      name: userName
    }
    await writeLastTap(deviceId, tapData, result)
    await markTapProcessed(deviceId, tapDocId, result).catch(() => {})
    return result
  }

  const route = user.currentRoute || { from: user.currentTerminal || 1, to: user.currentTerminal || 1 }
  const fare = calculateFare(route.from, route.to)
  const balance = user.balance ?? 250
  const currentSeatCount = Math.max(0, j?.seatCount ?? 0)
  const maxSeats = j?.maxSeats ?? 2

  if (balance < fare) {
    const result = { known: true, active: false, reason: 'Insufficient balance', name: userName }
    await writeLastTap(deviceId, tapData, result)
    await markTapProcessed(deviceId, tapDocId, result).catch(() => {})
    return result
  }

  if (currentSeatCount >= maxSeats) {
    const result = { known: true, active: false, reason: 'Jeepney full', name: userName }
    await writeLastTap(deviceId, tapData, result)
    await markTapProcessed(deviceId, tapDocId, result).catch(() => {})
    return result
  }

  try {
    await updateUserBalance(userId, -fare)
    await updateUserStatus(userId, 'onboarded')
    await updateJeepneySeatCount('jeep1', currentSeatCount + 1)
    const newBalance = balance - fare
    await addTransaction(userId, {
      type: 'trip',
      amount: -fare,
      description: `Trip: Terminal ${route.from} → Terminal ${route.to}`,
      route,
      balanceAfter: newBalance,
      jeepneyId: 'jeep1'
    })
    const result = { known: true, active: true, reason: 'Valid card', name: userName }
    await writeLastTap(deviceId, tapData, result)
    await markTapProcessed(deviceId, tapDocId, result).catch(() => {})
    return result
  } catch (err) {
    console.error('RP4 tap-in error:', err)
    const result = { known: true, active: false, reason: err.message || 'Tap in failed', name: userName }
    await writeLastTap(deviceId, tapData, result)
    await markTapProcessed(deviceId, tapDocId, result).catch(() => {})
    return result
  }
}

/**
 * Subscribe to lastTap on the RP4 device doc. When lastTap is for the given user's card and active,
 * call onTapInSuccess(lastTap). Used by the commuter app to show "You're tapped in!" when card is read on RP4.
 *
 * @param {string} deviceId
 * @param {string} userId - Firebase Auth UID of the current user
 * @param {function} onTapInSuccess - (lastTap) => void
 * @returns {function} unsubscribe
 */
export function subscribeToLastTapForUser(deviceId, userId, onTapInSuccess) {
  if (!userId) return () => {}
  const myCardUid = getCardUidForUser(userId)
  if (!myCardUid) return () => {}

  const ref = getRp4DocRef(deviceId)
  const lastSeenTsRef = { current: 0 }

  return onSnapshot(ref, (docSnap) => {
    if (!docSnap.exists()) return
    const data = docSnap.data()
    const lastTap = data?.lastTap
    if (!lastTap || lastTap.uid !== myCardUid || lastTap.active !== true) return
    if (lastTap.reason === 'Tap out successful') return // Only fire for tap-in, not tap-out
    const ts = lastTap.ts || 0
    if (ts <= lastSeenTsRef.current) return
    lastSeenTsRef.current = ts
    onTapInSuccess(lastTap)
  }, (err) => {
    console.error('RP4 lastTap subscription error:', err)
  })
}

/**
 * Subscribe to seatEvents for ir_available (firmware tap-out).
 * When firmware writes ir_available (user got off seat), call onTapOutSuccess(route).
 * Matches firmware path: rp4_debug/{deviceId}/seatEvents/{eventId}
 * Event format: event="ir_available", status="available", seatId="seat1"|"seat2"
 * eventId format: {tsMs}_{seatId}_ir_available
 */
export function subscribeToSeatEventsForUser(deviceId, userId, onTapOutSuccess) {
  if (!userId) return () => {}
  const seatEventsRef = getSeatEventsRef(deviceId)
  let hasInitialized = false
  /** Avoid double callback when firmware adds multiple events or getDoc + getUser both match */
  let lastTapOutNotifiedAt = 0
  const notifyTapOutOnce = () => {
    const now = Date.now()
    if (now - lastTapOutNotifiedAt < 3500) return
    lastTapOutNotifiedAt = now
    onTapOutSuccess()
  }
  return onSnapshot(seatEventsRef, (snapshot) => {
    if (!hasInitialized) {
      hasInitialized = true
      return
    }
    snapshot.docChanges().forEach((change) => {
      if (change.type !== 'added') return
      const data = change.doc.data()
      if (data.event !== 'ir_available' || data.status !== 'available') return
      const seatId = data.seatId || (() => { const p = change.doc.id.split('_'); return p.length >= 2 ? p[1] : null })()
      if (!seatId) return
      // Check if current user was in this seat (read rp4_debug; Cloud Function may have cleared it)
      getDoc(getRp4DocRef(deviceId)).then((deviceSnap) => {
        if (!deviceSnap.exists()) return
        const deviceData = deviceSnap.data()
        const seatData = deviceData[seatId]
        if (seatData?.occupantUserId === userId) {
          notifyTapOutOnce()
          return
        }
        // Seat may be cleared (Cloud Function ran first); refetch user to confirm tap-out
        getUser(userId).then((user) => {
          if (user?.status === null) notifyTapOutOnce()
        }).catch(() => {})
      }).catch((err) => console.error('Seat event tap-out check error:', err))
    })
  }, (err) => {
    console.error('RP4 seatEvents subscription error:', err)
  })
}

/**
 * Subscribe to new taps for a device and process them (call with processTap callback).
 * Firestore: ensure an index exists on rp4_debug/{deviceId}/taps with field 'ts' descending
 * (Firebase Console will prompt to create it on first run if missing).
 *
 * @param {string} deviceId
 * @param {function} onTap - (tapDocId, tapData) => Promise
 * @returns {function} unsubscribe
 */
export function subscribeToTaps(deviceId, onTap) {
  const tapsRef = getTapsRef(deviceId)
  const q = query(
    tapsRef,
    orderBy('ts', 'desc'),
    limit(50)
  )

  const processedIds = new Set()

  return onSnapshot(q, (snapshot) => {
    snapshot.docChanges().forEach((change) => {
      if (change.type !== 'added') return
      const tapDoc = change.doc
      const data = tapDoc.data()
      if (data.processed === true) return
      if (processedIds.has(tapDoc.id)) return
      processedIds.add(tapDoc.id)
      onTap(tapDoc.id, { ...data, tapDocId: tapDoc.id }).catch((err) => {
        console.error('Error processing tap', tapDoc.id, err)
        processedIds.delete(tapDoc.id)
      })
    })
  }, (err) => {
    console.error('RP4 taps subscription error:', err)
  })
}
