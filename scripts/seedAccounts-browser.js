/**
 * Browser Console Version - Seed Accounts
 * 
 * This script can be run directly in the browser console after logging in as an admin.
 * Or use it as a reference to create accounts manually.
 * 
 * Instructions:
 * 1. Open your app in the browser
 * 2. Open Developer Console (F12)
 * 3. Make sure you're logged in (or have Firebase Admin access)
 * 4. Copy and paste this entire script
 * 5. Run seedAccountsFromBrowser()
 * 
 * Note: This requires Firebase Admin access. For regular users, create accounts
 * through the Firebase Console or use the Firebase Admin SDK version.
 */

// Import Firebase functions (these should already be available in your app)
// import { createUserWithEmailAndPassword } from 'firebase/auth';
// import { collection, addDoc, doc, setDoc } from 'firebase/firestore';
// import { auth, db } from '../src/firebase/config';

/**
 * Browser console function to seed accounts
 * This is a helper function that uses the client SDK
 * Note: You cannot create Auth users with client SDK - you need Admin SDK
 * 
 * This version only creates Firestore documents for existing Auth users
 */
async function seedFirestoreForExistingUsers() {
  const { getAuth, createUserWithEmailAndPassword } = await import('firebase/auth');
  const { getFirestore, collection, doc, setDoc } = await import('firebase/firestore');
  const { auth, db } = await import('../src/firebase/config.js');
  
  const testAccounts = [
    {
      email: 'test1@example.com',
      password: 'Test1234!',
      firstName: 'Juan',
      lastName: 'Dela Cruz',
      balance: 500.00,
      currentTerminal: 1,
      language: 'English',
      theme: 'light'
    },
    {
      email: 'test2@example.com',
      password: 'Test1234!',
      firstName: 'Maria',
      lastName: 'Santos',
      balance: 250.00,
      currentTerminal: 2,
      language: 'Filipino',
      theme: 'dark'
    }
  ];

  console.log('Creating test accounts...\n');

  for (const account of testAccounts) {
    try {
      // Create user in Firebase Auth
      const userCredential = await createUserWithEmailAndPassword(auth, account.email, account.password);
      const user = userCredential.user;
      
      console.log(`✓ Created Auth user: ${user.uid} (${account.email})`);

      // Create user document in Firestore
      const userRef = doc(db, 'users', user.uid);
      await setDoc(userRef, {
        email: account.email,
        firstName: account.firstName,
        lastName: account.lastName,
        cardNumber: '0000 0000 0000',
        balance: account.balance,
        currentTerminal: account.currentTerminal,
        currentRoute: null,
        language: account.language,
        theme: account.theme,
        createdAt: new Date(),
        updatedAt: new Date()
      });

      console.log(`✓ Created Firestore document for: ${account.email}\n`);
    } catch (error) {
      if (error.code === 'auth/email-already-in-use') {
        console.log(`⚠ User ${account.email} already exists. Skipping...\n`);
      } else {
        console.error(`✗ Error creating account ${account.email}:`, error.message, '\n');
      }
    }
  }

  console.log('✓ Account seeding completed!');
}

// Export for use in browser console
if (typeof window !== 'undefined') {
  window.seedFirestoreForExistingUsers = seedFirestoreForExistingUsers;
}

// Also create a simpler manual entry version
window.createTestAccount = async function(email, password, userData) {
  const { createUserWithEmailAndPassword } = await import('firebase/auth');
  const { doc, setDoc } = await import('firebase/firestore');
  const { auth, db } = await import('../src/firebase/config.js');

  try {
    // Create Auth user
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;
    
    // Create Firestore document
    const userRef = doc(db, 'users', user.uid);
    await setDoc(userRef, {
      email: email,
      firstName: userData.firstName || '',
      lastName: userData.lastName || '',
      cardNumber: userData.cardNumber || '0000 0000 0000',
      balance: userData.balance || 250.00,
      currentTerminal: userData.currentTerminal || 1,
      currentRoute: null,
      language: userData.language || 'English',
      theme: userData.theme || 'light',
      createdAt: new Date(),
      updatedAt: new Date()
    });

    console.log(`✓ Created account: ${email} (${user.uid})`);
    return user.uid;
  } catch (error) {
    console.error(`✗ Error:`, error.message);
    throw error;
  }
};
