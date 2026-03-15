# Objective 5: Driver and Administrator Dashboards

**Research Objective:** Design and develop the driver and administrator dashboards for operational monitoring and financial analytics.

---

## Design

### Design Requirements

- **Driver dashboard:** Operational monitoring — waiting passengers, onboarded passengers, shift, route, revenue, expenses, profit
- **Administrator dashboard:** Financial analytics — KPIs, charts, reports, terminal activity

### Design Decisions

| Decision | Rationale |
|----------|-----------|
| Separate apps | Driver and Admin have different roles; separate deployment and access control |
| Dashboard layout | Driver: terminals left, passengers/stats/route right; Admin: KPI grid, then fleet, terminals, chart |
| Real-time data | Firestore `onSnapshot` for live updates; no manual refresh |
| Terminal counts | Driver: count waiting users per terminal; Admin: boarding/alighting from transactions |
| Shift tracking | Driver: start/end; store in `driverShifts`; Philippines time for display |
| Expense tracking | Driver: add expenses; Admin: aggregate across drivers for profit calculation |
| Chart periods | Admin: Daily, Weekly, Monthly, Yearly; `subscribeRevenueProfitChart(period)` |
| Report formats | PDF (print) and CSV (download) for portability |

### User Flow Design

**Driver:** Login → 2FA → Dashboard → Start shift → Monitor terminals, passengers, stats → Update route → Add expenses → End shift

**Admin:** Login → 2FA → Dashboard → View KPIs, charts, terminal activity → Generate report (date range, type, format)

---

## Development

---

## Part A: Driver Dashboard

*Treated as standalone module. Create new project folder.*

### Step 1: Create Driver Project

```bash
cd /Users/lloyd/4CPEA-11
mkdir 4CPEA-11-DRIVER
cd 4CPEA-11-DRIVER
npm create vite@latest . -- --template react
```

### Step 2: Install Dependencies

```bash
npm install
npm install react-router-dom firebase lucide-react
npm install -D @vitejs/plugin-react tailwindcss postcss autoprefixer
npx tailwindcss init -p
```

### Step 3: Add Tailwind Config

Create `tailwind.config.js`: `content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"]`

Create `postcss.config.js`: `plugins: { tailwindcss: {}, autoprefixer: {} }`

Add to `src/index.css`:
```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

### Step 4: Add Firebase Config

Create `src/firebase/` folder. Add `src/firebase/config.js` (copy from Commuter; same Firebase project).

### Step 5: Add Driver Firestore Module

Create `4CPEA-11-DRIVER/src/firebase/firestore.js`:

- `subscribeUsersByStatus(status, callback)` — real-time users with status 'waiting' or 'onboarded'
- `subscribeJeepney(jeepneyId, callback)` — real-time jeepney data
- `syncJeepneySeatCount(jeepneyId)` — align seatCount with onboarded count
- `subscribeDailyPassengerCount(callback)` — count trip transactions today
- `subscribeDailyRevenue(callback)` — sum trip amounts today
- `subscribeDailyExpenses(userId, callback)` — sum driver expenses today
- `getActiveShift(userId)`, `startShift(userId, startAtLocal)`, `endShift(shiftId, endAtLocal)`
- `saveDailyExpenses(userId, amount, note)`
- `subscribeUserTripTransactions(userId, callback)` — count trip transactions (for "Extended" badge)
- `updateJeepneyRoute(jeepneyId, fromTerminal, toTerminal)`
- `verifyCode`, `saveTrustedDevice`, `checkTrustedDevice`

### Step 6: Add Firestore Rules for Driver

Ensure `firestore.rules` includes:

- `driverShifts/{shiftId}`: read/create/update if userId matches
- `driverExpenses/{expenseId}`: read if authenticated; create/update if userId matches

### Step 7: Add Constants

Create `src/constants/index.js`:

- `SAMPLE_TERMINALS`: [{ id: 1, name: 'Terminal 1' }, ...]
- `SAMPLE_STATS`: Current Passengers, Total Passengers Today, Revenue, Expenses, Profit
- `ROUTES`: LOGIN, VERIFY, DASHBOARD

### Step 8: Add Login and Two-Step Verification Pages

Create `src/pages/Login.jsx`, `src/pages/TwoStepVerification.jsx` — same flow as Commuter (2FA, trusted device).

### Step 9: Add Dashboard Layout

Create `src/pages/Dashboard.jsx`:

- `DashboardHeader`, `Sidebar` (from `src/components/dashboard/`)
- Grid layout: left column (terminals), right column (passengers, shift, stats, route)

### Step 10: Add Terminals Section

In `Dashboard.jsx`:

- Subscribe to `subscribeUsersByStatus('waiting')`
- Compute `terminalCounts`: for each terminal 1–4, count waiting users whose `currentRoute.from` or `currentTerminal` matches
- Display terminal cards with passenger count; highlight if count > 0

### Step 11: Add Current Passengers Section

In `Dashboard.jsx`:

- Subscribe to `subscribeUsersByStatus('onboarded')`
- Display seat count from `subscribeJeepney('jeep1')` (e.g., 1/2)
- List onboarded users with route (From Terminal X → To Terminal Y)
- Subscribe to `subscribeUserTripTransactions` per onboarded user; if count ≥ 2, show "Extended" badge

### Step 12: Add Shift Status Section

In `Dashboard.jsx`:

- "Start Shift" / "End Shift" button
- On start: `startShift(userId, getPhilippinesTimeString())` → store shiftId
- On end: `endShift(shiftId, getPhilippinesTimeString())` → clear shiftId
- Display "Shift started at HH:MM"

### Step 13: Add Statistics Section

In `Dashboard.jsx`:

- Current Passengers: from jeepney seatCount
- Total Passengers Today: from `subscribeDailyPassengerCount`
- Revenue: from `subscribeDailyRevenue` (formatted ₱X,XXX.XX)
- Expenses: from `subscribeDailyExpenses` (clickable to add expense)
- Profit: Revenue − Expenses

### Step 14: Add Route Selection Section

In `Dashboard.jsx`:

- From/To dropdowns (terminals 1–4); side-by-side layout
- Subscribe to jeepney for current route display
- "Update Route" button → `updateJeepneyRoute('jeep1', selectedFromTerminal, selectedToTerminal)`

### Step 15: Add Expenses Modal

In `Dashboard.jsx`:

- Modal: amount input, description input
- On save: `saveDailyExpenses(userId, amount, description)`

### Step 16: Add UI Components

Create `src/components/dashboard/DashboardHeader.jsx`, `Sidebar.jsx`

Create `src/components/ui/Card.jsx`, `Button.jsx`

Create `src/components/Terminal.jsx`, `Seat.jsx`, `UserOnline.jsx`, `UserActive.jsx`, `UserInactive.jsx`

Create `src/hooks/useSidebar.js`

### Step 17: Add Routing

Update `src/App.jsx`:

- Routes: `/`, `/login`, `/verify`, `/dashboard`
- Redirect `/` to `/login`; protect `/dashboard` with auth

### Step 18: Build Driver Dashboard

```bash
cd /Users/lloyd/4CPEA-11/4CPEA-11-DRIVER
npm run build
```

Output: `4CPEA-11-DRIVER/dist/`

---

## Part B: Administrator Dashboard

*Treated as standalone module. Create new project folder.*

### Step 1: Create Admin Project

```bash
cd /Users/lloyd/4CPEA-11
mkdir 4CPEA-11-ADMIN
cd 4CPEA-11-ADMIN
npm create vite@latest . -- --template react
```

### Step 2: Install Dependencies

```bash
npm install
npm install react-router-dom firebase lucide-react recharts
npm install -D @vitejs/plugin-react tailwindcss postcss autoprefixer
npx tailwindcss init -p
```

### Step 3: Add Tailwind Config

Create `tailwind.config.js`, `postcss.config.js` (same as Driver).

Add to `src/index.css`:
```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

