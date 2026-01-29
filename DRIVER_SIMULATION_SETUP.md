# Driver Simulation System Setup

## Overview

The waiting/boarding system has been implemented with the following features:

### User Flow:
1. **Select Route** → User selects origin and destination
2. **Status: Waiting** → User status changes to "waiting" (no payment deducted yet)
3. **Driver Simulation** → Driver/conductor sees waiting users
4. **Tap In** → Driver taps user in → Payment deducted → Status: "onboarded"
5. **Tap Out** → Driver taps user out → Status reset to null (default)

## Features Implemented

### ✅ Completed:
1. **Status Field** - Added to user documents (waiting, onboarded, null)
2. **Route Selection** - Sets status to "waiting" when route is selected
3. **Driver Simulation Page** - New page at `/driver-simulation`
4. **Tap In Functionality** - Deducts fare, changes status to onboarded, creates transaction
5. **Tap Out Functionality** - Resets status to null
6. **Real-time Updates** - Dashboard updates automatically when status changes
7. **Status Display** - Dashboard shows waiting/onboarded badge

## Accessing Driver Simulation Page

### Option 1: Direct URL
Navigate to: `http://localhost:3000/driver-simulation`

### Option 2: Add Link in Settings
You can add a link in Settings page for easy access.

## Firestore Index Required

The driver simulation page needs an index for querying users by status.

### Create Index:
1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select project: `cpe11-48f3f`
3. Click **Firestore Database** → **Indexes** tab
4. Click **Create Index**
5. Configure:
   - **Collection ID**: `users`
   - **Fields to index**:
     - Field: `status` → Order: **Ascending**
   - **Query scope**: Collection
6. Click **Create**

**OR** click this link when you see the error:
The error message will provide a direct link to create the index.

## Updated Firestore Rules

The rules have been updated to allow authenticated users to read all user documents (needed for driver simulation). Copy the updated rules from `firestore-rules.txt`.

## How It Works

### User Side:
1. User selects route → Status: `waiting`
2. Dashboard shows "⏳ Waiting for boarding" badge
3. Real-time listener updates dashboard when status changes

### Driver Side:
1. Open `/driver-simulation` page
2. See two sections:
   - **Waiting for Boarding** - Users with `status: 'waiting'`
   - **Onboarded** - Users with `status: 'onboarded'`
3. Click **Tap In** on waiting user:
   - Deducts ₱25.00 from balance
   - Changes status to `onboarded`
   - Creates transaction record
4. Click **Tap Out** on onboarded user:
   - Resets status to `null`
   - User can select new route

## Testing

1. **As User:**
   - Log in
   - Select origin terminal
   - Choose destination
   - See "Waiting for boarding" status on dashboard

2. **As Driver:**
   - Open `/driver-simulation` page (no login required for simulation)
   - See user in "Waiting for Boarding" section
   - Click "Tap In" → User moves to "Onboarded" section
   - Check user's dashboard → Status updated, balance deducted
   - Click "Tap Out" → User status reset

## Files Created/Modified

- ✅ `src/pages/DriverSimulationPage.jsx` - New driver simulation page
- ✅ `src/pages/DriverSimulationPage.css` - Styling for driver page
- ✅ `src/pages/ChooseDestinationPage.jsx` - Updated to set waiting status
- ✅ `src/pages/CommuterDashboard.jsx` - Added status display and real-time listener
- ✅ `src/pages/CommuterDashboard.css` - Added status badge styles
- ✅ `src/firebase/firestore.js` - Added status management functions
- ✅ `src/App.jsx` - Added route for driver simulation page
- ✅ `firestore-rules.txt` - Updated rules to allow reading all users

## Status Values

- `null` or `undefined` - Default (no active trip)
- `'waiting'` - User selected route, waiting to board
- `'onboarded'` - User has tapped in, currently on vehicle

## Notes

- Payment is only deducted on **Tap In**, not when selecting route
- Status is reset on **Tap Out**
- Real-time updates work via Firestore listeners
- Driver simulation page auto-refreshes every 5 seconds
- Manual refresh button available for immediate updates
