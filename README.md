# CPE11-AFCS (4CPEA-11)

Automated fare collection: **Commuter** (this `src/` app), **Driver** (`4CPEA-11-DRIVER/`), **Admin** (`4CPEA-11-ADMIN/`), **Cloud Functions** (`functions/`, `cpe-11/`), Firebase config, and `docs/SYSTEM_TUTORIAL.md`.

## Features

- **Login Page**: Email and password authentication
- **Two-Step Verification**: 6-digit code verification
- **Commuter Dashboard**: 
  - Card balance display
  - Available modern jeepneys with passenger count (up to 2 passengers)
  - Direction indicators (right/left arrows)
  - Destination terminal selection
- **Choose Destination Terminal**: 
  - Filter terminals based on current location
  - Extend route functionality

## Getting Started

### Prerequisites

- Node.js (v16 or higher)
- npm or yarn

### Installation

1. Install dependencies:
```bash
npm install
```

2. Start the development server:
```bash
npm run dev
```

3. Open your browser and navigate to `http://localhost:3000`

### Building for production

**Commuter only** (output in root `dist/`):

```bash
npm run build
```

**All web apps** for Firebase Hosting (output in `dist-combined/`; ignored by git — run before deploy):

```bash
npm run build:all
```

Install dependencies in each app first if needed: root, `4CPEA-11-ADMIN`, `4CPEA-11-DRIVER`, `functions`, and `cpe-11` (`npm install` in each).

### Deploy (Firebase)

```bash
npm run build:all
firebase deploy
```

Use `firebase deploy --only hosting` or `--only functions` as needed. See **HOSTINGER_DEPLOYMENT.md** and **HOW_TO_UPLOAD_HTACCESS.md** for static hosting on Hostinger.

## Project Structure

```
src/
  ├── pages/
  │   ├── LoginPage.jsx
  │   ├── TwoStepVerificationPage.jsx
  │   ├── CommuterDashboard.jsx
  │   └── ChooseDestinationPage.jsx
  ├── App.jsx
  ├── App.css
  ├── main.jsx
  └── index.css
```

## Usage

1. **Login**: Enter your email and password on the login page
2. **Verify**: Enter the 6-digit verification code
3. **Dashboard**: View your card balance and available jeepneys
4. **Choose Destination**: Select a destination terminal (excludes current terminal)
5. **Extend Route**: Extend your current route to additional terminals

## Notes

- Firebase (Auth, Firestore, Functions, Hosting). Configure `src/firebase/config.js` (see `config.example.js`).
- Do not commit `dist/`, `dist-combined/`, or `4CPEA-11-DRIVER/dist/` — build outputs are gitignored; produce them with the build commands above.

## Technologies Used

- React 18
- React Router DOM
- Vite
- CSS3 (Mobile-first responsive design)
