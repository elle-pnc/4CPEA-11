# 🔧 URGENT: Update Firestore Rules for Jeepneys

## You're getting permission errors because jeepneys collection rules aren't configured!

### Quick Fix - Update Your Firestore Rules

1. **Go to Firebase Console**: https://console.firebase.google.com/
2. **Select Project**: `cpe11-48f3f`
3. **Click**: Firestore Database → **Rules** tab
4. **Find the existing rules** and **add these lines** before the closing braces:

```javascript
    // Jeepneys collection - allow read for all authenticated users, write for driver simulation
    match /jeepneys/{jeepneyId} {
      allow read: if isAuthenticated();
      allow create: if isAuthenticated(); // Allow creating new jeepney documents
      allow update: if isAuthenticated(); // Allow updating jeepney data (seat count, route, etc.)
      allow delete: if false; // Don't allow deleting jeepneys
    }
```

### Complete Updated Rules (Full Copy)

If you want to replace all rules, here's the complete updated version:

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
      allow read: if isAuthenticated();
      allow write: if isOwner(userId);
      allow create: if isAuthenticated() && request.auth.uid == userId;
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

    // Jeepneys collection - allow read for all authenticated users, write for driver simulation
    match /jeepneys/{jeepneyId} {
      allow read: if isAuthenticated();
      allow create: if isAuthenticated(); // Allow creating new jeepney documents
      allow update: if isAuthenticated(); // Allow updating jeepney data (seat count, route, etc.)
      allow delete: if false; // Don't allow deleting jeepneys
    }
  }
}
```

5. **Click "Publish"** button
6. **Wait 10-30 seconds** for rules to deploy
7. **Refresh your app**

---

## Why You're Getting These Errors

The `jeepneys` collection needs read/write permissions because:
1. App tries to initialize jeepney document (create)
2. App tries to read jeepney data (read)
3. Driver simulation updates seat count (update)
4. Firestore checks security rules
5. Rules don't allow jeepneys access → Permission denied error

---

## After Setting Up Rules

1. ✅ Rules published
2. ✅ Refresh your app
3. ✅ Check browser console - errors should be gone!
4. ✅ Jeepney should load on both commuter and driver pages

---

## Still Having Issues?

1. **Check Authentication**: Make sure users are actually authenticated (logged in)
2. **Check Rules Syntax**: Firebase Console will show syntax errors in red
3. **Wait for Deployment**: Rules can take 30-60 seconds to fully deploy
4. **Clear Browser Cache**: Sometimes helps with cached permission errors
5. **Check Browser Console**: Look for any other errors that might prevent authentication
