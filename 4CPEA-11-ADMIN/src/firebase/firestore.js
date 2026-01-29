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
  serverTimestamp,
  increment,
  Timestamp,
} from 'firebase/firestore'
import { db } from './config'

const COLLECTIONS = {
  VERIFICATION_CODES: 'verificationCodes',
  USERS: 'users',
  TRANSACTIONS: 'transactions',
  DRIVER_EXPENSES: 'driverExpenses',
  JEEPNEYS: 'jeepneys',
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

// Helper function to get Manila day range
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

/**
 * Subscribe to daily passenger count (all passengers who tapped out today)
 * Counts unique tap-outs (completed trips) for today
 * @param {Function} callback - Callback function that receives the total passenger count
 * @returns {Function} Unsubscribe function
 */
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
 * @param {Function} callback - Callback function that receives the total revenue
 * @returns {Function} Unsubscribe function
 */
export const subscribeDailyRevenue = (callback) => {
  const { start, end } = getManilaDayRange()
  const startTimestamp = Timestamp.fromDate(start)
  const endTimestamp = Timestamp.fromDate(end)
  
  const txRef = collection(db, COLLECTIONS.TRANSACTIONS)
  const q = query(
    txRef,
    where('type', '==', 'trip'),
    where('timestamp', '>=', startTimestamp),
    where('timestamp', '<=', endTimestamp)
  )
  
  return onSnapshot(q, (snapshot) => {
    let total = 0
    snapshot.forEach((doc) => {
      const data = doc.data()
      const amount = data.amount || 0
      const amountNum = typeof amount === 'number' ? amount : parseFloat(amount) || 0
      total += Math.abs(amountNum)
    })
    callback(total)
  }, (error) => {
    console.error('Error listening to revenue:', error.message)
    callback(0)
  })
}

/**
 * Subscribe to daily expenses (sum of all driver expenses for today)
 * @param {Function} callback - Callback function that receives the total expenses
 * @returns {Function} Unsubscribe function
 */
export const subscribeDailyExpenses = (callback) => {
  const { start, end } = getManilaDayRange()
  const startTimestamp = Timestamp.fromDate(start)
  const endTimestamp = Timestamp.fromDate(end)
  
  const expensesRef = collection(db, COLLECTIONS.DRIVER_EXPENSES)
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
    console.error('Error listening to expenses:', error.message)
    callback(0)
  })
}

/**
 * Subscribe to jeepney data
 * @param {string} jeepneyId - Jeepney ID
 * @param {Function} callback - Callback function that receives jeepney data
 * @returns {Function} Unsubscribe function
 */
export const subscribeJeepney = (jeepneyId, callback) => {
  const jeepneyRef = doc(db, COLLECTIONS.JEEPNEYS, jeepneyId)
  
  return onSnapshot(jeepneyRef, (docSnap) => {
    if (docSnap.exists()) {
      callback({ id: docSnap.id, ...docSnap.data() })
    } else {
      callback({ id: jeepneyId, seatCount: 0, maxSeats: 2 })
    }
  }, (error) => {
    console.error('Error listening to jeepney:', error.message)
    callback({ id: jeepneyId, seatCount: 0, maxSeats: 2 })
  })
}

/**
 * Get date range for different periods (Daily, Weekly, Monthly, Yearly)
 * @param {string} period - 'Daily', 'Weekly', 'Monthly', 'Yearly'
 * @returns {Object} Object with start and end Date objects
 */
const getPeriodDateRange = (period) => {
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

  let start, end

  switch (period) {
    case 'Daily':
      // Last 7 days
      start = new Date(now)
      start.setDate(start.getDate() - 6)
      start.setHours(0, 0, 0, 0)
      end = new Date(now)
      end.setHours(23, 59, 59, 999)
      break

    case 'Weekly':
      // Last 4 weeks (28 days)
      start = new Date(now)
      start.setDate(start.getDate() - 27)
      start.setHours(0, 0, 0, 0)
      end = new Date(now)
      end.setHours(23, 59, 59, 999)
      break

    case 'Monthly':
      // Last 12 months
      start = new Date(year, month - 12, 1)
      start.setHours(0, 0, 0, 0)
      end = new Date(now)
      end.setHours(23, 59, 59, 999)
      break

    case 'Yearly':
      // Last 5 years
      start = new Date(year - 4, 0, 1)
      start.setHours(0, 0, 0, 0)
      end = new Date(now)
      end.setHours(23, 59, 59, 999)
      break

    default:
      // Default to daily
      start = new Date(now)
      start.setDate(start.getDate() - 6)
      start.setHours(0, 0, 0, 0)
      end = new Date(now)
      end.setHours(23, 59, 59, 999)
  }

  return { start, end }
}

