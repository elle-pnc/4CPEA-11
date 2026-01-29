/**
 * Utility function to combine class names
 * Similar to the popular 'clsx' or 'classnames' library
 * Handles strings, objects, arrays, and conditional classes
 */
export default function cn(...classes) {
  return classes
    .filter(Boolean)
    .map((cls) => {
      if (typeof cls === 'string') return cls
      if (Array.isArray(cls)) return cls.filter(Boolean).join(' ')
      if (typeof cls === 'object') {
        return Object.entries(cls)
          .filter(([_, value]) => Boolean(value))
          .map(([key]) => key)
          .join(' ')
      }
      return ''
    })
    .filter(Boolean)
    .join(' ')
}