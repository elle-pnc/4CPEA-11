/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#1e88e5',
          dark: '#1565c0',
        },
        success: '#4caf50',
        warning: '#ff9800',
        error: '#f44336',
      },
    },
  },
  plugins: [],
}
