export const peso = (n, opts = {}) =>
  new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP',
    maximumFractionDigits: opts.decimals ?? 0,
    minimumFractionDigits: opts.decimals ?? 0,
  }).format(n || 0)

export const num = (n) => new Intl.NumberFormat('en-PH').format(Math.round(n || 0))

export const compact = (n) =>
  new Intl.NumberFormat('en-PH', { notation: 'compact', maximumFractionDigits: 1 }).format(n || 0)

export const pct = (n) => `${(n || 0).toFixed(1)}%`

// Base date for the prototype. The SOH snapshot is 2026-07-21; "today" is the latest
// date anywhere in the source workbook — the last outgoing release, three days after
// that cut-off — so no movement on record ever lands on a future date.
export const TODAY = new Date('2026-07-24T00:00:00')

// 'YYYY-MM-DD' from a Date's LOCAL parts, for date-input values. Not
// toISOString().slice(0,10) — that converts to UTC first, so a local-midnight date in any
// positive-offset zone (Manila is +08) comes back as the previous day.
export const isoDate = (d = TODAY) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

export const dateFromOffset = (daysAgo) => {
  const d = new Date(TODAY)
  d.setDate(d.getDate() - daysAgo)
  return d
}

// Format as YYYY MMM DD (e.g., "2026 Aug 13")
export const fmtDate = (d) => {
  const date = d instanceof Date ? d : new Date(d)
  const year = date.getFullYear()
  const month = date.toLocaleDateString('en-PH', { month: 'short' })
  const day = String(date.getDate()).padStart(2, '0')
  return `${year} ${month} ${day}`
}

const MONTH_ABBR = {
  january: 'Jan', february: 'Feb', march: 'Mar', april: 'Apr', may: 'May', june: 'Jun',
  july: 'Jul', august: 'Aug', september: 'Sep', october: 'Oct', november: 'Nov', december: 'Dec',
}
const WEEK_ORDINAL = { first: '1st', second: '2nd', third: '3rd', fourth: '4th', last: 'Last' }

// Normalizes a free-text delivery estimate ("August, 2026", "First Week August 2026",
// "Mid September 2026") into the tracker's compact shorthand — always year-first, so
// it reads against the firm YYYY MMM DD dates in the same column without looking like
// a different kind of value: a plain month becomes "<Year> <Mon>", a week-of-month
// estimate becomes "<Year> <Mon> <Nth> Week", and a mid-month estimate becomes
// "<Year> Mid <Mon>". Falls back to the source text verbatim when it doesn't match one
// of the sheet's known phrasings.
export const fmtTargetText = (text) => {
  if (!text) return ''
  const t = text.trim()

  let m = t.match(/^(first|second|third|fourth|last)\s+week\s+([a-z]+)\s+(\d{4})/i)
  if (m) {
    const mon = MONTH_ABBR[m[2].toLowerCase()]
    if (mon) return `${m[3]} ${mon} ${WEEK_ORDINAL[m[1].toLowerCase()]} Week`
  }

  m = t.match(/^mid\s+([a-z]+)\s+(\d{4})/i)
  if (m) {
    const mon = MONTH_ABBR[m[1].toLowerCase()]
    if (mon) return `${m[2]} Mid ${mon}`
  }

  m = t.match(/^([a-z]+),?\s+(\d{4})/i)
  if (m) {
    const mon = MONTH_ABBR[m[1].toLowerCase()]
    if (mon) return `${m[2]} ${mon}`
  }

  return t
}

export const initials = (name = '') =>
  name
    .split(' ')
    .map((s) => s[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase()
