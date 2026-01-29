// Firestore helper functions for account management
import { 
  collection, 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc, 
  addDoc,
  query,
  where,
  orderBy,
  limit,
  getDocs,
  serverTimestamp,
  increment,
  arrayUnion,
  arrayRemove
} from 'firebase/firestore';
import { db } from './config';

// Collection names
const COLLECTIONS = {
  USERS: 'users', // Use lowercase 'users' (standard convention)
  TRANSACTIONS: 'transactions',
  VERIFICATION_CODES: 'verificationCodes',
  JEEPNEYS: 'jeepneys'
};

// Helper function to check both 'User' and 'users' collections for migration
const getUserFromAnyCollection = async (userId) => {
  // First try lowercase 'users' (correct collection)
  try {
    const usersRef = doc(db, 'users', userId);
    const usersSnap = await getDoc(usersRef);
    if (usersSnap.exists()) {
      return { collection: 'users', data: { id: usersSnap.id, ...usersSnap.data() } };
    }
  } catch (error) {
    // If permission denied, user might not exist or not authenticated yet
    // Continue to check legacy collection
    if (error.code !== 'permission-denied') {
      throw error; // Re-throw non-permission errors
    }
  }
  
  // If not found, try 'User' (capital U - legacy/migration)
  try {
    const userRef = doc(db, 'User', userId);
    const userSnap = await getDoc(userRef);
    if (userSnap.exists()) {
      return { collection: 'User', data: { id: userSnap.id, ...userSnap.data() } };
    }
  } catch (error) {
    // If permission denied for legacy collection, just treat as not found
    // This can happen during 2FA flow or if user doesn't have access
    if (error.code !== 'permission-denied') {
      throw error; // Re-throw non-permission errors
    }
  }
  
  return null;
};

/**
 * User Management Functions
 */

/**
 * Create or get user document in Firestore
 * @param {string} userId - Firebase Auth UID
 * @param {object} userData - Initial user data
 * @returns {Promise<object>} User document
 */
export const createOrGetUser = async (userId, userData = {}) => {
  try {
    // Check if user exists in either collection
    const existingUser = await getUserFromAnyCollection(userId);
    
    if (existingUser) {
      // Ensure cardNumber exists, if not set default
      if (!existingUser.data.cardNumber) {
        existingUser.data.cardNumber = '0000 0000 0000';
        // Update in Firestore
        if (existingUser.collection === 'User') {
          // Will be migrated below
        } else {
          const usersRef = doc(db, COLLECTIONS.USERS, userId);
          await updateDoc(usersRef, { cardNumber: '0000 0000 0000' });
        }
      }
      
      // User exists - migrate to 'users' if in 'User' collection
      if (existingUser.collection === 'User') {
        console.log(`Migrating user ${userId} from 'User' to 'users' collection`);
        const usersRef = doc(db, COLLECTIONS.USERS, userId);
        // Ensure cardNumber is included in migration
        const migratedData = {
          ...existingUser.data,
          cardNumber: existingUser.data.cardNumber || '0000 0000 0000'
        };
        await setDoc(usersRef, migratedData);
        return migratedData;
      }
      return existingUser.data;
    } else {
      // Create new user document in 'users' collection
      const userRef = doc(db, COLLECTIONS.USERS, userId);
      const defaultUserData = {
        email: userData.email || '',
        firstName: userData.firstName || '',
        lastName: userData.lastName || '',
        cardNumber: userData.cardNumber || '0000 0000 0000',
        balance: 250.00,
        currentTerminal: 1,
        currentRoute: null,
        language: 'English',
        theme: 'light',
        status: null, // 'waiting', 'onboarded', or null
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };

      await setDoc(userRef, defaultUserData);
      return { id: userId, ...defaultUserData };
    }
  } catch (error) {
    // Don't log or throw permission-denied errors during 2FA flow
    // These are expected when user is temporarily authenticated
    if (error.code !== 'permission-denied') {
      console.error('Error creating/getting user:', error);
    }
    // Re-throw so caller knows it failed, but only log real errors
    throw error;
  }
};

/**
 * Get user document by ID
 * @param {string} userId - Firebase Auth UID
 * @returns {Promise<object|null>} User document or null
 */