/**
 * Group data by time period for chart display
 * @param {Array} transactions - Array of transaction objects
 * @param {Array} expenses - Array of expense objects
 * @param {string} period - 'Daily', 'Weekly', 'Monthly', 'Yearly'
 * @returns {Array} Array of data points for chart
 */
const groupDataByPeriod = (transactions, expenses, period) => {
  const revenueMap = new Map()
  const expensesMap = new Map()

  // Helper function to get label key for a given date (must match generateChartLabels format)
  const getLabelKey = (date, period) => {
    // Convert to Manila timezone first
    const manilaDate = new Date(date.toLocaleString('en-US', { timeZone: 'Asia/Manila' }))
    
    switch (period) {
      case 'Daily':
        // Use date string (YYYY-MM-DD) for unique identification
        const year = manilaDate.getFullYear()
        const month = String(manilaDate.getMonth() + 1).padStart(2, '0')
        const day = String(manilaDate.getDate()).padStart(2, '0')
        return `${year}-${month}-${day}`
      case 'Weekly':
        // Calculate week start date (Sunday) - must match generateChartLabels
        const weekStart = new Date(manilaDate)
        const dayOfWeek = weekStart.getDay()
        weekStart.setDate(weekStart.getDate() - dayOfWeek)
        // Use same formatting as generateChartLabels
        return weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
      case 'Monthly':
        // Use same formatting as generateChartLabels
        return manilaDate.toLocaleDateString('en-US', { month: 'short' })
      case 'Yearly':
        // Use same formatting as generateChartLabels
        return manilaDate.getFullYear().toString()
      default:
        return manilaDate.toLocaleDateString('en-US', { weekday: 'short' })
    }
  }

  // Process transactions (revenue)
  transactions.forEach((tx) => {
    const txDate = tx.timestamp?.toDate ? tx.timestamp.toDate() : new Date(tx.timestamp)
    const key = getLabelKey(txDate, period)
    const amount = Math.abs(tx.amount || 0)
    revenueMap.set(key, (revenueMap.get(key) || 0) + amount)
  })

  // Process expenses
  expenses.forEach((exp) => {
    const expDate = exp.createdAt?.toDate ? exp.createdAt.toDate() : new Date(exp.createdAt)
    const key = getLabelKey(expDate, period)
    const amount = exp.amount || 0
    expensesMap.set(key, (expensesMap.get(key) || 0) + amount)
  })

  // Generate chart labels and match data
  const labels = generateChartLabels(period)
  const chartData = labels.map((label, index) => {
    let revenue = 0
    let expense = 0

    if (period === 'Daily') {
      // For daily, match by actual date
      const now = new Date()
      const targetDate = new Date(now)
      targetDate.setDate(targetDate.getDate() - (6 - index))
      const dateKey = getLabelKey(targetDate, period)
      
      revenue = revenueMap.get(dateKey) || 0
      expense = expensesMap.get(dateKey) || 0
    } else {
      // For other periods, match by label (which should match the key format)
      revenue = revenueMap.get(label) || 0
      expense = expensesMap.get(label) || 0
    }

    const profit = revenue - expense

    return {
      label,
      revenue: Math.round(revenue * 100) / 100,
      profit: Math.round(profit * 100) / 100,
    }
  })

  return chartData
}

/**
 * Get period key for grouping data
 * @param {Date} date - Date object
 * @param {string} period - 'Daily', 'Weekly', 'Monthly', 'Yearly'
 * @returns {string} Key for grouping
 */
const getPeriodKey = (date, period) => {
  const manilaDate = new Date(date.toLocaleString('en-US', { timeZone: 'Asia/Manila' }))
  const year = manilaDate.getFullYear()
  const month = manilaDate.getMonth()
  const day = manilaDate.getDate()

  switch (period) {
    case 'Daily':
      // Use date string (YYYY-MM-DD) for unique identification
      const yearStr = manilaDate.getFullYear()
      const monthStr = String(manilaDate.getMonth() + 1).padStart(2, '0')
      const dayStr = String(manilaDate.getDate()).padStart(2, '0')
      return `${yearStr}-${monthStr}-${dayStr}`
    case 'Weekly':
      // Calculate week start date (Sunday)
      const weekStart = new Date(manilaDate)
      weekStart.setDate(weekStart.getDate() - weekStart.getDay())
      const weekMonth = weekStart.getMonth()
      const weekDay = weekStart.getDate()
      return weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    case 'Monthly':
      return manilaDate.toLocaleDateString('en-US', { month: 'short' })
    case 'Yearly':
      return year.toString()
    default:
      return manilaDate.toLocaleDateString('en-US', { weekday: 'short' })
  }
}