### Step 4: Add Firebase Config

Create `src/firebase/config.js` (copy from Commuter).

### Step 5: Add Admin Firestore Module

Create `4CPEA-11-ADMIN/src/firebase/firestore.js`:

- `subscribeDailyPassengerCount(callback)` — aggregate trip count today
- `subscribeDailyRevenue(callback)` — aggregate trip revenue today
- `subscribeDailyExpenses(callback)` — aggregate all driver expenses today (not user-scoped)
- `subscribeTerminalActivity(callback)` — boarding/alighting per terminal from transactions
- `subscribeRevenueProfitChart(period, callback)` — Daily/Weekly/Monthly/Yearly; returns `[{ label, revenue, profit }]`
- `subscribeYesterdayStats(callback)` — yesterday's passengers, revenue, expenses, profit
- `getHistoricalData(startDate, endDate)` — summary, terminal activity, transactions, expenses for reports

### Step 6: Add Login and Two-Step Verification Pages

Create `src/pages/Login.jsx`, `src/pages/TwoStepVerification.jsx`.

### Step 7: Add KPI Stat Cards

In `src/pages/Dashboard.jsx`:

- Total Passengers Today
- Revenue Today
- Expenses Today
- Profit Today (Revenue − Expenses)
- Each card: value, % change vs yesterday (from `subscribeYesterdayStats`), secondary metric (e.g., revenue per passenger, profit margin)

### Step 8: Add Fleet Seat Monitoring Card

In `Dashboard.jsx`:

- Vehicle ID, route
- Available/occupied seats (from jeepney or placeholder)
- Utilization %

### Step 9: Add Terminal Activity Section

In `Dashboard.jsx`:

- Subscribe to `subscribeTerminalActivity`
- Display cards per terminal: Boarding, Alighting, Total Activity

### Step 10: Add Revenue & Profit Chart

In `Dashboard.jsx`:

- Install and use Recharts: `BarChart`, `AreaChart`, `XAxis`, `YAxis`, `Tooltip`, `Legend`, `ResponsiveContainer`, `Bar`, `Area`, `Cell`
- Subscribe to `subscribeRevenueProfitChart(chartPeriod, callback)`
- Period filters: Daily, Weekly, Monthly, Yearly
- Chart type toggle: Bar or Area
- Data shape: `{ day, revenue, profit }`

### Step 11: Add Report Modal

Create `src/components/ReportModal.jsx`:

- Report type: Summary / Detailed
- Date range: start date, end date
- Format: PDF / CSV
- On generate: call `onGenerate(options)`

### Step 12: Add Report Generator Utility

Create `src/utils/reportGenerator.js`:

- `generateReport(reportData, format)` — if PDF: open print window with formatted HTML; if CSV: `generateCSV`, `downloadFile`
- `formatDate`, `formatDateRange`
- `getHistoricalData` fetches data; `reportData` includes summary stats, terminal activity, transactions, expenses

### Step 13: Add Dashboard Layout

In `Dashboard.jsx`:

- `Sidebar`, `DashboardHeader`
- Stats grid, fleet card, terminals grid, chart card, "Generate Report" button

### Step 14: Add Routing

Update `src/App.jsx`:

- Routes: `/`, `/login`, `/verify`, `/dashboard`

### Step 15: Build Administrator Dashboard

```bash
cd /Users/lloyd/4CPEA-11/4CPEA-11-ADMIN
npm run build
```

Output: `4CPEA-11-ADMIN/dist/`
