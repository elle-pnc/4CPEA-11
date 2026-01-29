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
  let tripTransactionsByUser = new Map() // userId -> array of {transactionId, timestamp}
  let userStatuses = new Map() // userId -> current status
  let completedTransactions = new Set() // Set of transaction IDs that have been completed (user tapped out)
  
  const calculateTapOuts = () => {
    // Count all transactions that have been completed (user tapped out after the transaction)
    callback(completedTransactions.size)
  }
  
  const txUnsubscribe = onSnapshot(txQuery, (snapshot) => {
    const newTransactions = new Map() // Track new transactions to process tap-outs
    
    snapshot.forEach((doc) => {
      const data = doc.data()
      const userId = data.userId
      if (userId) {
        if (!tripTransactionsByUser.has(userId)) {
          tripTransactionsByUser.set(userId, [])
        }
        const timestamp = data.timestamp?.toDate ? data.timestamp.toDate() : new Date(data.timestamp)
        const txData = {
          transactionId: doc.id,
          timestamp
        }
        tripTransactionsByUser.get(userId).push(txData)
        
        // Track new transactions
        if (!newTransactions.has(userId)) {
          newTransactions.set(userId, [])
        }
        newTransactions.get(userId).push(txData)
      }
    })
    
    // Sort transactions by timestamp for each user
    tripTransactionsByUser.forEach((transactions) => {
      transactions.sort((a, b) => a.timestamp - b.timestamp)
    })
    
    // For new transactions, if user is already tapped out, mark them as completed
    newTransactions.forEach((transactions, userId) => {
      const currentStatus = userStatuses.get(userId)
      if (currentStatus === null || currentStatus === undefined) {
        // User is tapped out, mark the most recent transaction as completed
        if (transactions.length > 0) {
          const mostRecent = transactions[transactions.length - 1]
          completedTransactions.add(mostRecent.transactionId)
        }
      }
    })
    
    calculateTapOuts()
  }, (error) => {
    console.error('Error listening to trip transactions:', error.message)
    callback(0)
  })
  
  const usersUnsubscribe = onSnapshot(usersRef, (snapshot) => {
    snapshot.forEach((doc) => {
      const data = doc.data()
      const userId = doc.id
      const newStatus = data.status
      const oldStatus = userStatuses.get(userId)
      
      userStatuses.set(userId, newStatus)
      
      // When user taps out (status changes from 'onboarded' to null)
      // Mark their most recent uncompleted transaction as completed
      if (oldStatus === 'onboarded' && (newStatus === null || newStatus === undefined)) {
        const transactions = tripTransactionsByUser.get(userId) || []
        // Find the most recent transaction that hasn't been completed yet
        // This represents one completed trip (tap-out)
        for (let i = transactions.length - 1; i >= 0; i--) {
          const tx = transactions[i]
          if (!completedTransactions.has(tx.transactionId)) {
            completedTransactions.add(tx.transactionId)
            break // Only mark one transaction per tap-out
          }
        }
      }
      
      // Also handle initial state: if user is already tapped out when we start listening
      // and they have transactions, mark the appropriate number as completed
      // This handles the case where the listener starts after user has already tapped out
      if (oldStatus === undefined && (newStatus === null || newStatus === undefined)) {
        const transactions = tripTransactionsByUser.get(userId) || []
        // If user is tapped out and has transactions, mark all as completed
        // (they've completed all their trips)
        transactions.forEach((tx) => {
          completedTransactions.add(tx.transactionId)
        })
      }
    })
    calculateTapOuts()
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
 * Calculates the sum of all expenses for the current driver today
 * @param {string} userId - Driver user ID
 * @param {Function} callback - Callback function that receives the total expenses
 * @returns {Function} Unsubscribe function
 */
export const subscribeDailyExpenses = (userId, callback) => {
  if (!userId) {
    callback(0)
    return () => {}
  }
  
  const { start, end } = getTodayDateRange()
  // Convert Date objects to Firestore Timestamps for proper comparison
  const startTimestamp = Timestamp.fromDate(start)
  const endTimestamp = Timestamp.fromDate(end)
  
  // Subscribing to daily expenses
  
  const expensesRef = collection(db, COLLECTIONS.DRIVER_EXPENSES)
  
  // Try the indexed query first (with date range)
  const q = query(
    expensesRef,
    where('userId', '==', userId),
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
      
      // Fallback: query all expenses for user and filter by date client-side
      const fallbackQuery = query(
        expensesRef,
        where('userId', '==', userId)
      )
      
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