export const getUser = async (userId) => {
  try {
    // Check both collections
    const existingUser = await getUserFromAnyCollection(userId);
    
    if (existingUser) {
      // Ensure cardNumber exists, if not set default
      if (!existingUser.data.cardNumber) {
        existingUser.data.cardNumber = '0000 0000 0000';
        // Update in Firestore
        const usersRef = doc(db, COLLECTIONS.USERS, userId);
        await updateDoc(usersRef, { cardNumber: '0000 0000 0000' });
      }
      
      // If in 'User' collection, migrate to 'users'
      if (existingUser.collection === 'User') {
        console.log(`Migrating user ${userId} from 'User' to 'users' collection`);
        const usersRef = doc(db, COLLECTIONS.USERS, userId);
        // Ensure cardNumber is included in migration
        const migratedData = {
          ...existingUser.data,
          cardNumber: existingUser.data.cardNumber || '0000 0000 0000'
        };
        await setDoc(usersRef, migratedData);
        return migratedData;
      }
      return existingUser.data;
    }
    
    return null;
  } catch (error) {
    // Only log non-permission errors (permission errors are expected if user doesn't exist)
    if (error.code !== 'permission-denied') {
      console.error('Error getting user:', error);
    }
    throw error;
  }
};

/**
 * Update user document
 * @param {string} userId - Firebase Auth UID
 * @param {object} updates - Fields to update
 * @returns {Promise<void>}
 */
export const updateUser = async (userId, updates) => {
  try {
    const userRef = doc(db, COLLECTIONS.USERS, userId);
    await updateDoc(userRef, {
      ...updates,
      updatedAt: serverTimestamp()
    });
  } catch (error) {
    console.error('Error updating user:', error);
    throw error;
  }
};

/**
 * Update user profile (firstName, lastName, email)
 * @param {string} userId - Firebase Auth UID
 * @param {object} profileData - Profile data to update
 * @returns {Promise<void>}
 */
export const updateUserProfile = async (userId, profileData) => {
  const { firstName, lastName, email, phoneNumber } = profileData;
  const updates = {};
  
  if (firstName !== undefined) updates.firstName = firstName;
  if (lastName !== undefined) updates.lastName = lastName;
  if (email !== undefined) updates.email = email;
  if (phoneNumber !== undefined) updates.phoneNumber = phoneNumber;

  await updateUser(userId, updates);
};

/**
 * Update user balance
 * @param {string} userId - Firebase Auth UID
 * @param {number} amount - Amount to add (positive) or subtract (negative)
 * @returns {Promise<void>}
 */
export const updateUserBalance = async (userId, amount) => {
  try {
    const userRef = doc(db, COLLECTIONS.USERS, userId);
    await updateDoc(userRef, {
      balance: increment(amount),
      updatedAt: serverTimestamp()
    });
  } catch (error) {
    console.error('Error updating balance:', error);
    throw error;
  }
};

/**
 * Update user current terminal
 * @param {string} userId - Firebase Auth UID
 * @param {number} terminal - Terminal number
 * @returns {Promise<void>}
 */
export const updateUserTerminal = async (userId, terminal) => {
  await updateUser(userId, { currentTerminal: terminal });
};

/**
 * Update user current route
 * @param {string} userId - Firebase Auth UID
 * @param {object|null} route - Route object { from: number, to: number } or null
 * @returns {Promise<void>}
 */
export const updateUserRoute = async (userId, route) => {
  await updateUser(userId, { currentRoute: route });
};

/**
 * Update user status (waiting, onboarded, default)
 * @param {string} userId - Firebase Auth UID
 * @param {string} status - Status: 'waiting', 'onboarded', or null (default)
 * @returns {Promise<void>}
 */
export const updateUserStatus = async (userId, status) => {
  await updateUser(userId, { status: status || null });
};

/**
 * Get all users with a specific status
 * @param {string} status - Status to filter by ('waiting', 'onboarded', or null for all)
 * @returns {Promise<Array>} Array of user documents
 */
