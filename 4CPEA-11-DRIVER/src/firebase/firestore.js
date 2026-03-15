import {
  collection,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  setDoc,
  updateDoc,
  where,
  orderBy,
  limit,
  addDoc,
  serverTimestamp,
  increment,
  Timestamp,
} from 'firebase/firestore'
import { db } from './config'

const COLLECTIONS = {
  VERIFICATION_CODES: 'verificationCodes',
  USERS: 'users',
  DRIVER_SHIFTS: 'driverShifts',
  TRANSACTIONS: 'transactions',
  DRIVER_EXPENSES: 'driverExpenses',
}

/** Get user role from Firestore. Returns 'admin'|'driver'|'commuter'|null */
export const getUserRole = async (userId) => {
  if (!userId) return null
  try {
    const userRef = doc(db, COLLECTIONS.USERS, userId)
    const snap = await getDoc(userRef)
    if (snap.exists()) {
      const role = snap.data()?.role
      return role === 'admin' || role === 'driver' || role === 'commuter' ? role : null
    }
    return null
  } catch {
    return null
  }
}

const generateDeviceToken = () => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  let token = ''
  for (let i = 0; i < 32; i += 1) {
    token += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return token
}

const getDeviceInfo = () => {
  const userAgent = navigator.userAgent || ''
  const platform = navigator.platform || ''

  let deviceType = 'Unknown'
  let browser = 'Unknown'

  if (userAgent.includes('Chrome')) browser = 'Chrome'
  else if (userAgent.includes('Firefox')) browser = 'Firefox'
  else if (userAgent.includes('Safari')) browser = 'Safari'
  else if (userAgent.includes('Edge')) browser = 'Edge'

  if (platform.includes('Win')) deviceType = 'Windows'
  else if (platform.includes('Mac')) deviceType = 'Mac'
  else if (platform.includes('Linux')) deviceType = 'Linux'
  else if (platform.includes('iPhone') || platform.includes('iPad')) deviceType = 'iOS'
  else if (platform.includes('Android')) deviceType = 'Android'

  return {
    browser,
    deviceType,
    userAgent: userAgent.substring(0, 100),
  }
}

export const saveTrustedDevice = async (userId, deviceToken = null, expiresInDays = 30) => {
  const token = deviceToken || generateDeviceToken()
  const deviceInfo = getDeviceInfo()
  const expiresAt = new Date()
  expiresAt.setDate(expiresAt.getDate() + expiresInDays)

  const deviceRef = doc(db, COLLECTIONS.USERS, userId, 'trustedDevices', token)
  await setDoc(
    deviceRef,
    {
      token,
      userId,
      createdAt: serverTimestamp(),
      lastUsedAt: serverTimestamp(),
      expiresAt,
      deviceInfo,
    },
    { merge: true }
  )

  localStorage.setItem(`deviceToken_${userId}`, token)
  return token
}

export const checkTrustedDevice = async (userId, deviceToken) => {
  if (!deviceToken || !userId) return null

  try {
    const deviceRef = doc(db, COLLECTIONS.USERS, userId, 'trustedDevices', deviceToken)
    const deviceSnap = await getDoc(deviceRef)

    if (!deviceSnap.exists()) {
      localStorage.removeItem(`deviceToken_${userId}`)
      return null
    }

    const deviceData = deviceSnap.data()
    if (deviceData.deleted) {
      localStorage.removeItem(`deviceToken_${userId}`)
      return null
    }

    const expiresAt = deviceData.expiresAt?.toDate?.() || new Date(deviceData.expiresAt)
    if (expiresAt < new Date()) {
      localStorage.removeItem(`deviceToken_${userId}`)
      return null
    }

    await updateDoc(deviceRef, { lastUsedAt: serverTimestamp() })
    return { token: deviceToken, ...deviceData }
  } catch (error) {
    if (error.code === 'permission-denied') {
      return null
    }
    throw error
  }
}

