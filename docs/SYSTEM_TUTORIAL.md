# CPE11-AFCS — Guided System Tutorial

A beginner-friendly, technically accurate walkthrough of the **4CPEA-11** project. Plain language first, then proper terms. Assumes you built the system but want deep understanding.

---

## How to use this document

- Read **Lesson 1 → 12** in order the first time.
- Use **Key takeaways** and **Quick check** at the end of each lesson to self-test.
- **Lessons 11–12** cover **security measures** and **why these technologies** (vs common alternatives).
- **Honest limits**: Not every file is enumerated; structure and main flows match the repo. For a deeper slice (Commuter-only, Driver-only, Admin-only), extend this doc.

---

# Lesson 1: Whole system overview

### 1. What it is (simple)

Imagine a **jeepney fare system** with three “windows”:

- **Commuter window** — passengers: balance, pick terminals, book route, tap in/out (with hardware in the loop).
- **Driver window** — operator: who’s waiting, who’s on board, route, shift, expenses, daily money picture.
- **Admin window** — office: totals, trends, terminals, reports.

All of them talk to the **same cloud brain** (Firebase) so everyone sees **consistent data**.

### 2. Why it exists

- **One source of truth** for users, trips, money, and vehicle state.
- **Role separation**: commuter vs driver vs admin accounts don’t use the wrong app.
- **Security**: login + optional **two-step verification (2FA)** and **Firestore security rules**.

### 3. How it works (technical names)

- **Frontend**: three **Single Page Applications (SPAs)** built with **React** (UI library) and **Vite** (build tool / dev server).
- **Backend-as-a-service**: **Firebase**
  - **Authentication (“Auth”)** — who is logged in.
  - **Cloud Firestore (“Firestore”)** — main structured database (documents & collections).
  - **Realtime Database (RTDB)** — extra real-time store (config includes it; RP4 bridge uses it in code paths).
  - **Cloud Functions** — server code that runs in Google’s cloud (e.g. send email for 2FA).
- **Hosting**: `firebase.json` serves a **combined** folder `dist-combined` with paths `/Commuter`, `/Admin`, `/Driver`.

### 4. Real use (story)

1. Commuter opens app → logs in → may complete **2FA** → sees dashboard and jeepneys.
2. Commuter selects **origin / destination** → data saved under their **user document** in Firestore.
3. **Card reader / RP4** side writes taps and seat events under **`rp4_debug/...`**; app logic processes trips, balance, status.
4. Driver dashboard **subscribes** to same Firestore data → sees waiting/onboarded passengers and updates route/terminal/GPS settings.
5. Admin dashboard **aggregates** passengers, revenue, expenses, terminal activity → charts and reports.

### Text diagram (big picture)

```
[ Commuter browser ]     [ Driver browser ]     [ Admin browser ]
        |                        |                      |
        +------------------------+----------------------+
                                 |
                          [ Firebase project ]
                    /      |      |      |      \
               Auth   Firestore  RTDB  Functions  Hosting
                                 |
                    [ Optional: RP4 / hardware writers ]
                    (write to Firestore / RTDB paths)
```

### In simple words (recap)

You built **three React websites** that all use **Firebase** as the shared backend; **Functions** add **email 2FA**; **hardware** (or simulation) can update **Firestore/RTDB** so trips stay in sync.

### Key takeaways

- Three apps, **one Firebase project**.
- **Firestore** is the main shared database for app state.
- **Cloud Functions** = “code on Google’s servers,” callable from the apps.

### Quick check

1. Name the three user-facing apps.
2. What does “single source of truth” mean here?
3. What is Firebase Auth used for?
4. Where does 2FA email sending run: browser or cloud?

---

# Lesson 2: Project structure and folders

### 1. What it is

The repo is **not** one monorepo `package.json` for all apps. It is:

- **Root** (`4CPEA-11/`) = **Commuter** app + shared scripts + `functions/` + `firebase.json`.
- **Folders** `4CPEA-11-DRIVER/` and `4CPEA-11-ADMIN/` = **separate** apps with their **own** `package.json` and `vite.config.js`.

### 2. Why it exists

- Different **base paths** on hosting: `/Commuter/`, `/Driver/`, `/Admin/`.
- **Independent builds** → combined into `dist-combined/` by `scripts/build-all.js`.

### 3. How it works (map)

```
4CPEA-11/                          ← Commuter app root
├── package.json                   ← Commuter dependencies & npm scripts
├── vite.config.js                 ← base: '/Commuter/'
├── index.html                     ← Commuter HTML shell
├── src/                           ← Commuter React code
│   ├── main.jsx                   ← entry: mounts React
│   ├── App.jsx                    ← routes, auth shell
│   ├── pages/                     ← screens (Login, Dashboard, …)
│   ├── firebase/                  ← config, auth, firestore, rp4Taps
│   ├── contexts/                  ← e.g. translations
│   ├── utils/                     ← helpers (e.g. GPS terminal parsing)
│   └── ...
├── functions/                     ← Cloud Functions (Node)
├── firestore.rules                ← database security
├── firebase.json                  ← hosting + functions config
├── scripts/build-all.js           ← builds all 3 apps → dist-combined
├── register.html                  ← static helper page (copied to dist)
├── dist-combined/                 ← output for Firebase Hosting (after build:all)
│
├── 4CPEA-11-DRIVER/              ← Driver app (own package.json, vite)
│   └── src/ …
│
└── 4CPEA-11-ADMIN/               ← Admin app (own package.json, vite)
    └── src/ …
```

