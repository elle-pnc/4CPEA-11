# CPE11-AFCS: Research-Level Technical Report

## Automated Fare Collection System for Modern Jeepney Transportation

**Project:** 4CPEA-11  
**System:** CPE11-AFCS (Automated Fare Collection System)  
**Research Objectives:**
- **Objective 1:** Design and develop a commuter interface that displays card balance details, seat availability, and terminal selection before boarding the modern jeepney.
- **Objective 4:** Design and develop an extended terminal mechanism within the commuter interface that allows changes to a farther terminal after boarding with corresponding fare adjustment.
- **Objective 5:** Design and develop the driver and administrator dashboards for operational monitoring and financial analytics.

**Note:** This report documents the actual build process from scratch. AI-assisted development (e.g., Cursor, ChatGPT) was used for implementation; the report reflects the true steps taken and architecture decisions made.

---

## Part I: Design and Development Overview

This report addresses both **design** and **develop** as stated in each research objective. For each objective, the design phase covers requirements, architecture, user flow, and UI/UX decisions; the development phase covers implementation steps.

### Design Phase (Overview)

| Aspect | Approach |
|--------|----------|
| **Architecture** | Three separate apps (Commuter, Driver, Admin) sharing one Firebase project; real-time sync via Firestore |
| **UI/UX** | Mobile-first for Commuter; tablet-optimized for Driver (13-inch iPad); desktop for Admin |
| **User flow** | Auth → 2FA → Dashboard; Commuter: origin → destination → boarding; Driver: shift → monitor → route |
| **Data model** | Firestore for persistence; RTDB for low-latency RP4 feedback |
| **Visual design** | CSS variables for theming; card-based layout; color coding (green/red for seat availability) |

### Development Phase (Overview)

Implementation follows the step-by-step process in [OBJECTIVE_1.md](OBJECTIVE_1.md), [OBJECTIVE_4.md](OBJECTIVE_4.md), and [OBJECTIVE_5.md](OBJECTIVE_5.md). Each objective document includes a Design section before the implementation steps.

---

## Part II: Program Definitions

### 1. Commuter App (Root: `/Users/lloyd/4CPEA-11`)

**Purpose:** Mobile-first web app for passengers. Displays card balance, seat availability, terminal selection, route extension, and tap-in/tap-out feedback.

**Research Objectives:** 1, 4

**Key Features:**
- Login with 2FA (email verification code)
- Trusted device (skip 2FA for 30 days)
- Card balance display, top-up flow (amount → payment method → review → confirm)
- Origin selection (`SelectOriginPage`), destination selection (`ChooseDestinationPage`)
- Route extension while onboarded (fare adjustment)
- Live seat availability per jeepney
- Theme (light/dark), language (English/Filipino)

*Note: Current terminal from RP4 GPS and tap-in notification are implementation enhancements beyond the strict Objective 1 scope (terminal selection before boarding).*

---

### 2. Driver App (`4CPEA-11-DRIVER/`)

**Purpose:** Dashboard for jeepney drivers. Operational monitoring: waiting/onboarded passengers, shift management, route selection, revenue/expenses/profit.

**Research Objective:** 5

**Key Features:**
- Login with 2FA
- Terminals section: waiting passengers per terminal (1–4)
- Current passengers: seat count, passenger routes, "Extended" badge
- Shift start/end with Philippines time
- Statistics: passengers, revenue, expenses, profit
- Route selection: From/To dropdowns, Update Route
- Expenses modal: add fuel, maintenance, etc.

---

### 3. Admin App (`4CPEA-11-ADMIN/`)

**Purpose:** Administrator dashboard for financial analytics and reporting.

**Research Objective:** 5

**Key Features:**
- KPI cards: passengers, revenue, expenses, profit; % change vs yesterday
- Fleet seat monitoring
- Terminal activity: boarding/alighting per terminal
- Revenue & profit chart (Bar/Area; Daily/Weekly/Monthly/Yearly)
- Report generation: Summary/Detailed; PDF/CSV

---

## Part III: Technology Stack (All Programs)

| Technology | Version | Purpose |
|------------|---------|---------|
| **Node.js** | v16+ | Runtime for npm, Vite, Firebase CLI |
| **npm** | — | Package manager |
| **Vite** | 5.0.8 | Dev server (HMR), production build, code splitting |
| **React** | 18.2.0 | UI components, hooks |
| **React Router DOM** | 6.20.0 | Client-side routing, protected routes |
| **Firebase** | 10.14.1 | Auth, Firestore, RTDB, Functions |
| **react-icons** | 5.5.0 | Commuter: MdPerson, MdMap, MdLocationOn, etc. |
| **lucide-react** | 0.294.0 | Driver/Admin: Users, Compass, DollarSign, etc. |
| **Tailwind CSS** | 3.3.6 | Driver/Admin: utility-first styling |
| **Recharts** | 2.10.3 | Admin only: BarChart, AreaChart |
| **nodemailer** | 6.10.1 | Cloud Functions: send 2FA email via Gmail |

---

## Part IV: Step-by-Step Build Process by Objective

The detailed step-by-step build process for each objective is documented in separate files:

- **[OBJECTIVE_1.md](OBJECTIVE_1.md)** — Commuter interface (balance, seat availability, terminal selection before boarding)
- **[OBJECTIVE_4.md](OBJECTIVE_4.md)** — Extended terminal mechanism (route extension after boarding with fare adjustment)
- **[OBJECTIVE_5.md](OBJECTIVE_5.md)** — Driver and Administrator dashboards (operational monitoring and financial analytics)