/**
 * Generate chart labels based on period
 * @param {string} period - 'Daily', 'Weekly', 'Monthly', 'Yearly'
 * @returns {Array} Array of label strings
 */
const generateChartLabels = (period) => {
  const now = new Date()
  const labels = []

  switch (period) {
    case 'Daily':
      // Last 7 days - show weekday names
      for (let i = 6; i >= 0; i--) {
        const date = new Date(now)
        date.setDate(date.getDate() - i)
        labels.push(date.toLocaleDateString('en-US', { weekday: 'short' }))
      }
      break

    case 'Weekly':
      // Last 4 weeks - show week start dates (Sunday)
      for (let i = 3; i >= 0; i--) {
        const date = new Date(now)
        date.setDate(date.getDate() - (i * 7))
        // Get the start of the week (Sunday)
        const dayOfWeek = date.getDay()
        date.setDate(date.getDate() - dayOfWeek)
        // Convert to Manila timezone for consistent formatting
        const manilaDate = new Date(date.toLocaleString('en-US', { timeZone: 'Asia/Manila' }))
        labels.push(manilaDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }))
      }
      break

    case 'Monthly':
      // Last 12 months
      for (let i = 11; i >= 0; i--) {
        const date = new Date(now.getFullYear(), now.getMonth() - i, 1)
        labels.push(date.toLocaleDateString('en-US', { month: 'short' }))
      }
      break

    case 'Yearly':
      // Last 5 years
      for (let i = 4; i >= 0; i--) {
        labels.push((now.getFullYear() - i).toString())
      }
      break

    default:
      // Default to daily
      for (let i = 6; i >= 0; i--) {
        const date = new Date(now)
        date.setDate(date.getDate() - i)
        labels.push(date.toLocaleDateString('en-US', { weekday: 'short' }))
      }
  }

  return labels
}

/**
 * Subscribe to revenue and profit chart data
 * @param {string} period - 'Daily', 'Weekly', 'Monthly', 'Yearly'
 * @param {Function} callback - Callback function that receives chart data array
 * @returns {Function} Unsubscribe function
 */
export const subscribeRevenueProfitChart = (period, callback) => {
  const { start, end } = getPeriodDateRange(period)
  const startTimestamp = Timestamp.fromDate(start)
  const endTimestamp = Timestamp.fromDate(end)

  const txRef = collection(db, COLLECTIONS.TRANSACTIONS)
  const expensesRef = collection(db, COLLECTIONS.DRIVER_EXPENSES)

  const txQuery = query(
    txRef,
    where('type', '==', 'trip'),
    where('timestamp', '>=', startTimestamp),
    where('timestamp', '<=', endTimestamp)
  )

  const expensesQuery = query(
    expensesRef,
    where('createdAt', '>=', startTimestamp),
    where('createdAt', '<=', endTimestamp)
  )

  let transactions = []
  let expenses = []

  const updateChart = () => {
    const chartData = groupDataByPeriod(transactions, expenses, period)
    callback(chartData)
  }

  const txUnsubscribe = onSnapshot(txQuery, (snapshot) => {
    transactions = []
    snapshot.forEach((doc) => {
      const data = doc.data()
      transactions.push({
        id: doc.id,
        amount: data.amount || 0,
        timestamp: data.timestamp,
      })
    })
    updateChart()
  }, (error) => {
    console.error('Error listening to transactions for chart:', error.message)
    callback([])
  })

  const expensesUnsubscribe = onSnapshot(expensesQuery, (snapshot) => {
    expenses = []
    snapshot.forEach((doc) => {
      const data = doc.data()
      expenses.push({
        id: doc.id,
        amount: data.amount || 0,
        createdAt: data.createdAt,
      })
    })
    updateChart()
  }, (error) => {
    console.error('Error listening to expenses for chart:', error.message)
    callback([])
  })

  return () => {
    txUnsubscribe()
    expensesUnsubscribe()
  }
}

/**
 * Get yesterday's statistics for comparison
 * @param {Function} callback - Callback function that receives yesterday's stats
 * @returns {Function} Unsubscribe function
 */