export const getUsersByStatus = async (status = null) => {
  try {
    const usersRef = collection(db, COLLECTIONS.USERS);
    let q;
    
    if (status) {
      // Get users with specific status
      q = query(usersRef, where('status', '==', status));
    } else {
      // Get all users - we'll filter in the app
      // Note: Firestore 'in' operator is limited to 10 values, so we'll get all and filter
      q = query(usersRef);
    }
    
    const querySnapshot = await getDocs(q);
    const users = [];
    
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      // If no status filter, only return users with waiting or onboarded status
      if (!status && data.status && (data.status === 'waiting' || data.status === 'onboarded')) {
        users.push({
          id: doc.id,
          ...data
        });
      } else if (status && data.status === status) {
        users.push({
          id: doc.id,
          ...data
        });
      }
    });
    
    return users;
  } catch (error) {
    console.error('Error getting users by status:', error);
    throw error;
  }
};

/**
 * Update user preferences (language, theme)
 * @param {string} userId - Firebase Auth UID
 * @param {string} language - Language preference
 * @param {string} theme - Theme preference ('light' or 'dark')
 * @returns {Promise<void>}
 */
export const updateUserPreferences = async (userId, language, theme) => {
  const updates = {};
  if (language !== undefined) updates.language = language;
  if (theme !== undefined) updates.theme = theme;
  await updateUser(userId, updates);
};

/**
 * Transaction Management Functions
 */

/**
 * Add a transaction to Firestore
 * @param {string} userId - Firebase Auth UID
 * @param {object} transactionData - Transaction data
 * @returns {Promise<string>} Transaction ID
 */
export const addTransaction = async (userId, transactionData) => {
  try {
    const transactionRef = await addDoc(collection(db, COLLECTIONS.TRANSACTIONS), {
      userId,
      type: transactionData.type, // 'top-up' or 'trip'
      amount: transactionData.amount,
      paymentMethod: transactionData.paymentMethod || null,
      description: transactionData.description || '',
      balanceAfter: transactionData.balanceAfter || null,
      route: transactionData.route || null,
      jeepneyId: transactionData.jeepneyId || null, // Store which jeepney was used
      timestamp: serverTimestamp(),
      createdAt: serverTimestamp()
    });

    return transactionRef.id;
  } catch (error) {
    console.error('Error adding transaction:', error);
    throw error;
  }
};

/**
 * Get user transactions
 * @param {string} userId - Firebase Auth UID
 * @param {number} limitCount - Maximum number of transactions to retrieve
 * @returns {Promise<Array>} Array of transactions
 */
export const getUserTransactions = async (userId, limitCount = 50) => {
  try {
    const transactionsRef = collection(db, COLLECTIONS.TRANSACTIONS);
    const q = query(
      transactionsRef,
      where('userId', '==', userId),
      orderBy('timestamp', 'desc'),
      limit(limitCount)
    );

    const querySnapshot = await getDocs(q);
    const transactions = [];

    querySnapshot.forEach((doc) => {
      const data = doc.data();
      transactions.push({
        id: doc.id,
        ...data,
        timestamp: data.timestamp?.toDate() || new Date(),
        createdAt: data.createdAt?.toDate() || new Date()
      });
    });

    return transactions;
  } catch (error) {
    // If index is missing, return empty array and log helpful message
    if (error.code === 'failed-precondition' && error.message?.includes('index')) {
      console.warn('⚠️ Firestore index not created yet. Transactions will be empty until index is built.');
      console.warn('📋 Create the index here:', error.message.match(/https:\/\/[^\s]+/)?.[0] || 'Firebase Console → Firestore → Indexes');
      console.warn('⏳ The index takes 1-5 minutes to build after creation.');
      return []; // Return empty array instead of crashing
    }
    console.error('Error getting transactions:', error);
    throw error;
  }
};

/**
 * Verification Code Functions (for 2FA)
 */

/**
 * Store verification code in Firestore
 * @param {string} email - User email
 * @param {string} code - 6-digit verification code
 * @param {number} expiresInMinutes - Expiration time in minutes (default: 10)
 * @returns {Promise<void>}
 */
