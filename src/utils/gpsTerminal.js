/**
 * Parse terminal from GPS-related Firestore docs (rp4_debug gps/current or device root).
 * Kept in sync with 4CPEA-11-DRIVER/src/firebase/firestore.js extractGpsTerminalFromDoc / parent fallback.
 */
export function extractGpsTerminalFromDoc(data) {
  if (!data || typeof data !== 'object') return null
  const tryCoerce = (v) => {
    if (v === undefined || v === null || v === '') return null
    if (v === 'unknown') return 'unknown'
    if (typeof v === 'number' && Number.isFinite(v)) {
      const t = Math.round(v)
      return t >= 1 && t <= 4 ? t : null
    }
    const s = String(v).trim()
    if (/^[1-4]$/.test(s)) return parseInt(s, 10)
    // Firmware strings like "terminal4", "Terminal 3", "TERMINAL2"
    const terminalWord = s.match(/terminal\s*([1-4])(?:\b|$)/i)
    if (terminalWord) return parseInt(terminalWord[1], 10)
    const m = s.match(/\b([1-4])\b/)
    if (m) return parseInt(m[1], 10)
    const n = parseInt(s, 10)
    return Number.isFinite(n) && n >= 1 && n <= 4 ? n : null
  }
  const keys = [
    'currentTerminal',
    'terminal',
    'terminalId',
    'nearestTerminal',
    'detectedTerminal',
    'terminalNumber',
    'nearest_terminal',
  ]
  for (const k of keys) {
    const c = tryCoerce(data[k])
    if (c != null) return c
  }
  return null
}

/**
 * Coerce a live terminal value (number, string, etc.) to 1–4 or null.
 * Used when comparing vehicle position to the commuter's destination.
 */
export function coerceTerminalToNumber(value) {
  return extractGpsTerminalFromDoc({ currentTerminal: value })
}

export function extractParentDocGpsTerminal(data) {
  if (!data || typeof data !== 'object') return null
  const direct = extractGpsTerminalFromDoc({
    currentTerminal:
      data.gpsCurrentTerminal ??
      data.currentGpsTerminal ??
      data.gpsLastTerminal ??
      data.lastGpsTerminal,
  })
  if (direct != null) return direct
  if (data.gps && typeof data.gps === 'object') {
    const nested = extractGpsTerminalFromDoc(data.gps)
    if (nested != null) return nested
  }
  return null
}
