/**
 * Script to pre-populate test accounts in Firebase Auth and Firestore
 * 
 * Usage:
 * 1. Make sure you have Firebase Admin SDK set up, OR
 * 2. Run this from a Node.js environment with Firebase Admin, OR
 * 3. Use the browser console version (see seedAccounts-browser.js)
 * 
 * Note: This requires Firebase Admin SDK for creating Auth users.
 * For a simpler approach, you can create users manually through Firebase Console
 * and use seedFirestoreOnly.js to populate Firestore data.
 */

import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Initialize Firebase Admin
// Option 1: Using service account key file
// const serviceAccount = JSON.parse(readFileSync('./path/to/serviceAccountKey.json', 'utf8'));
// initializeApp({ credential: cert(serviceAccount) });

// Option 2: Using environment variables (recommended for production)
// initializeApp({
//   credential: cert({
//     projectId: process.env.FIREBASE_PROJECT_ID,
//     clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
//     privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
//   }),
// });

// Option 3: Auto-initialize if already initialized (for Firebase Cloud Functions)
if (!getApps().length) {
  // You'll need to configure this based on your setup
  console.error('Firebase Admin not initialized. Please set it up first.');
  process.exit(1);
}

const auth = getAuth();
const db = getFirestore();

// Test accounts to create
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
  },
  {
    email: 'admin@example.com',
    password: 'Admin1234!',
    firstName: 'Admin',
    lastName: 'User',
    balance: 1000.00,
    currentTerminal: 1,
    language: 'English',
    theme: 'light'
  }
];

/**
 * Create a user account in Firebase Auth and Firestore
 */
async function createAccount(accountData) {
  try {
    // 1. Create user in Firebase Auth
    const userRecord = await auth.createUser({
      email: accountData.email,
      password: accountData.password,
      displayName: `${accountData.firstName} ${accountData.lastName}`,
      emailVerified: true // Set to true for test accounts
    });

    console.log(`✓ Created Auth user: ${userRecord.uid} (${accountData.email})`);

    // 2. Create user document in Firestore
    const userRef = db.collection('users').doc(userRecord.uid);
    await userRef.set({
      email: accountData.email,
      firstName: accountData.firstName,
      lastName: accountData.lastName,
      cardNumber: '0000 0000 0000',
      balance: accountData.balance,
      currentTerminal: accountData.currentTerminal,
      currentRoute: null,
      language: accountData.language,
      theme: accountData.theme,
      createdAt: new Date(),
      updatedAt: new Date()
    });

    console.log(`✓ Created Firestore document for: ${accountData.email}`);

    // 3. (Optional) Create sample transactions
    const sampleTransactions = [
      {
        userId: userRecord.uid,
        type: 'top-up',
        amount: accountData.balance,
        paymentMethod: 'gcash',
        description: `Initial Top-Up via GCash`,
        balanceAfter: accountData.balance,
        timestamp: new Date(),
        createdAt: new Date()
      }
    ];

    for (const transaction of sampleTransactions) {
      await db.collection('transactions').add(transaction);
    }

    console.log(`✓ Created sample transactions for: ${accountData.email}`);

    return userRecord.uid;
  } catch (error) {
    if (error.code === 'auth/email-already-exists') {
      console.log(`⚠ User ${accountData.email} already exists in Auth. Skipping...`);
      // Try to get existing user and update Firestore
      try {
        const existingUser = await auth.getUserByEmail(accountData.email);
        const userRef = db.collection('users').doc(existingUser.uid);
        await userRef.set({
          email: accountData.email,
          firstName: accountData.firstName,
          lastName: accountData.lastName,
          cardNumber: '0000 0000 0000',
          balance: accountData.balance,
          currentTerminal: accountData.currentTerminal,
          currentRoute: null,
          language: accountData.language,
          theme: accountData.theme,
          updatedAt: new Date()
        }, { merge: true });
        console.log(`✓ Updated Firestore document for existing user: ${accountData.email}`);
        return existingUser.uid;
      } catch (updateError) {
        console.error(`✗ Error updating existing user ${accountData.email}:`, updateError.message);
      }
    } else {
      console.error(`✗ Error creating account ${accountData.email}:`, error.message);
    }
    throw error;
  }
}

/**
 * Main function to seed all accounts
 */
async function seedAccounts() {
  console.log('Starting account seeding...\n');

  const created = [];
  const errors = [];

  for (const account of testAccounts) {
    try {
      const uid = await createAccount(account);
      created.push({ email: account.email, uid });
    } catch (error) {
      errors.push({ email: account.email, error: error.message });
    }
    console.log(''); // Empty line between accounts
  }

  console.log('='.repeat(50));
  console.log('Seeding Summary:');
  console.log(`✓ Successfully created: ${created.length}`);
  console.log(`✗ Errors: ${errors.length}\n`);

  if (created.length > 0) {
    console.log('Created accounts:');
    created.forEach(({ email, uid }) => {
      console.log(`  - ${email} (${uid})`);
    });
  }

  if (errors.length > 0) {
    console.log('\nErrors:');
    errors.forEach(({ email, error }) => {
      console.log(`  - ${email}: ${error}`);
    });
  }

  console.log('\n✓ Account seeding completed!');
}

// Run the seeding
seedAccounts()
  .then(() => {
    console.log('\nAll done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\nFatal error:', error);
    process.exit(1);
  });