export const verifyCode = async (email, code) => {
  try {
    const codeRef = doc(db, COLLECTIONS.VERIFICATION_CODES, email)
    const codeSnap = await getDoc(codeRef)

    if (!codeSnap.exists()) {
      return { valid: false, error: 'Verification code not found' }
    }

    const data = codeSnap.data()
    const expiresAt = data.expiresAt?.toDate?.() || new Date(data.expiresAt)
    if (expiresAt && new Date() > expiresAt) {
      await updateDoc(codeRef, { used: true })
      return { valid: false, error: 'Verification code has expired' }
    }

    if (data.used) {
      return { valid: false, error: 'Verification code already used' }
    }

    if (data.attempts >= 5) {
      await updateDoc(codeRef, { used: true })
      return { valid: false, error: 'Too many failed attempts' }
    }

    if (data.code !== code) {
      await updateDoc(codeRef, { attempts: increment(1) })
      return { valid: false, error: 'Invalid verification code' }
    }

    await updateDoc(codeRef, { used: true, verifiedAt: serverTimestamp() })
    return { valid: true }
  } catch (error) {
    return { valid: false, error: 'Verification failed' }
  }
}

export const deleteVerificationCode = async (email) => {
  try {
    const codeRef = doc(db, COLLECTIONS.VERIFICATION_CODES, email)
    await updateDoc(codeRef, { used: true })
  } catch (error) {
    // ignore missing
  }
}

export const getUsersByStatus = async (status) => {
  const usersRef = collection(db, COLLECTIONS.USERS)
  const q = query(usersRef, where('status', '==', status))
  const snapshot = await getDocs(q)
  return snapshot.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }))
}

export const subscribeUsersByStatus = (status, callback) => {
  const usersRef = collection(db, COLLECTIONS.USERS)
  const q = query(usersRef, where('status', '==', status))
  return onSnapshot(q, (snapshot) => {
    const users = snapshot.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }))
    callback(users)
  })
}

/**
 * Check if a user has extended their route today (has multiple trip transactions)
 * @param {string} userId - User ID
 * @returns {Promise<boolean>} True if user has extended
 */
export const checkUserHasExtended = async (userId) => {
  try {
    const { start, end } = getManilaDayRange()
    const startTimestamp = Timestamp.fromDate(start)
    const endTimestamp = Timestamp.fromDate(end)
    
    const txRef = collection(db, COLLECTIONS.TRANSACTIONS)
    const q = query(
      txRef,
      where('userId', '==', userId),
      where('type', '==', 'trip'),
      where('timestamp', '>=', startTimestamp),
      where('timestamp', '<=', endTimestamp)
    )
    
    const snapshot = await getDocs(q)
    // If user has 2+ trip transactions today, they've extended
    return snapshot.size >= 2
  } catch (error) {
    console.error('Error checking if user extended:', error.message)
    return false
  }
}

/**
 * Subscribe to trip transactions for a specific user today
 * Used to detect when a user extends their route
 * @param {string} userId - User ID
 * @param {Function} callback - Callback function that receives the count of trip transactions
 * @returns {Function} Unsubscribe function
 */
export const subscribeUserTripTransactions = (userId, callback) => {
  if (!userId) {
    callback(0)
    return () => {}
  }
  
  const { start, end } = getManilaDayRange()
  const startTimestamp = Timestamp.fromDate(start)
  const endTimestamp = Timestamp.fromDate(end)
  
  const txRef = collection(db, COLLECTIONS.TRANSACTIONS)
  const q = query(
    txRef,
    where('userId', '==', userId),
    where('type', '==', 'trip'),
    where('timestamp', '>=', startTimestamp),
    where('timestamp', '<=', endTimestamp)
  )
  
  return onSnapshot(q, (snapshot) => {
    // Return the count of trip transactions (2+ means extended)
    callback(snapshot.size)
  }, (error) => {
    console.error('Error listening to user trip transactions:', error.message)
    callback(0)
  })
}

export const getActiveShift = async (userId) => {
  const shiftsRef = collection(db, COLLECTIONS.DRIVER_SHIFTS)
  const q = query(
    shiftsRef,
    where('userId', '==', userId),
    where('status', '==', 'active'),
    orderBy('startAt', 'desc'),
    limit(1)
  )
  const snapshot = await getDocs(q)
  if (snapshot.empty) return null
  const docSnap = snapshot.docs[0]
  return { id: docSnap.id, ...docSnap.data() }
}

/**
 * Subscribe to the driver's active shift in real-time.
 * Keeps shift state in sync when app is reopened or when shift changes.
 * @param {string} userId - Driver user ID
 * @param {Function} callback - Called with (activeShift | null)
 * @returns {Function} Unsubscribe function
 */
export const subscribeActiveShift = (userId, callback) => {
  const shiftsRef = collection(db, COLLECTIONS.DRIVER_SHIFTS)
  const q = query(
    shiftsRef,
    where('userId', '==', userId),
    where('status', '==', 'active'),
    orderBy('startAt', 'desc'),
    limit(1)
  )
  return onSnapshot(q, (snapshot) => {
    if (snapshot.empty) {
      callback(null)
      return
    }
    const docSnap = snapshot.docs[0]
    callback({ id: docSnap.id, ...docSnap.data() })
  }, (error) => {
    console.error('Error listening to active shift:', error.message)
    callback(null)
  })
}

