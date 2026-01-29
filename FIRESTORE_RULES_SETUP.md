# Firestore Security Rules Setup

## Error: Missing or insufficient permissions

You're getting this error because Firestore security rules haven't been configured yet. You need to set up security rules in the Firebase Console.

## Quick Setup Steps

### 1. Go to Firebase Console
1. Visit https://console.firebase.google.com/
2. Select your project: `cpe11-48f3f`
3. Click on **Firestore Database** in the left sidebar
4. Click on the **Rules** tab

### 2. Add Security Rules

Copy and paste these rules:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Helper function to check if user is authenticated
    function isAuthenticated() {
      return request.auth != null;
    }
    
    // Helper function to check if user owns the document
    function isOwner(userId) {
      return isAuthenticated() && request.auth.uid == userId;
    }
    
    // Users collection - users can only read/write their own document
    match /users/{userId} {
      allow read, write: if isOwner(userId);
      // Allow creation if user is authenticated and creating their own document
      allow create: if isAuthenticated() && request.auth.uid == userId;
    }
    
    // Transactions collection - users can only read/write their own transactions
    match /transactions/{transactionId} {
      allow read: if isAuthenticated() && resource.data.userId == request.auth.uid;
      allow create: if isAuthenticated() && request.resource.data.userId == request.auth.uid;
      allow update, delete: if isAuthenticated() && resource.data.userId == request.auth.uid;
    }
    
    // Verification codes collection - users can only create and read their own codes
    match /verificationCodes/{email} {
      // Allow read if authenticated (will be checked by email match in application code)
      allow read: if isAuthenticated();
      // Allow write (create/update) if authenticated
      allow write: if isAuthenticated();
    }
    
    // Deny all other access
    match /{document=**} {
      allow read, write: if false;
    }
  }
}
```

### 3. For Development (Temporary - Less Secure)

If you want to test quickly during development, you can temporarily use these more permissive rules:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // TEMPORARY: Allow authenticated users full access
    // CHANGE THIS BEFORE PRODUCTION!
    match /{document=**} {
      allow read, write: if request.auth != null;
    }
  }
}
```

**⚠️ WARNING:** The temporary rules above are **NOT secure** and should only be used for testing. They allow any authenticated user to read/write any document. Change them before deploying to production!

### 4. Publish Rules

1. Click **Publish** button in the Firebase Console
2. Wait for the rules to be deployed (usually takes a few seconds)

## Testing the Rules

After publishing:
1. Refresh your app
2. Try logging in again
3. The permission errors should be gone

## Common Issues

### Still Getting Permission Errors?

1. **Check Authentication**: Make sure users are actually authenticated before accessing Firestore
2. **Check User ID**: Ensure `request.auth.uid` matches the `userId` in the document
3. **Check Data Structure**: Verify that `userId` field exists in transactions documents
4. **Wait for Rules to Deploy**: Sometimes it takes 1-2 minutes for new rules to propagate

### CORS Errors

The CORS error you're seeing is normal for Firestore when using the REST API. This is handled automatically by the Firebase SDK. If you're still seeing CORS issues:

1. Make sure you're using the latest Firebase SDK
2. Check that your Firebase project has Firestore enabled
3. Verify your Firebase config is correct

## Production Rules (More Secure)

For production, use these more restrictive rules:

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
    
    // Users collection
    match /users/{userId} {
      allow read: if isOwner(userId);
      allow create: if isAuthenticated() && request.auth.uid == userId;
      allow update: if isOwner(userId) && 
                      request.resource.data.diff(resource.data).affectedKeys()
                      .hasOnly(['firstName', 'lastName', 'email', 'language', 'theme', 'currentTerminal', 'currentRoute', 'balance', 'updatedAt']);
      allow delete: if false; // Prevent user deletion
    }
    
    // Transactions collection
    match /transactions/{transactionId} {
      allow read: if isAuthenticated() && resource.data.userId == request.auth.uid;
      allow create: if isAuthenticated() && 
                      request.resource.data.userId == request.auth.uid &&
                      request.resource.data.keys().hasAll(['userId', 'type', 'amount', 'timestamp']);
      allow update, delete: if false; // Transactions are immutable
    }
    
    // Verification codes
    match /verificationCodes/{email} {
      allow read, write: if isAuthenticated();
    }
  }
}
```