**Workspace root**: the folder where you run a command. For Commuter, often **`4CPEA-11/`**; for Driver-only dev, **`4CPEA-11-DRIVER/`**.

**Note**: `backup_*` and duplicate trees in the repo are backups; the “live” apps for builds are the paths above.

### 4. Example

You run `npm run build:all` at root → script runs `npm run build` in three places → copies each `dist` into `dist-combined/Commuter`, `Admin`, `Driver`.

### In simple words (recap)

Think of **three separate lunch boxes** (Commuter, Driver, Admin) that get **packed into one delivery bag** (`dist-combined`) for hosting.

### Key takeaways

- **Three apps**, three Vite configs, three `base` paths.
- **`build-all.js`** merges builds for Firebase Hosting.

### Quick check

1. Which folder is the Commuter app’s `main.jsx`?
2. What folder does Firebase Hosting use as `public`?
3. Why does Driver have its own `package.json`?

---

# Lesson 3: Tools and technologies used

### Node.js

**Plain language**: A program on your computer that can run **JavaScript** outside the browser.  
**Technical**: JavaScript **runtime** used to run Vite, build tools, and Firebase Functions locally.

### npm (“Node Package Manager”)

**Plain language**: A way to **download libraries** (packages) and run **shortcuts** (scripts) like `npm run dev`.  
**Technical**: Reads **`package.json`** (list of dependencies) and **`package-lock.json`** (exact versions).

### package.json

**Plain language**: The **recipe card** for a project: name, scripts, libraries.  
**Technical**: JSON manifest; **`dependencies`** ship with the app; **`devDependencies`** are for development/build only.

### Vite

**Plain language**: A **very fast dev server** + **bundler** that turns your React files into something browsers load efficiently.  
**Technical**: Dev: **Hot Module Replacement (HMR)**; Prod: **build** outputs static assets to `dist/`.

### React

**Plain language**: A way to build UI from **reusable pieces** (**components**) that **re-render** when **state** changes.  
**Technical**: Declarative UI; **hooks** like `useState`, `useEffect` manage state and side effects.

### JavaScript (JS)

**Plain language**: The programming language of the browser and your Node tooling.  
**Technical**: Apps use **JSX** (HTML-like syntax in `.jsx` files) compiled by Vite + React plugin.

### React Router (`react-router-dom`)

**Plain language**: Chooses **which page** to show based on the **URL path** (e.g. `/login` vs `/dashboard`).  
**Technical**: **Client-side routing**; **`basename`** matches hosting subpaths (`/Commuter`, `/Driver`, `/Admin`).

### Firebase (the platform)

**Plain language**: Google’s **backend kit** so you don’t run your own server for everything.  
**Pieces** (from `src/firebase/config.js` in Commuter):

- **Auth** — sign-in state.
- **Firestore** — main database.
- **Realtime Database** — second real-time store (RP4 mirror).
- **Functions** — callable backend.
- **Analytics** — usage metrics (browser only).

### Firestore vs Realtime Database

**Plain language**: Both store data in the cloud and can update live.  
**Technical**:

- **Firestore** — **collections** and **documents** (like folders/files), rich queries; **source of truth** for users, jeepneys, transactions.
- **RTDB** — **JSON tree**, very low-latency; project writes **lastTap** mirror for hardware.

### Authentication

**Plain language**: Proves **who** the user is (email/password, etc.).  
**Technical**: Firebase Auth; apps use `onAuthStateChanged` / wrapper helpers.

### Hosting

**Plain language**: Where the **built HTML/JS/CSS** files live on the internet.  
**Technical**: **Firebase Hosting** serves `dist-combined` with **SPA rewrites** so React routes work under each base path.

### Git

**Plain language**: **Save points** for your code history.  
**Technical**: Version control (not required for runtime, standard for development).

### In simple words (recap)

**Node + npm** run the tools; **Vite + React** build the UI; **Firebase** is the backend; **Git** tracks code changes.

### Key takeaways

- **Dev** = Vite serves source with fast refresh; **Prod** = static `dist` files.
- **Firestore** ≈ main app data; **RTDB** ≈ extra real-time channel for devices.

### Quick check

1. What file lists `react` and `firebase` versions?
2. What does `basename` on the Router do?
3. Name two Firebase products your `config.js` initializes.

---

# Lesson 4: How the app starts and runs

### Commuter entry path

#### 1. `index.html`

**What**: Minimal HTML with `<div id="root">`.  
**Why**: Browsers need an HTML page; React **mounts** into `#root`.  
**How**: Vite injects the script entry.

#### 2. `src/main.jsx`

**What**: **Bootloader**.  
**Why**: First JavaScript that runs in the browser for Commuter.  
**How**:

- Reads theme from **`localStorage`** (key–value storage in the browser).
- Calls **`createRoot(...).render(<App />)`** — React 18 root API.

#### 3. `App.jsx`

**What**: Top-level **layout + router + auth listener**.  
**Why**: One place to decide: loading? logged in? which route?  
**How**: `useEffect` subscribes to **`onAuthStateChange`**; renders `<Routes>` for pages.

### Driver / Admin

Same idea: `main.jsx` → `App.jsx` with **different** routes and **role checks**.

### Development vs production

| Mode | Command (typical) | What happens |
|------|-------------------|--------------|
| **Development** | `npm run dev` (in that app’s folder) | Vite **dev server**, fast reload, **not** optimized |
| **Production build** | `npm run build` | Outputs **`dist/`** — bundled, minified files for hosting |
| **Preview build locally** | `npm run preview` | Serves `dist` locally to test production-like behavior |

**Beginner trap**: Changing code in `src` does nothing on the live site until you **build** and **deploy** hosting.

### In simple words (recap)

**HTML** opens the door; **main.jsx** starts React; **App.jsx** is the traffic controller for pages and login.

### Key takeaways

- **Entry chain**: `index.html` → `main.jsx` → `App.jsx`.
- **Dev** ≠ **build**; deployment uses **build output**.

### Quick check

1. What DOM element does React attach to?
2. What is `localStorage`?
3. Why use `npm run build` before deploy?

---

# Lesson 5: Frontend basics (React concepts)

### Component

**Plain language**: A **UI building block** (button, page, header).  
**Technical**: A function that **returns JSX**.

### Props (“properties”)

**Plain language**: **Inputs** passed into a component (like function arguments).  
**Technical**: Read-only from the child’s perspective; parent controls them.

### State

**Plain language**: **Memory** that belongs to a component; when it changes, React **redraws** the relevant UI.  
**Technical**: `useState` hook returns `[value, setValue]`.

### Effect (`useEffect`)

**Plain language**: “When something happens (mount, dependency change), run this **side effect**.”  
**Technical**: Subscriptions, timers, fetching — **clean up** listeners on unmount.

### Routing

**Plain language**: **Different URLs show different pages** without full page reload (mostly).  
**Technical**: `react-router-dom` matches **path** to **element**; **`Navigate`** redirects.

### Context (e.g. `TranslationProvider`)

**Plain language**: **Share data** (like language) without passing props through every layer.  
**Technical**: React **Context API**.

### Example mental model

- **Dashboard page** = big component.
- It **calls** Firestore **subscribe** functions → on update, **setState** → UI refreshes.

### In simple words (recap)

**Props** = handed in; **state** = remembered inside; **effects** = connect to the outside world (Firebase).

### Key takeaways

- UI = **components** + **state**.
- **Router** maps paths to pages.

### Quick check

1. What hook holds changing UI memory?
2. What is a “side effect”?
3. Who passes `props` — parent or child?

---

# Lesson 6: Backend / database basics (Firebase)

### Firestore model

**Plain language**: **Folders (collections)** hold **files (documents)**; each file has **fields**.  
**Technical**: e.g. `users/{userId}`, `jeepneys/jeep1`, `rp4_debug/cpe11-afcs/...`

### Security rules (`firestore.rules`)

**Plain language**: **Who can read/write** which paths.  
**Technical**: Declarative rules; mistakes cause **permission-denied** errors.

### Cloud Functions (`functions/index.js`)

**Plain language**: Code that runs **on Google’s servers** when called.  
**Technical**: **`onCall`** HTTPS callable — client uses **`httpsCallable`**; server uses **Admin SDK** to write Firestore as **trusted** admin.

### 2FA flow (simplified)

1. User enters email/password in app.
2. App calls **`sendVerificationCode`** function with `{ email }`.
3. Function writes a code to **`verificationCodes/{email}`** and sends **email** (Nodemailer + Gmail secrets).
4. User enters code; app verifies against Firestore (client/firestore helpers).
5. After success, app completes **Firebase Auth** sign-in.

### RTDB

**Plain language**: Another cloud JSON store, good for **very fast** updates.  
**Technical**: Used in `rp4Taps.js` to mirror **lastTap** for readers.

### In simple words (recap)

**Firestore** holds users and trips; **rules** guard them; **Functions** do privileged work like **email**.

### Key takeaways

- **Client SDK** = runs in browser with user identity.
- **Admin SDK** = runs in Functions with **full power**.

### Quick check

1. Where is the verification code stored before the user types it?
2. Why use a Cloud Function instead of sending email from the browser?
3. What file controls read/write permissions?

---

# Lesson 7: Data flow and user flows

### A. Commuter: login → dashboard → trip

1. **Login page** sets `sessionStorage` flags for 2FA, validates password, may call **callable** `sendVerificationCode`.
2. **Navigate** to verify page (full URL navigation used to avoid auth/router race conditions).
3. **Verify** code → sign in → **Auth listener** loads **user doc** from Firestore → **dashboard** shows balance, route, jeepneys.
4. **Real-time**: `onSnapshot` / subscribe helpers update **balance**, **status**, **route**, **jeepneys** without refresh.
5. **RP4 / taps**: Hardware (or simulation) writes under **`rp4_debug`**; logic updates **users**, **jeepneys**, **transactions**.

