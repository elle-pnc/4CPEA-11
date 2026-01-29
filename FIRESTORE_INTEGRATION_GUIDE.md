# Firestore Integration Guide

## Overview
This guide explains how Firestore is integrated into the commuter app for account management.

## Installation

First, install Firebase SDK:
```bash
npm install firebase
```

## Firebase Configuration

The Firebase configuration is set up in `src/firebase/config.js` with your provided settings.

## Firestore Collections

### 1. `users` Collection
Stores user account information:
```javascript
{
  email: string,
  firstName: string,
  lastName: string,
  cardNumber: string,
  balance: number,
  currentTerminal: number,
  currentRoute: { from: number, to: number } | null,
  language: string,
  theme: 'light' | 'dark',
  createdAt: Timestamp,
  updatedAt: Timestamp
}
```

### 2. `transactions` Collection
Stores all user transactions (top-ups, trips):
```javascript
{
  userId: string,
  type: 'top-up' | 'trip',
  amount: number,
  paymentMethod: string | null,
  description: string,
  balanceAfter: number | null,
  route: { from: number, to: number } | null,
  timestamp: Timestamp,
  createdAt: Timestamp
}
```

### 3. `verificationCodes` Collection
Stores 2FA verification codes:
```javascript
{
  code: string,
  email: string,
  createdAt: Timestamp,
  expiresAt: Date,
  used: boolean,
  attempts: number,
  verifiedAt: Timestamp | null
}
```

## Key Functions

### User Management (`src/firebase/firestore.js`)
- `createOrGetUser(userId, userData)` - Create or retrieve user document
- `getUser(userId)` - Get user by ID
- `updateUser(userId, updates)` - Update user document
- `updateUserBalance(userId, amount)` - Update balance with increment
- `updateUserTerminal(userId, terminal)` - Update current terminal
- `updateUserRoute(userId, route)` - Update current route
- `updateUserPreferences(userId, language, theme)` - Update preferences

### Transaction Management
- `addTransaction(userId, transactionData)` - Add new transaction
- `getUserTransactions(userId, limitCount)` - Get user transactions

### Verification Code Management
- `storeVerificationCode(email, code, expiresInMinutes)` - Store verification code
- `verifyCode(email, code)` - Verify and mark code as used
- `deleteVerificationCode(email)` - Clean up code

### Authentication (`src/firebase/auth.js`)
- `signIn(email, password)` - Sign in with Firebase Auth
- `signUp(email, password, profileData)` - Create new account
- `logOut()` - Sign out
- `updateUserProfile(uid, profileData)` - Update profile
- `resetPassword(email)` - Send password reset email
- `onAuthStateChange(callback)` - Listen to auth state changes

## Implementation Status

### ✅ Completed
1. Firebase configuration setup
2. Firestore helper functions
3. Firebase Auth helper functions
4. App.jsx updated to use Firebase Auth state
5. LoginPage updated to use Firebase Auth
6. TwoStepVerificationPage updated to verify codes and sign in

### 🔄 Remaining
1. Update CommuterDashboard to sync:
   - Balance updates to Firestore
   - Transaction creation to Firestore
   - Terminal and route updates to Firestore
   - Load transactions from Firestore on mount

2. Update UserProfilePage to sync:
   - Profile updates to Firestore
   - Password verification before updates

3. Update other pages (ChooseDestinationPage, SelectOriginPage, HistoryPage, SettingsPage) to sync with Firestore

## Firestore Security Rules

You'll need to set up Firestore security rules in Firebase Console:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users collection - users can only read/write their own document
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    
    // Transactions collection - users can only read/write their own transactions
    match /transactions/{transactionId} {
      allow read, write: if request.auth != null && 
        request.auth.uid == resource.data.userId;
    }
    
    // Verification codes - users can only create and read their own codes
    match /verificationCodes/{email} {
      allow read: if request.auth != null && 
        request.auth.token.email == email;
      allow write: if request.auth != null;
    }
  }
}
```

## Next Steps

1. Run `npm install firebase` to install the Firebase SDK
2. Update remaining components to sync with Firestore
3. Set up Firestore security rules in Firebase Console
4. Test the authentication flow
5. Test transaction syncing
6. Set up Cloud Functions for sending verification emails (optional)