export const startShift = async (userId, startAtLocal) => {
  const shiftsRef = collection(db, COLLECTIONS.DRIVER_SHIFTS)
  const docRef = await addDoc(shiftsRef, {
    userId,
    status: 'active',
    startAt: serverTimestamp(),
    startAtLocal: startAtLocal || null,
    endAt: null,
    endAtLocal: null,
    createdAt: serverTimestamp(),
  })
  // Set jeep1 active so it appears on commuter app (merge in case doc doesn't exist yet)
  const jeepneyRef = doc(db, 'jeepneys', 'jeep1')
  await setDoc(jeepneyRef, { isActive: true, updatedAt: serverTimestamp() }, { merge: true })
  return docRef.id
}

export const endShift = async (shiftId, endAtLocal) => {
  const shiftRef = doc(db, COLLECTIONS.DRIVER_SHIFTS, shiftId)
  await updateDoc(shiftRef, {
    status: 'ended',
    endAt: serverTimestamp(),
    endAtLocal: endAtLocal || null,
    updatedAt: serverTimestamp(),
  })
  // Set jeep1 inactive so it is greyed out on commuter app (merge in case doc doesn't exist yet)
  const jeepneyRef = doc(db, 'jeepneys', 'jeep1')
  await setDoc(jeepneyRef, { isActive: false, updatedAt: serverTimestamp() }, { merge: true })
}

const getManilaDayRange = () => {
  const now = new Date()
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Manila',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(now)

  const getPart = (type) => parts.find((part) => part.type === type)?.value
  const year = Number(getPart('year'))
  const month = Number(getPart('month'))
  const day = Number(getPart('day'))

  const startUtc = Date.UTC(year, month - 1, day, 0, 0, 0) - 8 * 60 * 60 * 1000
  const endUtc = startUtc + 24 * 60 * 60 * 1000

  return {
    start: new Date(startUtc),
    end: new Date(endUtc),
  }
}

