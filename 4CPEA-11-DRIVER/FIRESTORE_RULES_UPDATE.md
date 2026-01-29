# Firestore Rules Update for Driver Dashboard

## Required Updates

The driver dashboard requires additional Firestore security rules for the following collections:

1. **dailyExpenses** - For storing daily expense data
2. **driverShifts** - For managing driver shift data

## Steps to Update Firestore Rules

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project: `cpe11-48f3f`
3. Navigate to **Firestore Database** → **Rules** tab
4. Copy and paste the updated rules from `firestore-rules.txt` in the main project
5. Click **Publish** to deploy the rules

## Updated Rules Section

Add these rules to your Firestore security rules:

```javascript
// Driver shifts collection - drivers can manage their own shifts
match /driverShifts/{shiftId} {
  allow read: if isAuthenticated() && resource.data.userId == request.auth.uid;
  allow create: if isAuthenticated() && request.resource.data.userId == request.auth.uid;
  allow update: if isAuthenticated() && resource.data.userId == request.auth.uid;
  allow delete: if false;
}

// Daily expenses collection - drivers can manage their own expenses
match /dailyExpenses/{expenseId} {
  allow read: if isAuthenticated() && resource.data.userId == request.auth.uid;
  allow create: if isAuthenticated() && request.resource.data.userId == request.auth.uid;
  allow update: if isAuthenticated() && resource.data.userId == request.auth.uid;
  allow delete: if false;
}
```

## Firestore Indexes

The `firestore.indexes.json` file contains the required indexes. To deploy them:

### Option 1: Deploy via Firebase CLI
```bash
cd 4CPEA-11-DRIVER
firebase deploy --only firestore:indexes
```

### Option 2: Manual Creation in Firebase Console

1. Go to **Firestore Database** → **Indexes** tab
2. Click **Create Index** for each required index:

**Index 1: Transactions (for daily revenue/passenger count)**
- Collection: `transactions`
- Fields: 
  - `type` (Ascending)
  - `timestamp` (Ascending)

**Index 2: Driver Shifts (for shift management)**
- Collection: `driverShifts`
- Fields:
  - `userId` (Ascending)
  - `status` (Ascending)
  - `startAt` (Descending)

### Option 3: Use Error Link
If you see an index error, click the link provided in the error message to create it automatically.

## Verification

After updating the rules:
1. Refresh the driver dashboard
2. Try clicking the Expenses stat card
3. Add an expense to verify it saves correctly
4. Check that expenses display correctly