export const subscribeYesterdayStats = (callback) => {
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

  // Yesterday's date
  const yesterday = new Date(year, month - 1, day - 1)
  const startUtc = Date.UTC(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate(), 0, 0, 0) - 8 * 60 * 60 * 1000
  const endUtc = startUtc + 24 * 60 * 60 * 1000 - 1

  const startTimestamp = Timestamp.fromDate(new Date(startUtc))
  const endTimestamp = Timestamp.fromDate(new Date(endUtc))

  let yesterdayData = { passengers: 0, revenue: 0, expenses: 0 }

  const updateStats = () => {
    callback({
      passengers: yesterdayData.passengers,
      revenue: yesterdayData.revenue,
      expenses: yesterdayData.expenses,
      profit: yesterdayData.revenue - yesterdayData.expenses,
    })
  }

  // Get yesterday's transactions
  const txRef = collection(db, COLLECTIONS.TRANSACTIONS)
  const txQuery = query(
    txRef,
    where('type', '==', 'trip'),
    where('timestamp', '>=', startTimestamp),
    where('timestamp', '<=', endTimestamp)
  )

  const txUnsubscribe = onSnapshot(txQuery, async (snapshot) => {
    let revenue = 0
    const completedTransactions = new Set()
    const tripTransactionsByUser = new Map()

    snapshot.forEach((doc) => {
      const data = doc.data()
      const amount = Math.abs(data.amount || 0)
      revenue += amount

      const userId = data.userId
      if (userId) {
        if (!tripTransactionsByUser.has(userId)) {
          tripTransactionsByUser.set(userId, [])
        }
        tripTransactionsByUser.get(userId).push({
          transactionId: doc.id,
          timestamp: data.timestamp,
        })
      }
    })

    yesterdayData.revenue = revenue

    // Count passengers who tapped out yesterday
    const usersRef = collection(db, COLLECTIONS.USERS)
    const usersSnapshot = await getDocs(usersRef)
    usersSnapshot.forEach((doc) => {
      const data = doc.data()
      const userId = doc.id
      const status = data.status

      // Users who are tapped out and have transactions from yesterday
      if ((status === null || status === undefined) && tripTransactionsByUser.has(userId)) {
        const transactions = tripTransactionsByUser.get(userId)
        transactions.forEach((tx) => {
          const txDate = tx.timestamp?.toDate ? tx.timestamp.toDate() : new Date(tx.timestamp)
          if (txDate >= new Date(startUtc) && txDate <= new Date(endUtc)) {
            completedTransactions.add(tx.transactionId)
          }
        })
      }
    })

    yesterdayData.passengers = completedTransactions.size
    updateStats()
  }, (error) => {
    console.error('Error listening to yesterday transactions:', error.message)
    callback({ passengers: 0, revenue: 0, expenses: 0, profit: 0 })
  })

  // Get yesterday's expenses
  const expensesRef = collection(db, COLLECTIONS.DRIVER_EXPENSES)
  const expensesQuery = query(
    expensesRef,
    where('createdAt', '>=', startTimestamp),
    where('createdAt', '<=', endTimestamp)
  )

  const expensesUnsubscribe = onSnapshot(expensesQuery, (snapshot) => {
    let total = 0
    snapshot.forEach((doc) => {
      const data = doc.data()
      const amount = data.amount || 0
      total += amount
    })
    yesterdayData.expenses = total
    updateStats()
  }, (error) => {
    console.error('Error listening to yesterday expenses:', error.message)
  })

  return () => {
    txUnsubscribe()
    expensesUnsubscribe()
  }
}

/**
 * Get historical data for report generation
 * @param {Date} startDate - Start date
 * @param {Date} endDate - End date
 * @returns {Promise<Object>} Report data object
 */
