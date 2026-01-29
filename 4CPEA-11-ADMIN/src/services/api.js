// API service layer
// This will be used for making API calls when backend is ready

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api'

/**
 * Generic API request handler
 */
async function apiRequest(endpoint, options = {}) {
  const url = `${API_BASE_URL}${endpoint}`
  
  const config = {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  }

  try {
    const response = await fetch(url, config)
    
    if (!response.ok) {
      throw new Error(`API Error: ${response.statusText}`)
    }
    
    return await response.json()
  } catch (error) {
    console.error('API Request failed:', error.message)
    throw error
  }
}

/**
 * Authentication service
 */
export const authService = {
  login: async (email, password) => {
    return apiRequest('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    })
  },
  
  verify: async (code) => {
    return apiRequest('/auth/verify', {
      method: 'POST',
      body: JSON.stringify({ code }),
    })
  },
  
  logout: async () => {
    return apiRequest('/auth/logout', {
      method: 'POST',
    })
  },
}

/**
 * Admin Dashboard service
 */
export const adminService = {
  getDashboardStats: async () => {
    return apiRequest('/admin/dashboard/stats')
  },
  
  getFleetStatus: async () => {
    return apiRequest('/admin/dashboard/fleet')
  },
  
  getTerminalActivity: async () => {
    return apiRequest('/admin/dashboard/terminals')
  },
  
  getRevenueData: async (period = 'daily') => {
    return apiRequest(`/admin/dashboard/revenue?period=${period}`)
  },
  
  generateReport: async (params) => {
    return apiRequest('/admin/reports/generate', {
      method: 'POST',
      body: JSON.stringify(params),
    })
  },
}

export default {
  authService,
  adminService,
}
