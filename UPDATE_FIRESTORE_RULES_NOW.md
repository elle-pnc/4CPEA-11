# ⚠️ URGENT: Update Firestore Rules for Trusted Devices & Jeepneys

You're getting permission errors because Firestore rules need to be updated for:
1. **Trusted devices** subcollection (for "Remember this device" feature)
2. **Jeepneys** collection (for driver simulation)

## Quick Fix - Copy & Paste These Rules

1. **Go to Firebase Console:**
   - https://console.firebase.google.com/project/cpe11-48f3f/firestore/rules

2. **Delete everything** in the rules editor

3. **Paste these complete rules:**

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    function isAuthenticated() {
      return request.auth != null;
    }
    
    function isOwner(userId) {
      return isAuthenticated() && request.auth.uid == userId;
    }
    
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
    
    match /User/{userId} {
      allow read: if isOwner(userId);
      allow write: if false;
    }
    
    match /transactions/{transactionId} {
      allow read: if isAuthenticated() && resource.data.userId == request.auth.uid;
      allow create: if isAuthenticated() && request.resource.data.userId == request.auth.uid;
      allow update, delete: if isAuthenticated() && resource.data.userId == request.auth.uid;
    }
    
    match /verificationCodes/{email} {
      allow read, write: if true;
    }

    match /jeepneys/{jeepneyId} {
      allow read: if isAuthenticated();
      allow create: if isAuthenticated();
      allow update: if isAuthenticated();
      allow delete: if false;
    }
  }
}
```

4. **Click "Publish"** button

5. **Wait 10-30 seconds** for rules to deploy

6. **Refresh your app** and try again

## What These Rules Add:

- **Trusted Devices Subcollection:**
  - `match /trustedDevices/{deviceToken}` - New subcollection rule
  - Users can read/write their own trusted devices only
  - `request.auth.uid == userId` ensures security

- **Jeepneys Collection:**
  - Already exists, but verify it's there
  - Allows authenticated users to read/update jeepney data

## After Updating:

✅ "Remember this device" feature will work
✅ Jeepney listening errors will be resolved
✅ No more permission denied errors

---

**Important:** The updated rules file is also saved in `firestore-rules.txt`
