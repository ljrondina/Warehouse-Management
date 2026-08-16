// Delivery Tracker — sourced entirely from the real "Warehouse Schedule" sheet in
// sample/MCC. PRC. OSM Delivery Tracker - Presentation.xlsx (see
// deliveryTrackerSheet.js for the generator). No seeded/fabricated rows: this is the
// company's own scheduling snapshot, reproduced as authored.
import { DELIVERY_TRACKER_ROWS } from './deliveryTrackerSheet'

// The sheet's CATEGORY column carries the trade, spelled in the tracker's own shorthand.
// Mapped onto the app's trade names, EXCEPT that this table keeps MEPF as a single trade:
// Mechanical Works, Electrical and Auxiliary Works and Fire Protection Works are
// consolidated under it (the source never splits them, and the schedule is managed as one
// MEPF package), so forcing them apart here would invent a distinction the data lacks.
const TRADE_BY_CATEGORY = {
  STRUCTURAL: 'Structural Works',
  ARCHITECTURAL: 'Architectural Works',
  MEPF: 'MEPF',
}

// Filled in place by rebuildDeliveryRows() so consumers keep a live reference
// after src/lib/hydrate.js swaps in the rows from Postgres.
export const deliveryRows = []

export function rebuildDeliveryRows() {
  deliveryRows.length = 0
  deliveryRows.push(
    ...DELIVERY_TRACKER_ROWS.map((r) => ({ ...r, trade: TRADE_BY_CATEGORY[r.category] || r.category }))
  )
}

rebuildDeliveryRows()

// Same four buckets and order the source sheet itself uses, with a tone/icon per
// urgency — worst (overdue) first, so the card reads as a priority list.
export const DELIVERY_STATUSES = [
  { key: 'Past Due / Update', short: 'Needs Attention', icon: 'alert', tone: 'danger' },
  { key: 'Due in 0-30 Days', short: 'Due 0–30 Days', icon: 'clock', tone: 'warn' },
  { key: 'Due in 31-90 Days', short: 'Due 31–90 Days', icon: 'incoming', tone: 'info' },
  { key: 'Future >90 Days', short: 'Future (90+ Days)', icon: 'calendar', tone: 'neutral' },
]

export const deliveryStatusCounts = (rows = deliveryRows) => {
  const map = {}
  for (const r of rows) map[r.status] = (map[r.status] || 0) + 1
  return map
}

export const distinctProjects = (rows = deliveryRows) => [...new Set(rows.map((r) => r.project))].sort()
export const distinctTrades = (rows = deliveryRows) => [...new Set(rows.map((r) => r.trade))].sort()