export const subscribeDailyPassengerCount = (callback) => {
  const { start, end } = getManilaDayRange()
  const startTimestamp = Timestamp.fromDate(start)
  const endTimestamp = Timestamp.fromDate(end)
  
  // Get all trip transactions for today
  const txRef = collection(db, COLLECTIONS.TRANSACTIONS)
  const txQuery = query(
    txRef,
    where('type', '==', 'trip'),
    where('timestamp', '>=', startTimestamp),
    where('timestamp', '<=', endTimestamp)
  )
  
  // Get all users to check their status
  const usersRef = collection(db, COLLECTIONS.USERS)
  
  // Track trip transactions and user statuses
  let tripTransactionsByUser = new Map() // userId -> array of {transactionId, timestamp, route}
  let userStatuses = new Map() // userId -> current status
  // Count tap-out events (completed trips). Each tap-out = +1. Same user can have multiple rides.
  // Extend creates extra transactions but only 1 tap-out per ride.
  let completedTripCount = 0
  const initialCountedUsers = new Set() // Users we've already counted for initial state

  // Count completed rides from transactions. Each tap-in = 1 ride when user has tapped out.
  // Extend creates 2 txs for 1 ride - detect via description containing "extend" (en/es).
  const countCompletedRidesFromTransactions = (transactions) => {
    if (!transactions || transactions.length === 0) return 0
    let rides = 1
    for (let i = 1; i < transactions.length; i++) {
      const desc = (transactions[i].description || '').toLowerCase()
      if (!desc.includes('extend')) {
        rides += 1
      }
    }
    return rides
  }
  
  const txUnsubscribe = onSnapshot(txQuery, (snapshot) => {
    tripTransactionsByUser.clear()
    
    snapshot.forEach((doc) => {
      const data = doc.data()
      const userId = data.userId
      if (userId) {
        if (!tripTransactionsByUser.has(userId)) {
          tripTransactionsByUser.set(userId, [])
        }
        const timestamp = data.timestamp?.toDate ? data.timestamp.toDate() : new Date(data.timestamp)
        const route = data.route || null
        const description = (data.description || '').toString()
        tripTransactionsByUser.get(userId).push({
          transactionId: doc.id,
          timestamp,
          route,
          description
        })
      }
    })
    
    tripTransactionsByUser.forEach((transactions) => {
      transactions.sort((a, b) => a.timestamp - b.timestamp)
    })
    
    // Initial load: users already tapped out when we start. Count completed rides (handles multiple rides + extend).
    tripTransactionsByUser.forEach((transactions, userId) => {
      if (!userStatuses.has(userId)) return // Haven't seen this user's status yet
      const status = userStatuses.get(userId)
      if ((status === null || status === undefined) && !initialCountedUsers.has(userId)) {
        initialCountedUsers.add(userId)
        completedTripCount += countCompletedRidesFromTransactions(transactions)
      }
    })
    
    callback(completedTripCount)
  }, (error) => {
    console.error('Error listening to trip transactions:', error.message)
    callback(0)
  })
  
  const usersUnsubscribe = onSnapshot(usersRef, (snapshot) => {
    // Use docChanges() to reliably detect status changes (tap-out = onboarded → null)
    snapshot.docChanges().forEach((change) => {
      const doc = change.doc
      const userId = doc.id
      const newStatus = doc.data().status
      const oldStatus = userStatuses.get(userId)
      
      userStatuses.set(userId, newStatus)
      
      // Each tap-out (onboarded → null) = 1 completed trip. Same user can tap out multiple times.
      if (oldStatus === 'onboarded' && (newStatus === null || newStatus === undefined)) {
        completedTripCount += 1
        initialCountedUsers.add(userId) // Prevent tx listener from double-counting this user
      }
      
      // Initial load (type 'added'): user already tapped out when we first see them
      if (change.type === 'added' && (newStatus === null || newStatus === undefined) && !initialCountedUsers.has(userId)) {
        const transactions = tripTransactionsByUser.get(userId) || []
        if (transactions.length > 0) {
          initialCountedUsers.add(userId)
          completedTripCount += countCompletedRidesFromTransactions(transactions)
        }
      }
    })
    // Sync userStatuses from full snapshot so we have correct state for next snapshot (for oldStatus)
    snapshot.docs.forEach((doc) => {
      userStatuses.set(doc.id, doc.data().status)
    })
    callback(completedTripCount)
  }, (error) => {
    console.error('Error listening to users:', error.message)
  })
  
  // Return unsubscribe function for both listeners
  return () => {
    txUnsubscribe()
    usersUnsubscribe()
  }
}

/**
 * Subscribe to daily revenue (sum of all trip transaction amounts for today)
 * Revenue is calculated from trip transactions (amounts are negative, so we take absolute value)
 * Resets at 00:00 Manila time and lasts until 23:59
 * @param {Function} callback - Callback function that receives the total revenue
 * @returns {Function} Unsubscribe function
 */
export const subscribeDailyRevenue = (callback) => {
  const { start, end } = getManilaDayRange()
  const txRef = collection(db, COLLECTIONS.TRANSACTIONS)
  const q = query(
    txRef,
    where('type', '==', 'trip'),
    where('timestamp', '>=', start),
    where('timestamp', '<', end)
  )

  return onSnapshot(q, (snapshot) => {
    let totalRevenue = 0
    snapshot.forEach((doc) => {
      const data = doc.data()
      const amount = data.amount || 0
      // Trip amounts are negative (fare deduction), so we take absolute value for revenue
      totalRevenue += Math.abs(amount)
    })
    callback(totalRevenue)
  })
}

/**
 * Subscribe to jeepney data (seatCount, etc.)
 * @param {string} jeepneyId - Jeepney ID (default: 'jeep1')
 * @param {Function} callback - Callback function that receives jeepney data
 * @returns {Function} Unsubscribe function
 */
export const subscribeJeepney = (jeepneyId = 'jeep1', callback) => {
  const jeepneyRef = doc(db, 'jeepneys', jeepneyId)
  return onSnapshot(jeepneyRef, (docSnap) => {
    if (docSnap.exists()) {
      callback({ id: docSnap.id, ...docSnap.data() })
    } else {
      // If jeepney doesn't exist, return default values
      callback({ id: jeepneyId, seatCount: 0, maxSeats: 2 })
    }
  }, (error) => {
    console.error('Error listening to jeepney:', error.message)
    // On error, return default values
    callback({ id: jeepneyId, seatCount: 0, maxSeats: 2 })
  })
}

const RP4_DEVICE_ID = 'cpe11-afcs'
const GPS_CURRENT_REF = () => doc(db, 'rp4_debug', RP4_DEVICE_ID, 'gps', 'current')
const GPS_MANUAL_REF = () => doc(db, 'rp4_debug', RP4_DEVICE_ID, 'gps', 'manual')

