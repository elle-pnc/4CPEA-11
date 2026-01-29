# Update Firestore Rules for Trusted Devices

You need to update your Firestore security rules to allow users to manage their trusted devices.

## Update Rules

1. **Go to Firebase Console:**
   - https://console.firebase.google.com/project/cpe11-48f3f/firestore/rules

2. **Copy and paste these updated rules:**

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
    
    // Users collection
    match /users/{userId} {
      // Allow users to read all users (for driver simulation)
      allow read: if isAuthenticated();
      
      // Users can only write their own data
      allow write: if isOwner(userId);
      
      // Trusted devices subcollection
      match /trustedDevices/{deviceToken} {
        // Users can read/write their own trusted devices
        allow read, write: if isAuthenticated() && request.auth.uid == userId;
      }
    }
    
    // Legacy User collection (for migration)
    match /User/{userId} {
      allow read: if isOwner(userId);
      allow write: if false; // Prevent new writes, only allow reads for migration
    }
    
    // Transactions collection
    match /transactions/{transactionId} {
      allow read, write: if isAuthenticated() && request.auth.uid == resource.data.userId;
      allow create: if isAuthenticated() && request.auth.uid == request.resource.data.userId;
    }
    
    // Verification codes collection (allow unauthenticated access for 2FA)
    match /verificationCodes/{codeId} {
      allow read, write: if true;
    }
    
    // Jeepneys collection
    match /jeepneys/{jeepneyId} {
      allow read: if isAuthenticated();
      allow create: if isAuthenticated();
      allow update: if isAuthenticated();
      allow delete: if false;
    }
  }
}
```

3. **Click "Publish"**

## What These Rules Do:

- **Trusted Devices Subcollection:**
  - Users can read/write their own trusted devices only
  - `request.auth.uid == userId` ensures users can only access devices under their own user document
  - Allows creating, reading, updating, and deleting device tokens for the authenticated user's account

- **Jeepneys Collection:**
  - All authenticated users can read jeepney data
  - All authenticated users can create/update jeepney data
  - Prevents deletion

## After Updating Rules:

1. Rules will take effect immediately (usually within a few seconds)
2. The "Remember this device" feature will work
3. Jeepney listening errors should be resolved

---

**Note:** The rules file `firestore-rules.txt` has also been updated with these changes.
