# Objective 1: Commuter Interface

**Research Objective:** Design and develop a commuter interface that displays card balance details, seat availability, and terminal selection before boarding the modern jeepney.

---

## Design

### Design Requirements

- **Card balance details:** Display current balance, masked card number, and top-up capability
- **Seat availability:** Show per-jeepney seat count (e.g., 1/2) and direction; indicate full vs. available
- **Terminal selection:** Allow user to select origin terminal, then destination terminal, before boarding

### Design Decisions

| Decision | Rationale |
|----------|-----------|
| Mobile-first layout | Commuters use phones; single-column layout, touch-friendly targets |
| Balance card first | Primary info (balance) visible immediately; top-up as secondary action |
| Jeepneys grid | Visual grid of cards; each shows name, seats, direction arrows |
| Origin → Destination flow | Two-step selection; origin filters destination options |
| Fare display before confirm | Show fare per terminal so user knows cost before selecting |
| 2FA for login | Security; verification code via email; trusted device to reduce friction |
| CSS variables for theme | Light/dark; `data-theme` and `localStorage` for persistence |

### User Flow Design

1. Login → 2FA (if not trusted device) → Dashboard
2. Dashboard: view balance, jeepneys, route; if no origin: prompt to select origin
3. Select origin (terminal 1–4) → return to dashboard
4. Choose destination (terminals excluding origin; fare shown) → status set to "waiting"
5. Top-up: amount → payment method → review → confirm

### Data Model Design

- `users`: balance, currentTerminal, currentRoute, status (null | waiting | onboarded)
- `jeepneys`: seatCount, maxSeats, fromTerminal, toTerminal, direction
- `transactions`: userId, type (top-up | trip), amount, route, balanceAfter
- Fare table: 4 terminals; distance-based fares (₱15–₱45)

---

## Development

Each step is documented as a standalone module so the objective can be understood and reproduced independently.

### Step 1: Create Project

```bash
cd /Users/lloyd
mkdir 4CPEA-11
cd 4CPEA-11
npm create vite@latest . -- --template react
```

Creates: `package.json`, `vite.config.js`, `index.html`, `src/main.jsx`, `src/App.jsx`, `src/index.css`, `public/`.

---

## Step 2: Install Dependencies

```bash
npm install
npm install react-router-dom firebase react-icons
npm install -D @vitejs/plugin-react @types/react @types/react-dom
```

---

## Step 3: Add Firebase Configuration

Create `src/firebase/` folder. Add `src/firebase/config.js`:

```javascript
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getDatabase } from "firebase/database";
import { getFunctions } from "firebase/functions";

const firebaseConfig = { /* from Firebase Console */ };
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const realtimeDb = getDatabase(app);
export const functions = getFunctions(app);
```

Add `src/firebase/config.example.js` (template without secrets).

---

## Step 4: Initialize Firebase in Project

```bash
npx firebase-tools init
# Select: Firestore, Functions, Realtime Database
# Use existing project: cpe11-48f3f
```

Creates `firebase.json`, `firestore.rules`, `firestore.indexes.json`, `functions/`.

---

## Step 5: Add Firestore Rules

Create or update `firestore.rules` (or `firestore-rules.txt`):

- `users/{userId}`: read if authenticated; write if owner
- `transactions`: read if authenticated; create if userId matches
- `verificationCodes`: allow read/write (for 2FA)
- `jeepneys`: read if authenticated; create/update if authenticated

Deploy: `npx firebase-tools deploy --only firestore:rules`

---

## Step 6: Add Firebase Auth Module

Create `src/firebase/auth.js`:

- `signIn`, `signUp`, `logOut`, `onAuthStateChange`, `getCurrentUser`
- `onAuthStateChange` fetches Firestore user via `getUser`; skips Firestore during 2FA (`sessionStorage.pendingVerificationEmail`)

---

## Step 7: Add Firestore Helper Module

Create `src/firebase/firestore.js`:

- User: `createOrGetUser`, `getUser`, `updateUser`, `updateUserBalance`, `updateUserTerminal`, `updateUserRoute`, `updateUserStatus`
- Transactions: `addTransaction`, `getUserTransactions`
- Verification: `storeVerificationCode`, `verifyCode`, `deleteVerificationCode`
- Jeepneys: `initializeJeepney`, `getJeepneys`, `getJeepney`, `updateJeepney`, `updateJeepneySeatCount`, `updateJeepneyRoute`

---