---

### Part IV-D: Publishing / Deployment

#### Option 1: Apache / Traditional Hosting

1. Upload Commuter `dist/` to web root
2. Ensure `.htaccess` present; `mod_rewrite` enabled
3. Upload Driver `4CPEA-11-DRIVER/dist/` to e.g. `driver.yoursite.com` or `yoursite.com/driver/`
4. Upload Admin `4CPEA-11-ADMIN/dist/` to e.g. `admin.yoursite.com` or `yoursite.com/admin/`
5. Each SPA needs `.htaccess` for fallback to `index.html` if in subdirectory

#### Option 2: Firebase Hosting

Add to `firebase.json` for Commuter:

```json
"hosting": {
  "public": "dist",
  "rewrites": [
    { "source": "**", "destination": "/index.html" }
  ]
}
```

For multi-app hosting, use multiple Firebase projects or hosting targets.

#### Firestore Indexes

Create composite indexes as prompted:

- `transactions`: `userId` ASC, `timestamp` DESC
- `rp4_debug/{deviceId}/taps`: `ts` DESC

---

## Part V: Data Model

### Firestore Collections

| Collection | Structure |
|------------|-----------|
| `users` | balance, currentTerminal, currentRoute, status, language, theme, firstName, lastName, email, cardNumber, createdAt, updatedAt |
| `users/{userId}/trustedDevices/{token}` | token, userId, expiresAt, deviceInfo |
| `transactions` | userId, type (top-up|trip), amount, paymentMethod, description, balanceAfter, route, jeepneyId, timestamp |
| `verificationCodes` | code, email, expiresAt, used, attempts |
| `jeepneys` | seatCount, maxSeats, fromTerminal, toTerminal, direction, isActive |
| `driverShifts` | userId, startAt, endAt, startAtLocal, endAtLocal |
| `driverExpenses` | userId, amount, note, createdAt |
| `rp4_debug/{deviceId}` | lastTap, seat1, seat2, gps_calibration |
| `rp4_debug/{deviceId}/taps` | uid, ts, source, processed |
| `rp4_debug/{deviceId}/seatEvents` | seatId, status, tsMs |
| `rp4_debug/{deviceId}/gps_calibration/{cityId}` | currentTerminal |

### Realtime Database

| Path | Purpose |
|------|---------|
| `rp4/{deviceId}/lastTap` | RP4 reads tap result (active, known, reason, name, uid, ts) |

---

## Part VI: Library Usage (Detailed)

### Commuter App

| Library | Import | Usage |
|---------|--------|-------|
| react | useState, useEffect, useRef, useLayoutEffect | State, side effects, refs |
| react-router-dom | BrowserRouter, Routes, Route, Navigate, useNavigate, useLocation | Routing, navigation |
| react-icons/md | MdPerson, MdMap, MdLocationOn, MdEdit, MdAdd, etc. | Icons |
| firebase/auth | signInWithEmailAndPassword, onAuthStateChanged, signOut | Auth |
| firebase/firestore | doc, collection, onSnapshot, getDoc, updateDoc, addDoc, query, where, orderBy | Firestore CRUD, real-time |
| firebase/database | ref, set | RTDB (in rp4Taps for write; RP4 reads) |
| firebase/functions | httpsCallable | sendVerificationCode |

### Driver App

| Library | Import | Usage |
|---------|--------|-------|
| lucide-react | Users, Compass, DollarSign, ArrowRight | Icons |
| tailwindcss | — | Utility classes |

### Admin App

| Library | Import | Usage |
|---------|--------|-------|
| recharts | BarChart, AreaChart, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, Bar, Area, Cell | Charts |

---

## Part VII: Build Verification

### Commuter
```bash
cd /Users/lloyd/4CPEA-11
npm run build
# Check dist/index.html, dist/assets/
npm run preview  # Optional: serve dist/ locally
```

### Driver
```bash
cd /Users/lloyd/4CPEA-11/4CPEA-11-DRIVER
npm run build
npm run preview
```

### Admin
```bash
cd /Users/lloyd/4CPEA-11/4CPEA-11-ADMIN
npm run build
npm run preview
```

### Cloud Functions
```bash
cd /Users/lloyd/4CPEA-11
npx firebase-tools deploy --only functions
```

---

## Conclusion

The CPE11-AFCS system was built by objective, with each objective addressing both **design** and **develop**:

- **Objective 1** (Commuter interface): **Design** — Requirements (balance, seat availability, terminal selection), UI/UX decisions (mobile-first, card layout, origin→destination flow), data model. **Develop** — 20 implementation steps from project creation through balance card, seat availability, origin/destination selection, 2FA, and build.

- **Objective 4** (Extended terminal mechanism): **Design** — Requirements (extend after boarding, fare adjustment), decisions (extend in same direction only, confirmation modal), user flow. **Develop** — 8 steps extending `ChooseDestinationPage` with extend mode, fare calculation, and "Extend To" button.

- **Objective 5** (Driver and Administrator dashboards): **Design** — Requirements (operational monitoring, financial analytics), layout decisions (Driver: terminals + passengers; Admin: KPIs + charts + reports), user flows. **Develop** — Driver: 18 steps; Admin: 15 steps.

All modules share the same Firebase project. Deployment is via traditional hosting (Apache) or Firebase Hosting, with `npm run build` producing production-ready `dist/` output for each app.