/**
 * Subscribe to current terminal for the jeepney.
 * Manual vs GPS source is controlled by the driver's preference stored in gps/manual.preferredSource.
 * - preferredSource === 'gps'  -> always use GPS value
 * - preferredSource === 'manual' or undefined -> manual overrides GPS
 * @param {Function} callback - Called with (terminal: number | 'unknown' | null)
 * @returns {Function} Unsubscribe
 */
export const subscribeCurrentTerminal = (callback) => {
  let manualTerminal = null
  let gpsTerminal = null
  let preferredSource = 'manual'

  const computeValue = () => {
    if (preferredSource === 'gps') {
      return gpsTerminal
    }
    return manualTerminal !== null ? manualTerminal : gpsTerminal
  }

  const notify = () => {
    callback(computeValue())
  }

  const unsubManual = onSnapshot(GPS_MANUAL_REF(), (snap) => {
    const data = snap.exists() ? snap.data() : {}
    manualTerminal = data.currentTerminal !== undefined ? data.currentTerminal : null
    preferredSource = typeof data.preferredSource === 'string' ? data.preferredSource : 'manual'
    notify()
  }, () => {
    manualTerminal = null
    notify()
  })

  const unsubGps = onSnapshot(GPS_CURRENT_REF(), (snap) => {
    const data = snap.exists() ? snap.data() : {}
    gpsTerminal = data.currentTerminal !== undefined ? data.currentTerminal : null
    notify()
  }, () => {
    gpsTerminal = null
    notify()
  })

  return () => {
    unsubManual()
    unsubGps()
  }
}

/**
 * Subscribe to driver's preferred terminal source ('manual' | 'gps').
 * Defaults to 'manual' when unset.
 * @param {Function} callback
 * @returns {Function} Unsubscribe
 */
export const subscribeTerminalSourcePreference = (callback) => {
  return onSnapshot(GPS_MANUAL_REF(), (snap) => {
    const data = snap.exists() ? snap.data() : {}
    const preferredSource = typeof data.preferredSource === 'string' ? data.preferredSource : 'manual'
    callback(preferredSource)
  }, (error) => {
    console.error('Error listening to terminal source preference:', error.message)
    callback('manual')
  })
}

/**
 * Update current terminal (manual selection).
 * @param {number | 'unknown'} terminal - Terminal 1-4 or 'unknown'
 */
export const updateCurrentTerminal = async (terminal) => {
  const value = terminal === 'unknown' ? 'unknown' : (typeof terminal === 'number' ? terminal : parseInt(terminal, 10))
  await setDoc(GPS_MANUAL_REF(), {
    currentTerminal: value,
    source: 'manual',
    updatedAt: serverTimestamp(),
  }, { merge: true })
}

/**
 * Update driver's preferred terminal source ('manual' | 'gps').
 * When set to 'gps', GPS reading will be used even if a manual terminal is present.
 * @param {'manual' | 'gps'} source
 */
export const updateTerminalSourcePreference = async (source) => {
  const preferredSource = source === 'gps' ? 'gps' : 'manual'
  await setDoc(GPS_MANUAL_REF(), {
    preferredSource,
    updatedAt: serverTimestamp(),
  }, { merge: true })
}

/**
 * Update jeepney route (from/to terminals + direction)
 * @param {string} jeepneyId - Jeepney ID (default: 'jeep1')
 * @param {number} fromTerminal - Origin terminal (1-4)
 * @param {number} toTerminal - Destination terminal (1-4)
 * @returns {Promise<void>}
 */
export const updateJeepneyRoute = async (jeepneyId = 'jeep1', fromTerminal, toTerminal) => {
  const direction = fromTerminal < toTerminal ? 'right' : 'left'
  const jeepneyRef = doc(db, 'jeepneys', jeepneyId)
  await updateDoc(jeepneyRef, {
    fromTerminal,
    toTerminal,
    direction,
    updatedAt: serverTimestamp(),
  })
}

/**
 * Sync jeepney seatCount with actual number of onboarded users
 * This ensures the seatCount matches reality
 * @param {string} jeepneyId - Jeepney ID (default: 'jeep1')
 * @returns {Promise<void>}
 */