```
Login → (optional) Cloud Function email
     → Verify code in Firestore
     → Firebase Auth session
     → Load user from Firestore
     → Dashboard listens (snapshots) for live updates
     ↔ RP4 / seat / tap data paths
```

### B. Driver: operations

- Subscribes to **users by status** (waiting / onboarded), **jeepney**, **shifts**, **daily stats**, **GPS/manual terminal** docs under **`rp4_debug/.../gps/`**.
- Updates **route**, **manual terminal**, **source preference**, **expenses** → writes Firestore.

### C. Admin: oversight

- Subscribes to **aggregated** stats: passengers, revenue, expenses, terminal activity, charts.
- **Reports** via utilities (e.g. `reportGenerator`).

### In simple words (recap)

**Auth** opens the session; **Firestore** holds facts; **listeners** push updates to the UI; **Functions** handle email; **RP4 paths** tie hardware to user state.

### Key takeaways

- **Read path**: subscribe → callback → `setState`.
- **Write path**: UI event → `updateDoc` / `setDoc` / callable function.

### Quick check

1. What is `onSnapshot` in one sentence?
2. Why is `sessionStorage` used during 2FA?
3. Name one Firestore collection used for money or trips.

---

# Lesson 8: Important files and code walkthrough

### Commuter — core files

| File | Role |
|------|------|
| `src/firebase/config.js` | Wires Firebase services to the project (`initializeApp`, `getAuth`, `getFirestore`, …). |
| `src/firebase/auth.js` | Sign-in, sign-up, `onAuthStateChanged` wrapper; 2FA-aware (skips full user load when pending verification). |
| `src/firebase/firestore.js` | CRUD + subscriptions for users, transactions, jeepneys, etc. |
| `src/firebase/rp4Taps.js` | RP4 paths: `lastTap`, `seatEvents`, `processTap`, card UID map. |
| `src/pages/LoginPage.jsx` | Login + 2FA trigger + navigation to verify. |
| `src/pages/TwoStepVerificationPage.jsx` | Code entry, trusted device, completes login. |
| `src/pages/CommuterDashboard.jsx` | Main hub: balance, jeepneys, route UI, live terminal (GPS/manual), trip-complete modal, listeners. |
| `src/App.jsx` | Routes, auth gating, role check (e.g. block drivers from Commuter). |
| `src/translations.js` | i18n strings. |

### Driver — core files

| File | Role |
|------|------|
| `4CPEA-11-DRIVER/src/App.jsx` | Routes + driver vs commuter role check. |
| `4CPEA-11-DRIVER/src/pages/Dashboard.jsx` | Terminals, passengers, shift, stats, route, GPS/manual, expenses modal. |
| `4CPEA-11-DRIVER/src/firebase/firestore.js` | Driver-specific queries + `subscribeCurrentTerminal` (GPS merge). |

### Admin — core files

| File | Role |
|------|------|
| `4CPEA-11-ADMIN/src/pages/Dashboard.jsx` | KPIs, charts, terminal activity, reports. |
| `4CPEA-11-ADMIN/src/firebase/firestore.js` | Subscriptions for aggregates / charts. |

### `functions/index.js`

- **`sendVerificationCode`** — callable; writes `verificationCodes`; sends email.
- Additional exports may exist (triggers, other callables) — pattern: **trusted server** + **Admin SDK**.

### Conceptual line-by-line: `config.js`

1. `initializeApp(firebaseConfig)` — connect the web app to the Firebase project.
2. `getAuth`, `getFirestore`, `getDatabase`, `getFunctions` — obtain service singletons.
3. `export` them — every module imports the **same** instances.

### Conceptual: `App.jsx` (Commuter)

1. `useState` for loading, user, userData.
2. `useEffect` → `onAuthStateChange` → if **pending 2FA**, keep logged-out UI.
3. If logged in, load **role** and **block** wrong roles.
4. `<Routes>` — each `Route` maps a path to a **page component**.

### In simple words (recap)

**config** connects; **auth** knows who you are; **firestore** files are the **data API** for each app; **pages** are screens; **App** wires routes and guards.

### Key takeaways

- Split **UI** (`pages/`) vs **data access** (`firebase/`).
- **Role checks** live in **App** (and sometimes pages).

### Quick check

1. Where would you add a new Commuter screen?
2. Where would you add a new Firestore query for commuters?
3. What’s the difference between `auth.js` and `firestore.js`?

---

# Lesson 9: How build and deployment work

### Build (one app)

```bash
cd /path/to/4CPEA-11        # Commuter root
npm install                 # first time / after dependency changes
npm run dev                 # development
npm run build               # creates dist/ for Commuter only
```

### Build all + hosting

```bash
npm run build:all           # scripts/build-all.js → dist-combined/{Commuter,Admin,Driver}
firebase deploy --only hosting   # uploads dist-combined (when CLI is configured)
```

