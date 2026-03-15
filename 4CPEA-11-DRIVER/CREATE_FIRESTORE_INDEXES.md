# Create Firestore Indexes - Quick Guide

## Missing Indexes

You need to create 2 Firestore indexes for the driver dashboard to work properly:

### Index 1: Transactions (for detecting route extensions)
- **Collection**: `transactions`
- **Fields**:
  1. `userId` (Ascending)
  2. `type` (Ascending)
  3. `timestamp` (Ascending)

### Index 2: Driver Expenses (for daily expenses)
- **Collection**: `driverExpenses`
- **Fields**:
  1. `userId` (Ascending)
  2. `createdAt` (Ascending)

## How to Create Indexes

### Option 1: Use the Error Links (Easiest)

1. **Open the browser console** and look for the error messages
2. **Click on the index creation link** in the error message
3. Firebase Console will open with the index pre-configured
4. Click **Create Index**
5. Wait for the index to build (usually takes a few minutes)

### Option 2: Deploy via Firebase CLI

```bash
cd /Users/lloyd/4CPEA-11/4CPEA-11-DRIVER
firebase deploy --only firestore:indexes
```

### Option 3: Manual Creation in Firebase Console

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select project: `cpe11-48f3f`
3. Navigate to **Firestore Database** → **Indexes** tab
4. Click **Create Index**

**For Transactions Index:**
- Collection: `transactions`
- Fields:
  - `userId` (Ascending)
  - `type` (Ascending)
  - `timestamp` (Ascending)

**For Driver Expenses Index:**
- Collection: `driverExpenses`
- Fields:
  - `userId` (Ascending)
  - `createdAt` (Ascending)

5. Click **Create** for each index
6. Wait for indexes to build (status will show "Building" then "Enabled")

## After Creating Indexes

Once the indexes are created and enabled:
1. Refresh the driver dashboard
2. The errors should disappear
3. The "Extended" label should work correctly
4. Daily expenses should load properly

## Note

- Indexes can take a few minutes to build
- The dashboard will use fallback queries until indexes are ready
- You can check index status in Firebase Console → Firestore → Indexes
