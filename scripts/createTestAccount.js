/**
 * Simple Browser Console Script to Create Test Accounts
 * 
 * Copy and paste this entire script into your browser console
 * Make sure you're on your app's page (localhost:3000 or wherever it's running)
 */

// Step 1: Import Firebase functions (if not already available)
async function createTestAccount(email, password, userData) {
  try {
    // Import Firebase modules
    const { createUserWithEmailAndPassword } = await import('firebase/auth');
    const { doc, setDoc } = await import('firebase/firestore');
    const { auth, db } = await import('../src/firebase/config.js');

    console.log(`Creating account: ${email}...`);

    // Create user in Firebase Auth
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;
    
    console.log(`✓ Auth user created: ${user.uid}`);

    // Create user document in Firestore
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

    console.log(`✓ Firestore document created`);
    console.log(`✅ Account created successfully: ${email}`);
    console.log(`   UID: ${user.uid}`);
    return { success: true, uid: user.uid };
  } catch (error) {
    console.error(`❌ Error creating account:`, error.message);
    if (error.code === 'auth/email-already-in-use') {
      console.log('💡 User already exists. If you want to update Firestore data, use updateFirestoreData()');
    }
    return { success: false, error: error.message };
  }
}

// Helper function to update Firestore for existing Auth users
async function updateFirestoreForExistingUser(email, userData) {
  try {
    const { getUserByEmail } = await import('firebase/auth');
    const { doc, setDoc } = await import('firebase/firestore');
    const { auth, db } = await import('../src/firebase/config.js');

    // Note: getUserByEmail requires Admin SDK, so we'll use a workaround
    console.log('⚠️ This requires the user UID. Please provide it.');
    return null;
  } catch (error) {
    console.error('Error:', error);
  }
}

// Helper function if you already have the UID
async function createFirestoreDoc(uid, email, userData) {
  try {
    const { doc, setDoc } = await import('firebase/firestore');
    const { db } = await import('../src/firebase/config.js');

    const userRef = doc(db, 'users', uid);
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

    console.log(`✅ Firestore document created for UID: ${uid}`);
    return { success: true };
  } catch (error) {
    console.error(`❌ Error:`, error.message);
    return { success: false, error: error.message };
  }
}

// Batch create multiple test accounts
async function createTestAccounts() {
  const accounts = [
    {
      email: 'test1@example.com',
      password: 'Test1234!',
      userData: {
        firstName: 'Juan',
        lastName: 'Dela Cruz',
        balance: 500.00,
        currentTerminal: 1,
        language: 'English',
        theme: 'light'
      }
    },
    {
      email: 'test2@example.com',
      password: 'Test1234!',
      userData: {
        firstName: 'Maria',
        lastName: 'Santos',
        balance: 250.00,
        currentTerminal: 2,
        language: 'Filipino',
        theme: 'dark'
      }
    },
    {
      email: 'admin@example.com',
      password: 'Admin1234!',
      userData: {
        firstName: 'Admin',
        lastName: 'User',
        balance: 1000.00,
        currentTerminal: 1,
        language: 'English',
        theme: 'light'
      }
    }
  ];

  console.log('🚀 Starting batch account creation...\n');
  
  const results = [];
  for (const account of accounts) {
    const result = await createTestAccount(account.email, account.password, account.userData);
    results.push({ email: account.email, ...result });
    await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second between accounts
  }

  console.log('\n📊 Summary:');
  const successful = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;
  console.log(`✅ Successful: ${successful}`);
  console.log(`❌ Failed: ${failed}`);

  return results;
}

// Make functions available globally in browser console
if (typeof window !== 'undefined') {
  window.createTestAccount = createTestAccount;
  window.createFirestoreDoc = createFirestoreDoc;
  window.createTestAccounts = createTestAccounts;
  
  console.log('✅ Script loaded! Available functions:');
  console.log('   - createTestAccount(email, password, userData)');
  console.log('   - createFirestoreDoc(uid, email, userData)');
  console.log('   - createTestAccounts() - Creates all test accounts');
  console.log('\n💡 Example:');
  console.log('   createTestAccount("test@example.com", "Test1234!", { firstName: "John", lastName: "Doe", balance: 500 })');
}