`firebase.json`:

- **`hosting.public`**: `dist-combined`
- **Rewrites**: e.g. `/Commuter(/.*)?` → `/Commuter/index.html` so **client-side routing** works.

### Environment / secrets

- **Firebase web config** in `config.js` is **expected to be public** in the client (protected by rules and API key restrictions in Firebase console).
- **Gmail** (or other) credentials for Functions are **secrets** — **never** commit to the client bundle.

### In simple words (recap)

**Build** turns React into static files; **hosting** serves them; **rewrites** fix SPA URLs; **secrets** stay on the server.

### Key takeaways

- **Client bundle** ≠ **server secrets**.
- **`build-all`** = three apps → one deploy folder.

### Quick check

1. What folder does Firebase Hosting use as `public` in this project?
2. Why do SPA rewrites exist?
3. Where should Gmail app passwords live?

---

# Lesson 10: Full recap

### Elevator story (~30 seconds)

“We built an **automated fare collection** system: **passengers** use a **Commuter** web app on **Firebase**; **drivers** use an **operations** dashboard; **admins** see **aggregated** performance. **Logins** use **Firebase Auth** with **email two-factor** via **Cloud Functions**. **Trips and balances** live in **Firestore**, and **hardware** (RP4) integrates through **`rp4_debug`** paths and related processing. We deploy **three React apps** on **Firebase Hosting** via **`dist-combined`.”

### One diagram

```
         USERS (roles)
    Commuter | Driver | Admin
              \  |  /
               \ | /
            Firebase Auth
                 |
            Firestore (+ RTDB where used)
                 |
        +--------+---------+
        |                  |
   user/jeepney/tx    rp4_debug / functions
```

### Beginner traps

1. **Thinking the browser “has a database”** — real data is **Firestore** (unless offline persistence is enabled).
2. **Confusing Auth with Firestore** — Auth = identity; Firestore = app records (linked by `uid`).
3. **Forgetting `basename`** — wrong base breaks routes under `/Commuter/`, etc.
4. **Editing only `dist`** — edit **`src`** and rebuild.
5. **Rules vs client checks** — UI role checks are **UX**; **security** must be in **rules** + server where needed.

### How to think like the architect

1. **Data first**: What **document** changes when the user taps “Confirm”?
2. **Flow second**: Which **listener** should update which **state**?
3. **Trust third**: What must **never** run in the browser? → **Functions** + **rules**.

### Key takeaways

- Three React apps, one Firebase backend, Functions for email 2FA, Firestore as core data, RP4 integration for taps/seats, combined hosting for production.  
- **Lessons 11–12** spell out **security layers** (Auth, rules, 2FA, secrets) and **why this stack** vs common alternatives.

### Final quick check

1. List all three apps and their hosted path prefixes.
2. Trace one **write** from UI to Firestore (any example).
3. Trace one **real-time update** from Firestore to UI.
4. Where does 2FA email originate?
5. What command produces `dist-combined`?

---

# Lesson 11: Security measures

This lesson explains **what protects the system** and **why each piece exists**. Security is **layers** (like a house: lock, alarm, fence) — not one single switch.

### 1. Authentication (Firebase Auth)

**Plain language**: The system asks **who you are** (email + password). Google stores and checks passwords using industry-standard practice; your app never stores raw passwords in Firestore for that login step.

**Technical**: **Firebase Authentication** issues tokens; the client sends them with Firestore requests. Rules use **`request.auth`** and **`request.auth.uid`**.

**Why it exists**: Without auth, anyone could pretend to be any user.

**Real use**: Commuter signs in → Auth session active → Firestore allows reads only if rules say that `uid` may see that document.

**In simple words**: Login is the **ID card** every request can show.

---

### 2. Two-factor authentication (2FA) and Cloud Functions

**Plain language**: After password, user proves they **own the email** by typing a **one-time code** sent by email.

**Technical**:

- A **callable Cloud Function** (`sendVerificationCode`) generates a code, stores it in Firestore (`verificationCodes`), sends mail via **Nodemailer** + **Gmail app password** stored as **Firebase Secrets** (server-only).
- Codes have **expiry** (e.g. 10 minutes) in your function logic / document fields.

**Why it exists**: Stolen password alone is not enough; **something you have** (email inbox) is required.

**Real use**: User enters password → Function runs on Google’s servers → email arrives → user enters code → app verifies then completes sign-in.

**In simple words**: 2FA is a **second lock**; the **key** (SMTP password) stays in the **cloud kitchen**, not in the customer’s phone app.

---

### 3. Trusted device (“remember this device”)

**Plain language**: Optional convenience: skip 2FA on a known device for a period.

**Technical**: Tokens stored under `users/{uid}/trustedDevices/...` with Firestore rules allowing **only the owner** to read/write that subcollection.

**Why it exists**: Balance **security** vs **usability** for frequent commuters.

**Beginner trap**: **localStorage** tokens can be abused if **XSS** (malicious script) ever runs on your site — keep dependencies updated and avoid injecting untrusted HTML.

---

### 4. Firestore security rules (the real enforcement)

