// Firebase Authentication helper functions
import { 
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile,
  updateEmail,
  sendPasswordResetEmail,
  sendEmailVerification
} from 'firebase/auth';
import { auth } from './config';
import { createOrGetUser, getUser } from './firestore';

/**
 * Sign in with email and password
 * @param {string} email - User email
 * @param {string} password - User password
 * @returns {Promise<object>} User object with Firebase Auth user and Firestore data
 */
export const signIn = async (email, password) => {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const firebaseUser = userCredential.user;
    
    // Get or create user document in Firestore
    const userData = await createOrGetUser(firebaseUser.uid, {
      email: firebaseUser.email,
      role: 'commuter'
    });

    return {
      user: firebaseUser,
      userData: userData
    };
  } catch (error) {
    console.error('Sign in error:', error);
    throw error;
  }
};

/**
 * Sign up with email and password
 * @param {string} email - User email
 * @param {string} password - User password
 * @param {object} profileData - Additional profile data (firstName, lastName)
 * @returns {Promise<object>} User object with Firebase Auth user and Firestore data
 */
export const signUp = async (email, password, profileData = {}) => {
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const firebaseUser = userCredential.user;

    // Send email verification
    await sendEmailVerification(firebaseUser);

    // Update profile if provided
    if (profileData.firstName || profileData.lastName) {
      await updateProfile(firebaseUser, {
        displayName: `${profileData.firstName || ''} ${profileData.lastName || ''}`.trim()
      });
    }

    // Create user document in Firestore (self-signup = commuter)
    const userData = await createOrGetUser(firebaseUser.uid, {
      email: firebaseUser.email,
      firstName: profileData.firstName || '',
      lastName: profileData.lastName || '',
      role: 'commuter'
    });

    return {
      user: firebaseUser,
      userData: userData
    };
  } catch (error) {
    console.error('Sign up error:', error);
    throw error;
  }
};

/**
 * Sign out current user
 * @returns {Promise<void>}
 */
export const logOut = async () => {
  try {
    await signOut(auth);
  } catch (error) {
    console.error('Sign out error:', error);
    throw error;
  }
};

/**
 * Update user profile
 * @param {string} uid - Firebase Auth UID
 * @param {object} profileData - Profile data to update (firstName, lastName, email)
 * @returns {Promise<void>}
 */
export const updateUserProfile = async (uid, profileData) => {
  try {
    const updates = {};

    // Update Firebase Auth profile
    if (profileData.firstName || profileData.lastName) {
      const currentUser = auth.currentUser;
      if (currentUser) {
        await updateProfile(currentUser, {
          displayName: `${profileData.firstName || ''} ${profileData.lastName || ''}`.trim()
        });
      }
    }

    // Update email in Firebase Auth if changed
    if (profileData.email && auth.currentUser) {
      await updateEmail(auth.currentUser, profileData.email);
      updates.email = profileData.email;
    }

    // Update Firestore document
    if (profileData.firstName !== undefined) updates.firstName = profileData.firstName;
    if (profileData.lastName !== undefined) updates.lastName = profileData.lastName;
    if (profileData.phoneNumber !== undefined) updates.phoneNumber = profileData.phoneNumber;

    if (Object.keys(updates).length > 0) {
      const { updateUserProfile: updateUserProfileFirestore } = await import('./firestore');
      await updateUserProfileFirestore(uid, updates);
    }
  } catch (error) {
    console.error('Update profile error:', error);
    throw error;
  }
};

/**
 * Change user password
 * @param {string} email - User email
 * @returns {Promise<void>}
 */
export const resetPassword = async (email) => {
  try {
    await sendPasswordResetEmail(auth, email);
  } catch (error) {
    console.error('Password reset error:', error);
    throw error;
  }
};

/**
 * Get current authenticated user with Firestore data
 * @returns {Promise<object|null>} User object or null
 */
export const getCurrentUser = async () => {
  try {
    const currentUser = auth.currentUser;
    if (!currentUser) {
      return null;
    }

    // Get Firestore user data
    const userData = await getUser(currentUser.uid);
    if (!userData) {
      // User doesn't exist in Firestore, create it
      return await createOrGetUser(currentUser.uid, {
        email: currentUser.email
      });
    }

    return {
      ...currentUser,
      ...userData
    };
  } catch (error) {
    console.error('Get current user error:', error);
    return null;
  }
};

/**
 * Listen to authentication state changes
 * @param {function} callback - Callback function called when auth state changes
 * @returns {function} Unsubscribe function
 */
export const onAuthStateChange = (callback) => {
  return onAuthStateChanged(auth, async (firebaseUser) => {
    // Check if we're in 2FA flow - if so, skip ALL Firestore operations
    // This check must happen FIRST before any async operations
    let pendingVerification = false;
    try {
      if (typeof sessionStorage !== 'undefined') {
        pendingVerification = !!sessionStorage.getItem('pendingVerificationEmail');
      }
    } catch (e) {
      // SessionStorage might not be available in some contexts
    }
    
    if (pendingVerification) {
      // During 2FA flow, don't try to access Firestore at all
      // Just return null to keep user unauthenticated until 2FA completes
      callback(null);
      return;
    }
    
    if (firebaseUser) {
      try {
        // Get Firestore user data
        const userData = await getUser(firebaseUser.uid);
        if (!userData) {
          // User doesn't exist in Firestore, create it
          const newUserData = await createOrGetUser(firebaseUser.uid, {
            email: firebaseUser.email
          });
          callback({
            user: firebaseUser,
            userData: newUserData
          });
        } else {
          callback({
            user: firebaseUser,
            userData: userData
          });
        }
      } catch (error) {
        // Only log non-permission errors (permission errors are expected during 2FA flow)
        if (error.code !== 'permission-denied') {
          console.error('Error loading user data in auth listener:', error);
        }
        // Still call callback with Firebase user even if Firestore fails
        callback({
          user: firebaseUser,
          userData: null
        });
      }
    } else {
      callback(null);
    }
  });
};