## Step 8: Add Fare Calculator

Create `src/utils/fareCalculator.js`:

- Fare table (₱): `1-2: 15`, `1-3: 30`, `1-4: 45`, `2-1: 15`, `2-3: 15`, `2-4: 30`, `3-1: 30`, `3-2: 15`, `3-4: 15`, `4-1: 45`, `4-2: 30`, `4-3: 15`; default `25` if route not in table
- `calculateFare(origin, destination)` — returns fare in PHP

---

## Step 9: Add Login Page

Create `src/pages/LoginPage.jsx`:

- Email/password form
- Trusted device check; 2FA redirect via `sessionStorage.pendingVerificationEmail`
- Call `signIn`; on success with 2FA: store email/password in sessionStorage, redirect to `/verify`

---

## Step 10: Add Two-Step Verification Page

Create `src/pages/TwoStepVerificationPage.jsx`:

- 6-digit code input; verify via `verifyCode` in Firestore
- On success: call `signIn`, clear sessionStorage, redirect to `/dashboard`
- Optional "Remember device" → `saveTrustedDevice`

---

## Step 11: Add Commuter Dashboard (Balance Card)

Create `src/pages/CommuterDashboard.jsx`:

- **Balance card:** Display `userData.balance`, masked card number; "Top Up" button
- Top-up modal: amount → payment method → review → confirm; update balance via `updateUserBalance`, add transaction via `addTransaction`

---

## Step 12: Add Commuter Dashboard (Seat Availability)

In `CommuterDashboard.jsx`:

- **Jeepneys grid:** Subscribe to `jeepneys` collection via `onSnapshot`
- Display each jeepney: name, seat count (e.g., 1/2), direction arrows (fromTerminal → toTerminal)
- Use `initializeJeepney('jeep1')` if jeepneys not yet created
- Color: green if seats available, red if full

---

## Step 13: Add Origin Selection Page

Create `src/pages/SelectOriginPage.jsx`:

- Display terminals 1–4; user selects origin
- On confirm: `updateUserTerminal(userId, selectedTerminal)`
- If route exists and origin changed: clear route via `updateUserRoute(userId, null)`
- Navigate to `/dashboard`

---

## Step 14: Add Destination Selection Page (Before Boarding)

Create `src/pages/ChooseDestinationPage.jsx`:

- **Mode: choose** — Filter out current origin; show terminals 1–4 (excluding origin)
- Display fare per terminal via `calculateFare(currentTerminal, terminal)`
- On confirm: `updateUserRoute(userId, { from, to })`, `updateUserStatus(userId, 'waiting')`
- No fare deduction yet (fare deducted on tap-in)
- Navigate to `/dashboard`

---

## Step 15: Add Routing and App Shell

Update `src/App.jsx`:

- `onAuthStateChange` → `isAuthenticated`, `currentUser`, `userData`
- Routes: `/login`, `/verify`, `/dashboard`, `/choose-destination`, `/select-origin`
- Protected routes: redirect to `/login` if not authenticated
- `TranslationProvider` with `userData.language`

---

## Step 16: Add Supporting Files

- `src/translations.js` — `getTranslations(lang)` for en/fil
- `src/contexts/TranslationContext.jsx` — `TranslationProvider`, `useTranslation`
- `src/index.css` — CSS variables for light/dark theme
- `src/components/FooterNav.jsx` — Bottom nav (Dashboard, Profile, History, Settings)

---

## Step 17: Add Cloud Function for 2FA

Create `functions/index.js`:

- `sendVerificationCode` (HTTPS callable): generate 6-digit code, store in `verificationCodes`, send email via nodemailer
- `cleanupExpiredCodes` (schedule): delete expired codes

Set secrets: `GMAIL_USER`, `GMAIL_APP_PASSWORD`. Deploy: `npx firebase-tools deploy --only functions`

---

## Step 18: Add Vite Build Config

Update `vite.config.js`:

- `@vitejs/plugin-react`
- Custom plugin: copy `.htaccess` to `dist/` (if using Apache)
- `manualChunks`: `react-vendor`, `firebase-vendor`
- `outDir: 'dist'`

---

## Step 19: Add .htaccess (Optional)

Create `.htaccess` — Apache mod_rewrite for SPA fallback to `index.html`; exceptions for `/assets/`.

---

## Step 20: Build Objective 1 Module

```bash
npm run build
```

Output: `dist/index.html`, `dist/assets/*`, `dist/.htaccess`.