**Plain language**: Even if someone hacks the **UI** or uses a fake app, **Google’s servers** still check **rules** before any read/write.

**Technical** (`firestore.rules` patterns in this project):

| Idea | Meaning |
|------|--------|
| `isAuthenticated()` | Must be logged in. |
| `isOwner(userId)` | Can only touch **your** `users/{userId}` when `uid` matches. |
| `isActiveUser()` | User exists in `users/` and `isActive` is not `false`. |
| `getUserRole()` | Reads `role`: `commuter` / `driver` / `admin`. |
| **Commuter / Driver / Admin** | Different paths allow different operations (e.g. drivers update **commuter** user docs for tap-in/out; commuters don’t edit jeepney docs). |
| **Jeepneys, shifts, expenses** | Mostly **driver** or **admin** for writes; reads scoped to active users where appropriate. |
| **`rp4_debug`** | Reads for active users; **writes** for driver/admin (hardware pipeline controlled). |

**Why it exists**: **Client-side** checks (React “if driver, hide page”) are **UX only**. **Rules** are **authorization**.

**Real use**: A commuter cannot `update` another commuter’s balance document if rules forbid it — even with a modified browser.

**In simple words**: Rules are the **bouncer at the database door**.

---

### 5. Role separation in each app (client-side gate)

**Plain language**: Each app (Commuter / Driver / Admin) **logs out** or blocks users with the **wrong role** so people don’t use the wrong dashboard by mistake.

**Technical**: After Auth + Firestore `role` check, apps call **`signOut`** and show a message if role doesn’t match the app.

**Why it exists**: **Defense in depth** — better UX and fewer accidental privileged calls; **rules** still must hold if someone bypasses the UI.

---

### 6. Transport and hosting

**Plain language**: Traffic to Firebase Hosting and Google APIs uses **HTTPS** (encrypted in transit).

**Technical**: TLS termination by Google; modern browsers enforce secure contexts for many APIs.

---

### 7. Secrets and configuration

**Plain language**: **Passwords for sending email** never belong inside the React code that anyone can download.

**Technical**: **Firebase Functions secrets** (`GMAIL_USER`, `GMAIL_APP_PASSWORD`) — available only inside the function runtime.

**Public Firebase config** (`apiKey`, `projectId`, … in `config.js`): **Normal** for Firebase web apps; security relies on **rules**, **Auth**, and **console restrictions** (authorized domains, App Check if you add it later), **not** on hiding the config string.

---

### 8. Session vs local storage (2FA flow)

**Plain language**: During 2FA, the app temporarily remembers **which email** is being verified in **`sessionStorage`** (cleared when the tab/session ends, not shared across all tabs the same way as some patterns).

**Technical**: `pendingVerificationEmail` / password — used so the auth listener doesn’t treat the user as fully logged in too early.

**Why**: Avoid **race conditions** between login, 2FA, and routing.

---

### 9. Honest note: `verificationCodes` rules

In this repo, **`verificationCodes/{email}`** is currently allowed with **`if true`** (open read/write). That simplifies development and the 2FA flow but is **not ideal for production**.

**Hardening options** (for future you):

- Only allow writes from **Cloud Functions** (Admin SDK), not clients; or  
- Restrict reads/writes with **custom claims** / **temporary auth** / **server-mediated** verify endpoint.

**Why mention it**: Good defenses **name their weak spots** and plan fixes.

---

### Text diagram (security layers)

```
User → HTTPS → Firebase Auth (identity)
              → Firestore request + ID token
              → Security rules (authorize)
              → Optional: Cloud Functions (privileged actions + secrets)
```

### In simple words (recap)

**Auth** knows who you are; **rules** decide what you may do; **Functions** hold **secrets** and **2FA email**; **roles** split commuter/driver/admin; **HTTPS** protects data in motion.

### Key takeaways

- **Rules** are the authority — not the React `if` statements alone.  
- **2FA + server secrets** protect email-based step-up.  
- **Tighten `verificationCodes`** when you harden for production.

### Quick check

1. What is the difference between **authentication** and **authorization** in this stack?  
2. Why must SMTP credentials live in **Cloud Functions**, not in `src/`?  
3. What does `isOwner(userId)` enforce?  
4. Name one **risk** of open `verificationCodes` rules.  
5. What does **defense in depth** mean here?

---

# Lesson 12: Why these technologies (vs similar alternatives)

This lesson answers: **“Why Firebase / React / Vite / Firestore / Functions instead of X?”** Use it in presentations as **design rationale**, not as “only one right answer.”

### 1. Firebase (BaaS) vs custom backend (e.g. Node.js + Express + PostgreSQL)

**Plain language**: Firebase is a **pre-built backend** (auth, database, hosting, serverless functions) so you spend time on **fare collection features**, not on renting servers and patching Linux.

**Technical**: **Backend-as-a-Service (BaaS)** — operational load shifts to Google; you configure rules and write small Functions.

**Why choose Firebase here**

- **Time-to-deliver**: Auth + DB + hosting + callable APIs with less boilerplate.  
- **Real-time**: First-class listeners match **live jeepney / user / tap** updates.  
- **Cost model**: Often fits **student / prototype / pilot** scale; can optimize later.