export const storeVerificationCode = async (email, code, expiresInMinutes = 10) => {
  try {
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + expiresInMinutes);

    const codeRef = doc(db, COLLECTIONS.VERIFICATION_CODES, email);
    await setDoc(codeRef, {
      code,
      email,
      createdAt: serverTimestamp(),
      expiresAt: expiresAt,
      used: false,
      attempts: 0
    });
  } catch (error) {
    console.error('Error storing verification code:', error);
    throw error;
  }
};

/**
 * Verify code and mark as used
 * @param {string} email - User email
 * @param {string} code - Verification code to verify
 * @returns {Promise<boolean>} True if valid, false otherwise
 */
export const verifyCode = async (email, code) => {
  try {
    const codeRef = doc(db, COLLECTIONS.VERIFICATION_CODES, email);
    const codeSnap = await getDoc(codeRef);

    if (!codeSnap.exists()) {
      return { valid: false, error: 'Verification code not found' };
    }

    const data = codeSnap.data();

    // Check if expired
    const expiresAt = data.expiresAt?.toDate();
    if (expiresAt && new Date() > expiresAt) {
      await updateDoc(codeRef, { used: true }); // Mark as used so it can't be used again
      return { valid: false, error: 'Verification code has expired' };
    }

    // Check if already used
    if (data.used) {
      return { valid: false, error: 'Verification code already used' };
    }

    // Check attempts
    if (data.attempts >= 5) {
      await updateDoc(codeRef, { used: true });
      return { valid: false, error: 'Too many failed attempts' };
    }

    // Verify code
    if (data.code !== code) {
      await updateDoc(codeRef, { attempts: increment(1) });
      return { valid: false, error: 'Invalid verification code' };
    }

    // Code is valid - mark as used
    await updateDoc(codeRef, {
      used: true,
      verifiedAt: serverTimestamp()
    });

    return { valid: true };
  } catch (error) {
    console.error('Error verifying code:', error);
    return { valid: false, error: 'Verification failed' };
  }
};

/**
 * Delete verification code (cleanup)
 * @param {string} email - User email
 * @returns {Promise<void>}
 */
export const deleteVerificationCode = async (email) => {
  try {
    const codeRef = doc(db, COLLECTIONS.VERIFICATION_CODES, email);
    await updateDoc(codeRef, { used: true }); // Mark as used instead of deleting
  } catch (error) {
    console.error('Error deleting verification code:', error);
    // Ignore error if document doesn't exist
  }
};

/**
 * Jeepney Management Functions
 */

/**
 * Initialize default jeepney if it doesn't exist
 * @param {string} jeepneyId - Jeepney ID
 * @returns {Promise<Object>} Jeepney data
 */
export const initializeJeepney = async (jeepneyId = 'jeep1') => {
  try {
    const jeepneyRef = doc(db, COLLECTIONS.JEEPNEYS, jeepneyId);
    const jeepneySnap = await getDoc(jeepneyRef);
    
    if (!jeepneySnap.exists()) {
      // Create default jeepney (only Jeep 1 is active)
      const defaultJeepney = {
        id: jeepneyId,
        name: 'Jeep 1',
        seatCount: 0,
        maxSeats: 2,
        direction: 'right',
        fromTerminal: 1,
        toTerminal: 2,
        isActive: true,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };
      
      await setDoc(jeepneyRef, defaultJeepney);
      return { id: jeepneyId, ...defaultJeepney };
    }
    
    return { id: jeepneySnap.id, ...jeepneySnap.data() };
  } catch (error) {
    console.error('Error initializing jeepney:', error);
    throw error;
  }
};

/**
 * Get all jeepneys
 * @returns {Promise<Array>} Array of jeepney objects
 */
export const getJeepneys = async () => {
  try {
    const jeepneysRef = collection(db, COLLECTIONS.JEEPNEYS);
    const jeepneysSnap = await getDocs(jeepneysRef);
    
    const jeepneys = [];
    jeepneysSnap.forEach((doc) => {
      jeepneys.push({ id: doc.id, ...doc.data() });
    });
    
    return jeepneys;
  } catch (error) {
    console.error('Error getting jeepneys:', error);
    throw error;
  }
};

