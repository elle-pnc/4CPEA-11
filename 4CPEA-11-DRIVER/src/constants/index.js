// Application constants
export const APP_NAME = 'CPE11-AFCS Driver'
export const APP_ROLES = {
  DRIVER: 'Driver',
}

// Route paths
export const ROUTES = {
  LOGIN: '/login',
  VERIFY: '/verify',
  DASHBOARD: '/dashboard',
}

// Sample terminals data
export const SAMPLE_TERMINALS = [
  { id: 1, name: 'Terminal 1' },
  { id: 2, name: 'Terminal 2' },
  { id: 3, name: 'Terminal 3' },
  { id: 4, name: 'Terminal 4' },
]

// Sample current passengers (legacy, not used)
export const SAMPLE_CURRENT_PASSENGERS = []

// Sample stats configuration
export const SAMPLE_STATS = [
  {
    label: 'Current Passengers',
    value: '0',
    icon: 'Users',
    color: 'blue',
  },
  {
    label: 'Total Passengers Today',
    value: '0',
    icon: 'UsersRound',
    color: 'green',
  },
  {
    label: 'Revenue',
    value: '₱0',
    icon: 'DollarSign',
    color: 'yellow',
  },
  {
    label: 'Expenses',
    value: '₱0',
    icon: 'FileText',
    color: 'gray',
  },
  {
    label: 'Profit',
    value: '₱0',
    icon: 'TrendingUp',
    color: 'green',
  },
]

// Assigned vehicle information
export const ASSIGNED_VEHICLE = {
  id: 'jeep1',
  name: 'Jeep 1',
  maxSeats: 2,
}