**Trade-offs**

- **Vendor tie-in** and **query limits** vs full SQL freedom.  
- **Complex reporting** sometimes easier in **SQL** + BI tools — you can **export** or add **BigQuery** later if needed.

**In simple words**: Firebase = **fast assembly**; DIY backend = **full control**, more **assembly time**.

---

### 2. Cloud Firestore vs traditional SQL (MySQL / PostgreSQL)

**Plain language**: Firestore stores **documents** (JSON-like) in **collections**; your app subscribes to **live changes**.

**Technical**: **NoSQL document DB** with **real-time sync** and **security rules** tied to Auth.

**Why Firestore for AFCS**

- Natural fit for **`users/{id}`**, **`jeepneys/jeep1`**, **`transactions`**, **`rp4_debug/...`** trees.  
- **Listeners** (`onSnapshot`) map cleanly to **dashboards** without polling.

**When SQL might win**

- Heavy **joins** across many tables for **accounting audits** — often done with **exports**, **Cloud Functions aggregations**, or a **read replica** pipeline later.

**In simple words**: Firestore = **live folders**; SQL = **spreadsheets with relationships** — you picked **live folders** for the operational core.

---

### 3. Cloud Functions vs “send email from the browser”

**Plain language**: The browser **cannot** keep an email password secret — anyone can open DevTools and see bundled code.

**Technical**: **Callable / HTTP functions** run in a **trusted environment** with **secrets**.

**Alternatives**: Third-party **email APIs** (SendGrid, etc.) still need **API keys** — same rule: **server-side** only.

**In simple words**: Email sending **must** happen in the **kitchen** (server), not the **dining room** (browser).

---

### 4. React vs Vue / Svelte / Angular

**Plain language**: All can build SPAs; **React** has the largest **ecosystem** (libraries, tutorials, hiring pool).

**Technical**: Component model + hooks; works well with **Vite**.

**Why React here**: Practical **documentation** and **community** for a capstone; any modern framework could work with similar Firebase SDKs.

**In simple words**: React = **popular LEGO set** — easier to find **instructions and bricks**.

---

### 5. Vite vs Create React App (CRA) / plain Webpack

**Plain language**: **Vite** starts the dev server and applies changes **faster** during development.

**Technical**: **ESM-native** dev server, **Rollup**-based production build; CRA is **maintenance-heavy** in the wider ecosystem trend.

**In simple words**: Vite = **faster feedback** while you build.

---

### 6. Three separate React apps vs one app with three “modes”

**Plain language**: You have **three builds** (Commuter, Driver, Admin) under **three URL prefixes**.

**Technical**: Separate **`basename`**, **`vite.config` `base`**, **`build-all.js`** → `dist-combined`.

**Why**

- **Clear separation** of roles and bundles (commuters don’t ship driver-only code paths).  
- **Independent iteration** (team members can work per app).  
- **Hosting rewrites** per path.

**Trade-off**: Some **duplication** (Firebase config, patterns) — acceptable for clarity at this scale.

**In simple words**: Three **doors** to the same **building** instead of one door with three locks.

---

### 7. Realtime Database + Firestore together

**Plain language**: Two Google “real-time” databases — you use **Firestore** as the main app data and **RTDB** for a **fast mirror** (e.g. **lastTap** for hardware readers) in `rp4Taps.js`.

**Technical**: RTDB **JSON tree** can be **lower latency** for certain device patterns; Firestore for **structured** app queries and rules.

**Why not RTDB-only**: Firestore’s **model + rules + queries** fit **users/transactions/jeepneys** better for app logic.

**In simple words**: **Two tools** — **fast sign** for the device, **organized filing** for the app.

---

### 8. Git (and optional CI)

**Plain language**: **Git** saves **versions** of code so you can undo mistakes and collaborate.

**Technical**: Not part of runtime security, but part of **engineering hygiene** — who changed `firestore.rules` and when.

---

### Comparison table (cheat sheet)

| Need | Choice in project | Typical alternative |
|------|-------------------|---------------------|
| Identity | Firebase Auth | Auth0, Cognito, DIY JWT |
| Database + live UI | Firestore | SQL + WebSockets, Supabase |
| Server logic + secrets | Cloud Functions | VPS + Express, Lambda |
| Hosting static SPA | Firebase Hosting | Netlify, Vercel, Nginx |
| Email 2FA | Nodemailer in Functions | SendGrid API in Functions |
| Frontend | React + Vite | Vue, Next.js, Angular |

### In simple words (recap)

You chose **speed, real-time dashboards, and managed security building blocks** (Auth + rules + Functions) over **building and operating your own servers** first — a common **smart trade** for a **systems / IoT / fare** project at academic or pilot scale.

### Key takeaways

- **Firebase** = integrated **Auth + DB + hosting + serverless**.  
- **Firestore** = **live** operational data model.  
- **Functions** = **secrets** and **privileged** steps.  
- **React + Vite** = mainstream, fast dev UX.  
- **Three apps** = **role separation** at deploy boundaries.

