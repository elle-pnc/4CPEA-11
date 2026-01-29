// Application constants
export const APP_NAME = 'CPE11-AFCS'
export const APP_ROLES = {
  DRIVER: 'Driver',
}

// Route paths
export const ROUTES = {
  LOGIN: '/login',
  VERIFY: '/verify',
  DASHBOARD: '/dashboard',
}

// Sample data - to be replaced with API calls
export const SAMPLE_TERMINALS = [
  { id: 1, name: 'Terminal 1', passengers: 1, active: true },
  { id: 2, name: 'Terminal 2', passengers: 1, active: true },
  { id: 3, name: 'Terminal 3', passengers: 0, active: false },
  { id: 4, name: 'Terminal 4', passengers: 0, active: false },
]

export const SAMPLE_CURRENT_PASSENGERS = [
  { id: 1, route: 'From Terminal 1 → Terminal 2', extended: 'Extended to Terminal 4' },
  { id: 2, route: 'From Terminal 2 → Terminal 3', extended: 'Extended to ---' },
]

export const SAMPLE_STATS = [
  { id: 1, label: 'Current Passengers', value: '0', icon: 'Users', color: 'blue' },
  { id: 2, label: 'Total Passengers Today', value: '24', icon: 'UsersRound', color: 'green' },
  { id: 3, label: 'Revenue', value: '₱0', icon: 'DollarSign', color: 'yellow' },
  { id: 4, label: 'Expenses', value: '₱0', icon: 'FileText', color: 'gray' },
  { id: 5, label: 'Profit', value: '₱0', icon: 'TrendingUp', color: 'blue' },
]

export const ASSIGNED_VEHICLE = 'ABC-1234'
export const SHIFT_START_TIME = '6:00 AM'