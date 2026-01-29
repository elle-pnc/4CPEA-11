# Driver Web App - CPE11-AFCS

A modern web application for E-Jeep drivers to manage their routes, passengers, and shift information.

## Features

- **Login Page**: Secure authentication with email and password
- **Two-Step Verification**: Enhanced security with 6-digit verification code
- **Dashboard**: 
  - Active passenger status by terminal
  - Current passenger information
  - Shift status and management
  - Revenue and statistics tracking

## Getting Started

### Prerequisites

- Node.js (v18 or higher)
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

3. Open your browser and navigate to `http://localhost:5173`

### Build for Production

```bash
npm run build
```

The built files will be in the `dist` directory.

## Project Structure

```
src/
├── components/       # Reusable components (Logo, etc.)
├── pages/           # Page components (Login, Dashboard, etc.)
├── App.jsx          # Main app component with routing
├── main.jsx         # Entry point
└── index.css        # Global styles
```

## Technologies Used

- React 18
- React Router v6
- Tailwind CSS
- Vite

## Pages

### Login (`/login`)
- Email and password authentication
- Password visibility toggle
- Driver role indicator

### Two-Step Verification (`/verify`)
- 6-digit verification code input
- Auto-focus navigation between inputs
- Paste support for verification codes

### Dashboard (`/dashboard`)
- Real-time passenger information
- Terminal status overview
- Current passenger details with route information
- Shift management
- Revenue and performance statistics

## Notes

- Placeholder data is used for demonstration. Replace with actual API calls for production use.
- The app includes responsive design for various screen sizes.
- Sidebar navigation can be toggled on the dashboard.