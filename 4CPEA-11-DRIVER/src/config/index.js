// Application configuration

export const API_CONFIG = {
  BASE_URL: process.env.VITE_API_BASE_URL || 'http://localhost:3000/api',
  TIMEOUT: 10000,
}

export const APP_CONFIG = {
  NAME: 'CPE11-AFCS',
  VERSION: '1.0.0',
  ENVIRONMENT: import.meta.env.MODE || 'development',
}

export const ROUTE_CONFIG = {
  LOGIN: '/login',
  VERIFY: '/verify',
  DASHBOARD: '/dashboard',
}