# Firestore Index Setup

## Error: Query requires an index

Firestore needs a composite index for queries that filter and order by different fields.

## Quick Fix - Use the Link from Error

The error message provides a direct link to create the index. Just click it:

**Click this link**: https://console.firebase.google.com/v1/r/project/cpe11-48f3f/firestore/indexes?create_composite=ClBwcm9qZWN0cy9jcGUxMS00OGYzZi9kYXRhYmFzZXMvKGRlZmF1bHQpL2NvbGxlY3Rpb25Hcm91cHMvdHJhbnNhY3Rpb25zL2luZGV4ZXMvXxABGgoKBnVzZXJJZBABGg0KCXRpbWVzdGFtcBACGgwKCF9fbmFtZV9fEAI

This will automatically create the required index.

---

## Manual Setup (Alternative)

If the link doesn't work, create it manually:

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select project: `cpe11-48f3f`
3. Click **Firestore Database** → **Indexes** tab
4. Click **Create Index**
5. Configure:
   - **Collection ID**: `transactions`
   - **Fields to index**:
     - Field: `userId` → Order: **Ascending**
     - Field: `timestamp` → Order: **Descending**
   - **Query scope**: Collection
6. Click **Create**

---

## What This Index Does

The query in `getUserTransactions()` does:
- Filter by `userId` (where clause)
- Order by `timestamp` descending (orderBy clause)

Firestore requires a composite index when you combine `where` and `orderBy` on different fields.

---

## After Creating the Index

1. Wait 1-5 minutes for the index to build
2. Refresh your app
3. The error should be gone!

You can check the index status in Firebase Console → Firestore → Indexes tab. It will show "Building" then "Enabled" when ready.