### Quick check

1. Name two advantages of BaaS vs your own Express server **for a student/pilot timeline**.  
2. Why is Firestore a good fit for **dashboard subscriptions**?  
3. Can you safely put an SMTP password in React `config.js`? Why?  
4. One reason to use **Vite** over older CRA workflows.  
5. Why split Commuter/Driver/Admin into **three builds**?

---

## Honest limits

- This guide does not list **every** file or every Cloud Function export.  
- **`verificationCodes`** rules should be tightened for production (see Lesson 11).  
- `firebase.json` references a second functions codebase (`cpe-11`); treat it as **additional** server code if you use it.  
- **Backup folders** in the repo are not part of the primary build path unless you deliberately use them.  
- **App Check**, **CAPTCHA**, and **rate limiting** on Functions are **optional hardening** not fully covered in this repo — mention them as **future work** in a defense if asked.

---

## Suggested answers (Quick checks — for self-study)

<details>
<summary>Lesson 1</summary>

1. Commuter, Driver, Admin.  
2. Everyone reads/writes the same Firebase data instead of separate spreadsheets.  
3. Know who is logged in (identity).  
4. Cloud (Cloud Function + Nodemailer).

</details>

<details>
<summary>Lesson 2</summary>

1. `src/main.jsx` under repo root `4CPEA-11/`.  
2. `dist-combined` (see `firebase.json` → `hosting.public`).  
3. Separate dependencies, scripts, and Vite `base` for `/Driver/`.

</details>

<details>
<summary>Lesson 3</summary>

1. `package.json` in each app root.  
2. Tells React Router all app URLs live under that prefix (e.g. `/Commuter`).  
3. Example: Auth, Firestore (and RTDB, Functions, Analytics in Commuter config).

</details>

<details>
<summary>Lesson 4</summary>

1. `#root` (or the element passed to `createRoot`).  
2. Browser storage for small strings, survives refresh.  
3. Hosting needs optimized static files from `dist/`, not raw `src/`.

</details>

<details>
<summary>Lesson 5</summary>

1. `useState`.  
2. Talking to the network, timers, subscriptions — things outside “just drawing UI”.  
3. Parent.

</details>

<details>
<summary>Lesson 6</summary>

1. Firestore `verificationCodes` (keyed by email in your design).  
2. Hides secrets; avoids CORS/email abuse; trusted writes.  
3. `firestore.rules`.

</details>

<details>
<summary>Lesson 7</summary>

1. Live listener: Firestore pushes doc changes to a callback.  
2. Hold email/password during 2FA without treating user as fully logged in.  
3. Example: `transactions`, `users`, `jeepneys` (any one is fine).

</details>

<details>
<summary>Lesson 8</summary>

1. Add route in `App.jsx` + new file under `src/pages/`.  
2. Typically `src/firebase/firestore.js` (or a small module imported from pages).  
3. `auth` = login identity; `firestore` = read/write user and trip data.

</details>

<details>
<summary>Lesson 9</summary>

1. `dist-combined`.  
2. So `/Commuter/any/deep/path` still serves `index.html` and React Router handles the path.  
3. Firebase Functions secrets / environment for Functions — not in React source.

</details>

<details>
<summary>Lesson 10</summary>

1. `/Commuter/`, `/Admin/`, `/Driver/`.  
2. e.g. User taps confirm destination → `updateDoc`/`setDoc` on `users/{uid}`.  
3. e.g. `onSnapshot` on user doc → callback updates React state → UI re-renders.  
4. Cloud Function `sendVerificationCode` (server).  
5. `npm run build:all` (root `package.json`).

</details>

<details>
<summary>Lesson 11 (Security)</summary>

1. **Authentication** = Firebase Auth proves *who* you are (`uid`). **Authorization** = Firestore **rules** decide *what* that identity may read or write.  
2. Anything in `src/` ships to the browser; users can inspect the bundle. SMTP credentials must live only in **Functions** (or another server) as **secrets**.  
3. Only the account whose `request.auth.uid` matches `userId` can be “owner” of `users/{userId}` for operations the rules tie to `isOwner`.  
4. Example risks: anyone could **read** codes, **overwrite** codes, or **spam** writes for guessed emails — undermining or bypassing 2FA unless you add other controls.  
5. **Defense in depth** = several independent layers (HTTPS, Auth, rules, role checks in each app, server-side secrets) so one mistake does not collapse the whole system.

</details>

<details>
<summary>Lesson 12 (Technology choices)</summary>

1. Example: built-in Auth, Firestore, Hosting, Functions in one project; less server ops.  
2. Live listeners and flexible nested documents fit user/jeepney/RP4; SQL is great for heavy reporting but needs extra setup for the same real-time UX.  
3. No — SMTP passwords and privileged logic belong on the server (Functions).  
4. Faster dev feedback and modern build pipeline vs CRA’s slower path.  
5. Separate apps = separate roles and deploy slices; one app would need heavier in-app role routing.

</details>

---

*Document generated to support learning and defense presentations for the CPE11-AFCS / 4CPEA-11 project.*