/**
 * Get a specific jeepney
 * @param {string} jeepneyId - Jeepney ID
 * @returns {Promise<Object>} Jeepney data
 */
export const getJeepney = async (jeepneyId = 'jeep1') => {
  try {
    const jeepneyRef = doc(db, COLLECTIONS.JEEPNEYS, jeepneyId);
    const jeepneySnap = await getDoc(jeepneyRef);
    
    if (!jeepneySnap.exists()) {
      // Initialize if doesn't exist
      return await initializeJeepney(jeepneyId);
    }
    
    return { id: jeepneySnap.id, ...jeepneySnap.data() };
  } catch (error) {
    console.error('Error getting jeepney:', error);
    throw error;
  }
};

/**
 * Update jeepney data
 * @param {string} jeepneyId - Jeepney ID
 * @param {Object} updates - Updates to apply
 * @returns {Promise<void>}
 */
export const updateJeepney = async (jeepneyId, updates) => {
  try {
    const jeepneyRef = doc(db, COLLECTIONS.JEEPNEYS, jeepneyId);
    
    // Calculate direction based on terminals if both are provided
    if (updates.fromTerminal !== undefined && updates.toTerminal !== undefined) {
      updates.direction = updates.fromTerminal < updates.toTerminal ? 'right' : 'left';
    }
    
    await updateDoc(jeepneyRef, {
      ...updates,
      updatedAt: serverTimestamp()
    });
  } catch (error) {
    console.error('Error updating jeepney:', error);
    throw error;
  }
};

/**
 * Update jeepney seat count
 * @param {string} jeepneyId - Jeepney ID
 * @param {number} seatCount - New seat count (0-2)
 * @returns {Promise<void>}
 */
export const updateJeepneySeatCount = async (jeepneyId, seatCount) => {
  try {
    const jeepneyRef = doc(db, COLLECTIONS.JEEPNEYS, jeepneyId);
    await updateDoc(jeepneyRef, {
      seatCount: Math.max(0, Math.min(2, seatCount)), // Clamp between 0 and 2
      updatedAt: serverTimestamp()
    });
  } catch (error) {
    console.error('Error updating jeepney seat count:', error);
    throw error;
  }
};

/**
 * Update jeepney direction/route
 * @param {string} jeepneyId - Jeepney ID
 * @param {number} fromTerminal - Origin terminal (1-4)
 * @param {number} toTerminal - Destination terminal (1-4)
 * @returns {Promise<void>}
 */
export const updateJeepneyRoute = async (jeepneyId, fromTerminal, toTerminal) => {
  try {
    const direction = fromTerminal < toTerminal ? 'right' : 'left';
    await updateJeepney(jeepneyId, {
      fromTerminal,
      toTerminal,
      direction
    });
  } catch (error) {
    console.error('Error updating jeepney route:', error);
    throw error;
  }
};

/**
 * Generate a unique device token
 */
const generateDeviceToken = () => {
  // Generate a random token (32 characters)
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let token = '';
  for (let i = 0; i < 32; i++) {
    token += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return token;
};

/**
 * Get device information (browser, OS, etc.)
 */
const getDeviceInfo = () => {
  const userAgent = navigator.userAgent;
  const platform = navigator.platform;
  
  // Simple device detection
  let deviceType = 'Unknown';
  let browser = 'Unknown';
  
  if (userAgent.includes('Chrome')) browser = 'Chrome';
  else if (userAgent.includes('Firefox')) browser = 'Firefox';
  else if (userAgent.includes('Safari')) browser = 'Safari';
  else if (userAgent.includes('Edge')) browser = 'Edge';
  
  if (platform.includes('Win')) deviceType = 'Windows';
  else if (platform.includes('Mac')) deviceType = 'Mac';
  else if (platform.includes('Linux')) deviceType = 'Linux';
  else if (platform.includes('iPhone') || platform.includes('iPad')) deviceType = 'iOS';
  else if (platform.includes('Android')) deviceType = 'Android';
  
  return {
    browser,
    deviceType,
    userAgent: userAgent.substring(0, 100) // Limit length
  };
};

/**
 * Save a trusted device token
 */
export const saveTrustedDevice = async (userId, deviceToken = null, expiresInDays = 30) => {
  try {
    const token = deviceToken || generateDeviceToken();
    const deviceInfo = getDeviceInfo();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + expiresInDays);
    
    const deviceData = {
      token,
      userId,
      createdAt: serverTimestamp(),
      lastUsedAt: serverTimestamp(),
      expiresAt: expiresAt,
      deviceInfo: {
        browser: deviceInfo.browser,
        deviceType: deviceInfo.deviceType,
        userAgent: deviceInfo.userAgent
      }
    };
    
    // Save to Firestore: users/{userId}/trustedDevices/{token}
    const deviceRef = doc(db, COLLECTIONS.USERS, userId, 'trustedDevices', token);
    await setDoc(deviceRef, deviceData, { merge: true });
    
    // Also save token to localStorage for quick access
    localStorage.setItem(`deviceToken_${userId}`, token);
    
    return token;
  } catch (error) {
    console.error('Error saving trusted device:', error);
    throw error;
  }
};

