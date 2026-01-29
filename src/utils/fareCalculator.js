// Fare calculation based on origin and destination terminals
// Fare table mapping: origin-destination -> fare amount
const fareTable = {
  '1-2': 15.00,
  '1-3': 30.00,
  '1-4': 45.00,
  '2-1': 15.00,
  '2-3': 15.00,
  '2-4': 30.00,
  '3-1': 30.00,
  '3-2': 15.00,
  '3-4': 15.00,
  '4-1': 45.00,
  '4-2': 30.00,
  '4-3': 15.00
}

/**
 * Calculate fare based on origin and destination terminals
 * @param {number} origin - Origin terminal ID (1-4)
 * @param {number} destination - Destination terminal ID (1-4)
 * @returns {number} Fare amount in PHP
 */
export const calculateFare = (origin, destination) => {
  if (!origin || !destination || origin === destination) {
    return 0 // Same terminal or invalid route
  }
  
  const key = `${origin}-${destination}`
  return fareTable[key] || 25.00 // Default fare if route not found
}

/**
 * Get all available fares from a specific origin
 * @param {number} origin - Origin terminal ID
 * @returns {Object} Object with destination terminal as key and fare as value
 */
export const getFaresFromOrigin = (origin) => {
  const fares = {}
  for (let dest = 1; dest <= 4; dest++) {
    if (dest !== origin) {
      fares[dest] = calculateFare(origin, dest)
    }
  }
  return fares
}
