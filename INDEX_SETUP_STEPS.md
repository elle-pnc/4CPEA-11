# ⚠️ IMPORTANT: Create Firestore Index

## The Error You're Seeing

Your app needs a Firestore composite index to query transactions. The app will work, but transactions will be empty until you create the index.

## Step-by-Step Instructions

### Option 1: Click the Link (Easiest)

1. **Copy this link** from your browser console error:
   ```
   https://console.firebase.google.com/v1/r/project/cpe11-48f3f/firestore/indexes?create_composite=ClBwcm9qZWN0cy9jcGUxMS00OGYzZi9kYXRhYmFzZXMvKGRlZmF1bHQpL2NvbGxlY3Rpb25Hcm91cHMvdHJhbnNhY3Rpb25zL2luZGV4ZXMvXxABGgoKBnVzZXJJZBABGg0KCXRpbWVzdGFtcBACGgwKCF9fbmFtZV9fEAI
   ```

2. **Paste it in your browser** and press Enter
3. **Click "Create Index"** button
4. **Wait 1-5 minutes** for the index to build
5. **Refresh your app**

### Option 2: Manual Creation

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select project: **cpe11-48f3f**
3. Click **Firestore Database** in left sidebar
4. Click **Indexes** tab
5. Click **Create Index** button
6. Fill in:
   - **Collection ID**: `transactions`
   - **Fields to index**:
     - Click **Add field**
       - Field: `userId`
       - Order: **Ascending** ⬆️
     - Click **Add field** again
       - Field: `timestamp`
       - Order: **Descending** ⬇️
   - **Query scope**: Collection
7. Click **Create**
8. Wait 1-5 minutes for status to change from "Building" to "Enabled"
9. Refresh your app

## How to Check Index Status

1. Go to Firebase Console → Firestore → Indexes
2. Look for an index on `transactions` collection
3. Status will show:
   - **Building** ⏳ = Still creating (wait a few minutes)
   - **Enabled** ✅ = Ready to use!

## What Happens Until Index is Created?

- ✅ App will work normally
- ✅ You can log in
- ✅ You can use all features
- ⚠️ Transaction history will be empty
- ⚠️ You'll see warnings in console (but app won't crash)

## After Index is Built

- ✅ Transaction history will load
- ✅ No more errors in console
- ✅ Everything works perfectly!

---

**Note**: The index only needs to be created once. After it's built, it will work for all users.