export const syncJeepneySeatCount = async (jeepneyId = 'jeep1') => {
  try {
    // Get all users with status 'onboarded'
    const onboardedUsers = await getUsersByStatus('onboarded')
    const actualSeatCount = Math.min(onboardedUsers.length, 2) // Cap at max seats
    
    // Update jeepney seatCount to match actual count
    const jeepneyRef = doc(db, 'jeepneys', jeepneyId)
    await updateDoc(jeepneyRef, {
      seatCount: actualSeatCount,
      updatedAt: serverTimestamp()
    })
    
    // Synced jeepney seatCount
  } catch (error) {
    console.error('Error syncing jeepney seatCount:', error.message)
    throw error
  }
}

/**
 * Get today's date range in Manila timezone
 * @returns {Object} Object with start and end Date objects for today
 */
const getTodayDateRange = () => {
  const now = new Date()
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Manila',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(now)

  const getPart = (type) => parts.find((part) => part.type === type)?.value
  const year = Number(getPart('year'))
  const month = Number(getPart('month'))
  const day = Number(getPart('day'))

  // Create start of day in Manila timezone (00:00:00)
  const startUtc = Date.UTC(year, month - 1, day, 0, 0, 0) - 8 * 60 * 60 * 1000
  // Create end of day in Manila timezone (23:59:59.999)
  const endUtc = startUtc + 24 * 60 * 60 * 1000 - 1

  return {
    start: new Date(startUtc),
    end: new Date(endUtc),
  }
}

/**
 * Save a driver expense (creates a new expense document)
 * @param {string} userId - Driver user ID
 * @param {number} amount - Expense amount
 * @param {string} note - Optional note/description
 * @returns {Promise<string>} Expense document ID
 */
export const saveDailyExpenses = async (userId, amount, note = '') => {
  try {
    const expensesRef = collection(db, COLLECTIONS.DRIVER_EXPENSES)
    const expenseData = {
      userId,
      amount: typeof amount === 'number' ? amount : parseFloat(amount),
      note: note || '',
      createdAt: serverTimestamp(),
    }
    const docRef = await addDoc(expensesRef, expenseData)
    return docRef.id
  } catch (error) {
    console.error('Error saving daily expenses:', error.message)
    throw error
  }
}

/**
 * Subscribe to daily expenses for today
 * Calculates the sum of all expenses for today (shared across all driver accounts)
 * Previously this was per-user; now it aggregates for the whole jeep/day.
 * @param {string} userId - Driver user ID (kept for backwards compatibility, but ignored)
 * @param {Function} callback - Callback function that receives the total expenses
 * @returns {Function} Unsubscribe function
 */
export const subscribeDailyExpenses = (userId, callback) => {
  const { start, end } = getTodayDateRange()
  // Convert Date objects to Firestore Timestamps for proper comparison
  const startTimestamp = Timestamp.fromDate(start)
  const endTimestamp = Timestamp.fromDate(end)
  
  // Subscribing to daily expenses
  
  const expensesRef = collection(db, COLLECTIONS.DRIVER_EXPENSES)
  
  // Try the indexed query first (with date range)
  const q = query(
    expensesRef,
    where('createdAt', '>=', startTimestamp),
    where('createdAt', '<=', endTimestamp)
  )
  
  return onSnapshot(q, (snapshot) => {
    let total = 0
    snapshot.forEach((doc) => {
      const data = doc.data()
      const amount = data.amount || 0
      const amountNum = typeof amount === 'number' ? amount : parseFloat(amount) || 0
      total += amountNum
    })
    callback(total)
  }, (error) => {
    // If it's an index error, try a simpler query (just userId) and filter client-side
    if (error.code === 'failed-precondition') {
      console.warn('⚠️ Firestore index not created yet. Using fallback query.')
      
      // Fallback: query all expenses and filter by date client-side
      const fallbackQuery = query(expensesRef)
      
      return onSnapshot(fallbackQuery, (snapshot) => {
        let total = 0
        snapshot.forEach((doc) => {
          const data = doc.data()
          const createdAt = data.createdAt
          if (createdAt) {
            const createdAtDate = createdAt.toDate ? createdAt.toDate() : new Date(createdAt)
            // Filter by date range client-side
            if (createdAtDate >= start && createdAtDate <= end) {
              const amount = data.amount || 0
              const amountNum = typeof amount === 'number' ? amount : parseFloat(amount) || 0
              total += amountNum
            }
          }
        })
        callback(total)
      }, (fallbackError) => {
        console.error('Fallback query also failed:', fallbackError.message)
        callback(0)
      })
    } else {
      callback(0)
    }
  })
}
