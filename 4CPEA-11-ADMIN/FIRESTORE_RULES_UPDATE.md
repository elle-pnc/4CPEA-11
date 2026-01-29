# Firestore Rules Update for Admin Dashboard

## Issue
The admin dashboard was getting permission errors when trying to access Firestore collections, specifically:
- `driverExpenses` collection - needed to read all expenses for dashboard calculations
- Access control checks failing for real-time listeners

## Solution
Updated Firestore security rules to allow authenticated users to read all `driverExpenses` (needed for admin dashboard to calculate total expenses).

## Updated Rules

The `driverExpenses` collection rule has been updated from:
```javascript
allow read: if isAuthenticated() && resource.data.userId == request.auth.uid;
```

To:
```javascript
allow read: if isAuthenticated();
```

This allows all authenticated users (including admins) to read all expenses, which is necessary for the admin dashboard to display total expenses across all drivers.

## How to Deploy Updated Rules

### Option 1: Firebase Console (Recommended)

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project: `cpe11-48f3f`
3. Navigate to **Firestore Database** → **Rules**
4. Copy the updated rules from `/Users/lloyd/4CPEA-11/firestore-rules.txt`
5. Paste into the rules editor
6. Click **Publish**

### Option 2: Firebase CLI

1. Install Firebase CLI (if not already installed):
   ```bash
   npm install -g firebase-tools
   ```

2. Login to Firebase:
   ```bash
   firebase login
   ```

3. Initialize Firebase in the project (if not already done):
   ```bash
   cd /Users/lloyd/4CPEA-11
   firebase init firestore
   ```

4. Copy the rules file:
   ```bash
   cp firestore-rules.txt firestore.rules
   ```

5. Deploy the rules:
   ```bash
   firebase deploy --only firestore:rules
   ```

## Security Note

The updated rules allow all authenticated users to **read** all expenses. This is necessary for the admin dashboard functionality. However:

- Users can still only **create/update** their own expenses
- Users cannot **delete** expenses
- Only authenticated users can access the data

If you want to restrict admin access more specifically in the future, you can:
1. Add a `role` field to user documents (e.g., 'admin', 'driver', 'commuter')
2. Create a helper function in rules to check if user is admin
3. Update rules to allow admins to read all expenses, but regular users only their own

Example future implementation:
```javascript
function isAdmin() {
  return isAuthenticated() && 
         get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin';
}

match /driverExpenses/{expenseId} {
  allow read: if isAuthenticated() && (isAdmin() || resource.data.userId == request.auth.uid);
  // ... rest of rules
}
```

## Testing

After deploying the rules, test the admin dashboard:
1. Login to the admin dashboard
2. Verify that expenses are loading correctly
3. Check browser console for any permission errors
4. Verify terminal activity is updating in real-time

## Current Rules Summary

- **users**: All authenticated users can read, users can only write their own
- **transactions**: All authenticated users can read (needed for revenue calculations)
- **driverExpenses**: All authenticated users can read (needed for admin dashboard)
- **jeepneys**: All authenticated users can read
- **driverShifts**: Users can only read their own shifts