/**
 * Check if a device token is valid
 */
export const checkTrustedDevice = async (userId, deviceToken) => {
  try {
    if (!deviceToken || !userId) return null;
    
    const deviceRef = doc(db, COLLECTIONS.USERS, userId, 'trustedDevices', deviceToken);
    const deviceSnap = await getDoc(deviceRef);
    
    if (!deviceSnap.exists()) {
      // Token doesn't exist, remove from localStorage
      localStorage.removeItem(`deviceToken_${userId}`);
      return null;
    }
    
    const deviceData = deviceSnap.data();
    
    // Check if device was deleted
    if (deviceData.deleted) {
      localStorage.removeItem(`deviceToken_${userId}`);
      return null;
    }
    
    // Check if token has expired
    const expiresAt = deviceData.expiresAt?.toDate?.() || new Date(deviceData.expiresAt);
    if (expiresAt < new Date()) {
      // Token expired, remove it
      await removeTrustedDevice(userId, deviceToken);
      return null;
    }
    
    // Update last used timestamp
    await updateDoc(deviceRef, {
      lastUsedAt: serverTimestamp()
    });
    
    return {
      token: deviceToken,
      ...deviceData,
      id: deviceSnap.id
    };
  } catch (error) {
    console.error('Error checking trusted device:', error);
    // If permission denied, return null (user not authenticated)
    if (error.code === 'permission-denied') {
      return null;
    }
    throw error;
  }
};

/**
 * Remove a trusted device
 */
export const removeTrustedDevice = async (userId, deviceToken) => {
  try {
    const deviceRef = doc(db, COLLECTIONS.USERS, userId, 'trustedDevices', deviceToken);
    // Mark as deleted instead of actually deleting (for audit trail)
    await updateDoc(deviceRef, { 
      deleted: true,
      deletedAt: serverTimestamp()
    });
    
    // Remove from localStorage
    localStorage.removeItem(`deviceToken_${userId}`);
  } catch (error) {
    console.error('Error removing trusted device:', error);
    throw error;
  }
};

/**
 * Get all trusted devices for a user
 */
export const getTrustedDevices = async (userId) => {
  try {
    const devicesRef = collection(db, COLLECTIONS.USERS, userId, 'trustedDevices');
    const devicesSnap = await getDocs(devicesRef);
    
    const devices = [];
    const now = new Date();
    
    devicesSnap.forEach((doc) => {
      const data = doc.data();
      if (!data.deleted) {
        const expiresAt = data.expiresAt?.toDate?.() || new Date(data.expiresAt);
        if (expiresAt > now) {
          devices.push({
            id: doc.id,
            token: data.token,
            createdAt: data.createdAt?.toDate?.() || new Date(data.createdAt),
            lastUsedAt: data.lastUsedAt?.toDate?.() || (data.lastUsedAt ? new Date(data.lastUsedAt) : null),
            expiresAt: expiresAt,
            deviceInfo: data.deviceInfo || {}
          });
        }
      }
    });
    
    return devices;
  } catch (error) {
    console.error('Error getting trusted devices:', error);
    if (error.code === 'permission-denied') {
      return [];
    }
    throw error;
  }
};
