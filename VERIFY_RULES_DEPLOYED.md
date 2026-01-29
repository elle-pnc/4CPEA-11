# Verify Firestore Rules Are Deployed

Based on your logs, you're still getting permission errors. This means either:
1. Rules weren't published yet
2. Rules haven't propagated (can take 30-60 seconds)
3. Browser cache needs clearing

## Step 1: Verify Rules in Firebase Console

1. Go to: https://console.firebase.google.com/project/cpe11-48f3f/firestore/rules
2. Check if your rules include this:

```javascript
match /users/{userId} {
  // ... other rules ...
  
  // Trusted devices subcollection
  match /trustedDevices/{deviceToken} {
    allow read, write: if isAuthenticated() && request.auth.uid == userId;
  }
}
```

If you DON'T see the `trustedDevices` subcollection rule, add it and publish again.

## Step 2: Wait for Propagation

After publishing rules, wait **30-60 seconds** for them to fully propagate across Firebase servers.

## Step 3: Clear Browser Cache

Sometimes cached permission errors persist:
1. Open browser DevTools (F12)
2. Right-click the refresh button
3. Select "Empty Cache and Hard Reload"

Or:
- **Chrome/Edge**: Ctrl+Shift+Delete (Cmd+Shift+Delete on Mac)
- Clear "Cached images and files"
- Time range: "All time"

## Step 4: Test Again

1. **Log out** completely
2. **Clear localStorage** (optional, DevTools → Application → Local Storage → Clear)
3. **Log in again**
4. Check if device token check works without errors

## Current Status

From your logs:
- ✅ Device token is being **saved** successfully (after 2FA)
- ❌ Device token **check** is failing (permission denied)
- ❌ Jeepneys listening is failing (permission denied)

This suggests the rules might not be deployed yet or there's a propagation delay.

## Quick Test

Try this in browser console after logging in:

```javascript
// Check if rules allow trusted devices
// This won't work if not authenticated
localStorage.getItem('deviceToken_' + 'your-user-id-here')
```

If you see a token but it's not being checked, the rules are the issue.

## Alternative: Temporary Permissive Rules (For Testing Only)

If rules are taking too long, you can temporarily use more permissive rules just for testing:

```javascript
match /users/{userId} {
  allow read: if isAuthenticated();
  allow write: if isAuthenticated() && request.auth.uid == userId;
  
  match /trustedDevices/{deviceToken} {
    // Temporary: allow all authenticated users (REMOVE THIS IN PRODUCTION!)
    allow read, write: if isAuthenticated();
  }
}
```

**⚠️ WARNING:** This is less secure. Only use for testing, then switch back to the secure rules.
