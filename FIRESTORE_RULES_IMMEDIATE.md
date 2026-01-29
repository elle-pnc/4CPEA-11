# ⚠️ URGENT: Firestore Security Rules Setup

## You're getting permission errors because Firestore rules aren't configured!

### Quick Fix (Copy & Paste These Rules)

1. **Go to Firebase Console**: https://console.firebase.google.com/
2. **Select Project**: `cpe11-48f3f`
3. **Click**: Firestore Database → **Rules** tab
4. **Delete everything** in the rules editor
5. **Paste these rules**:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Helper functions
    function isAuthenticated() {
      return request.auth != null;
    }
    
    function isOwner(userId) {
      return isAuthenticated() && request.auth.uid == userId;
    }
    
    // Users collection - users can only access their own document
    match /users/{userId} {
      // Allow authenticated users to read all users (for driver simulation)
      allow read: if isAuthenticated();
      // Users can only write their own data
      allow write: if isOwner(userId);
      allow create: if isAuthenticated() && request.auth.uid == userId;
      
      // Trusted devices subcollection - users can manage their own devices
      match /trustedDevices/{deviceToken} {
        allow read, write: if isAuthenticated() && request.auth.uid == userId;
      }
    }
    
    // Transactions collection - users can only access their own transactions
    match /transactions/{transactionId} {
      allow read: if isAuthenticated() && resource.data.userId == request.auth.uid;
      allow create: if isAuthenticated() && request.resource.data.userId == request.auth.uid;
      allow update, delete: if isAuthenticated() && resource.data.userId == request.auth.uid;
    }
    
    // Verification codes - allow unauthenticated access for 2FA flow
    match /verificationCodes/{email} {
      allow read, write: if true;
    }
    
    // Jeepneys collection - allow read/write for authenticated users
    match /jeepneys/{jeepneyId} {
      allow read: if isAuthenticated();
      allow create: if isAuthenticated();
      allow update: if isAuthenticated();
      allow delete: if false; // Don't allow deleting jeepneys
    }
  }
}
```

6. **Click "Publish"** button
7. **Wait 10-30 seconds** for rules to deploy
8. **Refresh your app**

---

## Alternative: Temporary Development Rules (Less Secure)

If you want to test quickly without restrictions (⚠️ NOT for production):

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // TEMPORARY: Allow all authenticated users full access
    // ⚠️ CHANGE THIS BEFORE PRODUCTION!
    match /{document=**} {
      allow read, write: if request.auth != null;
    }
  }
}
```

**⚠️ WARNING**: These rules allow any authenticated user to read/write ANY document. Only use for development!

---

## Why You're Getting These Errors

The `verificationCodes` collection needs write permissions for authenticated users because:
1. User logs in → App tries to store verification code
2. Firestore checks security rules
3. Rules don't allow write → Permission denied error

After adding the rules above, the login flow will work!

---

## After Setting Up Rules

1. ✅ Rules published
2. ✅ Refresh your app
3. ✅ Try logging in again
4. ✅ Errors should be gone!

---

## Still Having Issues?

1. **Check Authentication**: Make sure users are actually authenticated
2. **Check Rules Syntax**: Make sure there are no syntax errors (Firebase Console will show errors)
3. **Wait for Deployment**: Rules can take 30-60 seconds to fully deploy
4. **Clear Browser Cache**: Sometimes helps with cached permission errors
