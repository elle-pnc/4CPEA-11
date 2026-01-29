// Utility functions

/**
 * Formats a number as currency
 * @param {number} amount - The amount to format
 * @param {string} currency - The currency symbol (default: '₱')
 * @returns {string} Formatted currency string
 */
export const formatCurrency = (amount, currency = '₱') => {
  return `${currency}${amount.toLocaleString()}`
}

/**
 * Formats a date/time string
 * @param {Date|string} date - The date to format
 * @returns {string} Formatted date string
 */
export const formatTime = (date) => {
  const d = new Date(date)
  return d.toLocaleTimeString('en-US', { 
    hour: 'numeric', 
    minute: '2-digit',
    hour12: true 
  })
}

/**
 * Debounce function to limit function calls
 * @param {Function} func - Function to debounce
 * @param {number} wait - Wait time in milliseconds
 * @returns {Function} Debounced function
 */
export const debounce = (func, wait) => {
  let timeout
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout)
      func(...args)
    }
    clearTimeout(timeout)
    timeout = setTimeout(later, wait)
  }
}