export const getHistoricalData = async (startDate, endDate) => {
  try {
    const startTimestamp = Timestamp.fromDate(startDate)
    const endTimestamp = Timestamp.fromDate(endDate)
    
    // Get transactions in date range
    const txRef = collection(db, COLLECTIONS.TRANSACTIONS)
    const txQuery = query(
      txRef,
      where('type', '==', 'trip'),
      where('timestamp', '>=', startTimestamp),
      where('timestamp', '<=', endTimestamp)
    )
    const txSnapshot = await getDocs(txQuery)
    
    // Get expenses in date range
    const expensesRef = collection(db, COLLECTIONS.DRIVER_EXPENSES)
    const expensesQuery = query(
      expensesRef,
      where('createdAt', '>=', startTimestamp),
      where('createdAt', '<=', endTimestamp)
    )
    const expensesSnapshot = await getDocs(expensesQuery)
    
    // Calculate totals
    let totalRevenue = 0
    let totalPassengers = 0
    const terminalActivity = {
      1: { boarding: 0, alighting: 0 },
      2: { boarding: 0, alighting: 0 },
      3: { boarding: 0, alighting: 0 },
      4: { boarding: 0, alighting: 0 },
    }
    const transactions = []
    
    txSnapshot.forEach((doc) => {
      const data = doc.data()
      const amount = Math.abs(data.amount || 0)
      totalRevenue += amount
      
      if (data.origin && terminalActivity[data.origin]) {
        terminalActivity[data.origin].boarding += 1
      }
      if (data.destination && terminalActivity[data.destination]) {
        terminalActivity[data.destination].alighting += 1
      }
      
      transactions.push({
        id: doc.id,
        userId: data.userId,
        origin: data.origin || 'N/A',
        destination: data.destination || 'N/A',
        amount: amount,
        timestamp: data.timestamp?.toDate?.() || new Date(data.timestamp),
        jeepneyId: data.jeepneyId || 'N/A',
      })
    })
    
    // Count unique passengers (users who completed trips)
    const passengerSet = new Set()
    transactions.forEach((tx) => {
      if (tx.userId) {
        passengerSet.add(tx.userId)
      }
    })
    totalPassengers = passengerSet.size
    
    // Calculate expenses
    let totalExpenses = 0
    const expenses = []
    expensesSnapshot.forEach((doc) => {
      const data = doc.data()
      const amount = data.amount || 0
      totalExpenses += amount
      expenses.push({
        id: doc.id,
        amount: amount,
        note: data.note || '',
        createdAt: data.createdAt?.toDate?.() || new Date(data.createdAt),
      })
    })
    
    const profit = totalRevenue - totalExpenses
    
    return {
      summary: {
        totalPassengers,
        totalRevenue,
        totalExpenses,
        profit,
      },
      terminalActivity: [1, 2, 3, 4].map((id) => ({
        id,
        name: `Terminal ${id}`,
        boarding: terminalActivity[id].boarding,
        alighting: terminalActivity[id].alighting,
        total: terminalActivity[id].boarding + terminalActivity[id].alighting,
      })),
      transactions,
      expenses,
    }
  } catch (error) {
    console.error('Error fetching historical data:', error.message)
    throw error
  }
}

/**
 * Get terminal activity (boarding and alighting counts) in real-time
 * Boarding: Users with status 'waiting' and currentTerminal matches the terminal
 * Alighting: Users with status 'onboarded' and currentRoute.to matches the terminal
 * @param {Function} callback - Callback function that receives terminal data array
 * @returns {Function} Unsubscribe function
 */
export const subscribeTerminalActivity = (callback) => {
  const usersRef = collection(db, COLLECTIONS.USERS)
  
  return onSnapshot(usersRef, (snapshot) => {
    const terminalData = {
      1: { boarding: 0, alighting: 0 },
      2: { boarding: 0, alighting: 0 },
      3: { boarding: 0, alighting: 0 },
      4: { boarding: 0, alighting: 0 },
    }
    
    snapshot.forEach((doc) => {
      const userData = doc.data()
      const status = userData.status
      const currentTerminal = userData.currentTerminal
      const currentRoute = userData.currentRoute
      
      // Boarding: Count users waiting to board at this terminal
      // User status is 'waiting' and their currentTerminal (origin) matches the terminal
      if (status === 'waiting' && currentTerminal) {
        const terminalId = typeof currentTerminal === 'number' ? currentTerminal : parseInt(currentTerminal)
        if (terminalData[terminalId]) {
          terminalData[terminalId].boarding += 1
        }
      }
      
      // Alighting: Count users onboarded and dropping off at this terminal
      // User status is 'onboarded' and their currentRoute.to (destination) matches the terminal
      if (status === 'onboarded' && currentRoute && currentRoute.to) {
        const destinationTerminal = typeof currentRoute.to === 'number' ? currentRoute.to : parseInt(currentRoute.to)
        if (terminalData[destinationTerminal]) {
          terminalData[destinationTerminal].alighting += 1
        }
      }
    })
    
    const result = [1, 2, 3, 4].map((id) => ({
      id,
      name: `Terminal ${id}`,
      boarding: terminalData[id].boarding,
      alighting: terminalData[id].alighting,
      total: terminalData[id].boarding + terminalData[id].alighting,
    }))
    
    callback(result)
  }, (error) => {
    console.error('Error listening to terminal activity:', error.message)
    callback([])
  })
}
