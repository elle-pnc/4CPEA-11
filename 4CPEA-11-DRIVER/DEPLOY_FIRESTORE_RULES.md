# Deploy Firestore Rules - Quick Guide

## The Issue
You're getting `permission-denied` errors because the Firestore rules haven't been deployed to Firebase yet.

## Solution: Deploy the Rules

### Option 1: Deploy via Firebase Console (Easiest)

1. **Go to Firebase Console**
   - Visit: https://console.firebase.google.com/
   - Select your project: `cpe11-48f3f`

2. **Navigate to Firestore Rules**
   - Click on **Firestore Database** in the left sidebar
   - Click on the **Rules** tab

3. **Copy and Paste the Rules**
   - Open the file: `/Users/lloyd/4CPEA-11/firestore-rules.txt`
   - Copy ALL the content
   - Paste it into the Firebase Console Rules editor

4. **Publish the Rules**
   - Click the **Publish** button
   - Wait for the confirmation message

5. **Verify**
   - Refresh your driver dashboard
   - Try adding an expense again
   - It should work now!

### Option 2: Deploy via Firebase CLI

```bash
# From the main project directory
cd /Users/lloyd/4CPEA-11

# Deploy rules
firebase deploy --only firestore:rules
```

## Important Notes

- **Rules take effect immediately** after publishing
- **No data is lost** when updating rules
- **Make sure you're logged in** to Firebase Console with the correct account

## Current Rules Summary

The rules allow:
- ✅ **driverExpenses**: Drivers can create/read/update their own expenses
- ✅ **driverShifts**: Drivers can manage their own shifts
- ✅ **transactions**: All authenticated users can read (for dashboard calculations)
- ✅ **users**: All authenticated users can read
- ✅ **jeepneys**: All authenticated users can read/write

## After Deploying

Once you deploy the rules:
1. Refresh your browser
2. Try adding an expense
3. Check the console - you should see "Expense saved with ID: ..."
4. The expenses stat card should update automatically
