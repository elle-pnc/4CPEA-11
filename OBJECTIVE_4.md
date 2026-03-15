# Objective 4: Extended Terminal Mechanism

**Research Objective:** Design and develop an extended terminal mechanism within the commuter interface that allows changes to a farther terminal after boarding with corresponding fare adjustment.

*Assumes Objective 1 (Commuter interface) exists.*

---

## Design

### Design Requirements

- **Extended terminal mechanism:** Allow user to change destination to a farther terminal while onboarded
- **Farther terminal:** Only terminals beyond current destination in the same direction (e.g., if 1→2, can extend to 3 or 4)
- **Fare adjustment:** Deduct additional fare for the extension segment (current destination → new terminal)

### Design Decisions

| Decision | Rationale |
|----------|-----------|
| Extend only when onboarded | User must be on the jeepney to extend; "Extend To" visible only when status = onboarded |
| Reuse ChooseDestinationPage | Same page, different mode; avoid duplicate UI |
| Extend in same direction only | Forward (1→2→3→4) or backward (4→3→2→1); no crossing |
| End terminal check | Cannot extend beyond terminal 4 (forward) or terminal 1 (backward) |
| Confirmation modal | Show "Extend from X to Y. Additional fare: ₱Z" before deducting |
| Fare from current destination | Extension fare = `calculateFare(currentRoute.to, newTerminal)` |

### User Flow Design

1. User is onboarded (status = onboarded)
2. Dashboard shows "Extend To" if destination is not end terminal
3. User taps "Extend To" → navigates to ChooseDestinationPage (mode: extend)
4. User selects farther terminal → confirmation modal
5. User confirms → fare deducted, route updated, transaction added → return to dashboard

---

## Development

*Steps add or extend files.*

### Step 1: Add Extend Mode to ChooseDestinationPage

In `src/pages/ChooseDestinationPage.jsx`:

- Add `mode` from `location.state` — `'choose'` or `'extend'`
- Add `currentRoute` from `location.state` when mode is `'extend'`

---

## Step 2: Add Extend Terminal Filter Logic

In `ChooseDestinationPage.jsx`:

- **Extend mode:** Filter terminals based on route direction
  - If `to > from` (forward): show terminals `> to`, exclude `from`; if `to === 4`, no terminals (end reached)
  - If `to < from` (backward): show terminals `< to`, exclude `from`; if `to === 1`, no terminals

---

## Step 3: Add Fare Calculation for Extension

In `ChooseDestinationPage.jsx`:

- For extend: `fare = calculateFare(currentRoute.to, selectedTerminal)` — fare from current destination to new terminal
- Display fare per selectable terminal

---

## Step 4: Add Extend Confirmation Modal

In `ChooseDestinationPage.jsx`:

- On terminal select in extend mode: show confirmation modal
- Display: "Extend from Terminal X to Terminal Y. Additional fare: ₱Z"
- Confirm button triggers `handleConfirmExtend`

---

## Step 5: Add handleConfirmExtend Logic

In `ChooseDestinationPage.jsx`:

- `extendedRoute = { from: currentRoute.to, to: pendingExtendTerminal }`
- `fullExtendedRoute = { from: currentRoute.from, to: pendingExtendTerminal }`
- Deduct fare: `updateUserBalance(userId, -fare)`
- Update route: `updateUserRoute(userId, fullExtendedRoute)`
- Add transaction: `addTransaction(userId, { type: 'trip', amount: -fare, route: extendedRoute, ... })`
- Navigate to `/dashboard`

---

## Step 6: Add "Extend To" Button on Dashboard

In `src/pages/CommuterDashboard.jsx`:

- Show "Extend To" button only when `userStatus === 'onboarded'` and `canExtendRoute()` is true
- `canExtendRoute()`: return false if `to === 4` (forward) or `to === 1` (backward)
- On click: `navigate('/choose-destination', { state: { mode: 'extend', currentRoute } })`

---

## Step 7: Add "End terminal reached" Message

In `CommuterDashboard.jsx`:

- When onboarded and `!canExtendRoute()`: show info badge "End terminal reached. Cannot extend further."

---

## Step 8: Build Objective 4 Module

```bash
npm run build
```

Objective 4 extends the Commuter app; no separate build. Output remains in `dist/`.
