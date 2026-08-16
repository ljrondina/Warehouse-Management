// Transactional records — movements, reservations, requests, approvals, audit.
//
// These used to be SYNTHESIZED from the inventory so every page looked populated.
// As of the Postgres migration (2026-08-16) they are real tables that START EMPTY
// (supabase/schema.sql) — every row from here on is an actual record created by an
// actual user, with a created_by and a timestamp. Pages that read them show an
// empty state until the warehouse starts transacting.
//
// Each array is filled IN PLACE by hydrate() so `import { movements }` keeps a live
// reference. The Movement History chart on the dashboard is unaffected: it reads the
// real CW Incoming/Outgoing ledger via insights.movementCombinedSeries, not this file.
import { items } from './insights'
import { TODAY } from '../lib/format'

export const movements = []
export const reservations = []
export const purchaseRequests = []
export const materialRequests = []
export const approvals = []
export const auditLog = []

// Sidebar badge counts. A function of the current data rather than a frozen object,
// so it reflects whatever has been loaded.
export const counts = { lowStock: 0, reservations: 0, approvals: 0 }

const fill = (target, rows) => {
  target.length = 0
  target.push(...(rows || []))
}

export function rebuildCounts() {
  counts.lowStock = items.filter((i) => i.availableQty < i.minLevel).length
  counts.reservations = reservations.filter((r) => r.status !== 'Released').length
  counts.approvals = approvals.length
}

export function setTransactions(data = {}) {
  fill(movements, data.movements)
  fill(reservations, data.reservations)
  fill(purchaseRequests, data.purchaseRequests)
  fill(materialRequests, data.materialRequests)
  fill(approvals, data.approvals)
  fill(auditLog, data.auditLog)
  rebuildCounts()
}

rebuildCounts()

// Monthly Incoming vs Outgoing totals from recorded movements, scoped to whatever
// pool the filter search bar has narrowed the page to. Returns a zeroed set of
// buckets while the movements table is still empty, so the chart draws an honest
// flat line rather than throwing.
export function movementSeries(pool, months = 6) {
  const ids = new Set(pool.map((i) => i.id))
  const relevant = movements.filter((m) => ids.has(m.itemId) && (m.type === 'Incoming' || m.type === 'Outgoing'))
  const order = []
  const buckets = new Map()
  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(TODAY.getFullYear(), TODAY.getMonth() - i, 1)
    const key = `${d.getFullYear()}-${d.getMonth()}`
    order.push(key)
    buckets.set(key, { key, label: d.toLocaleDateString('en-PH', { month: 'short' }), incoming: 0, outgoing: 0 })
  }
  for (const m of relevant) {
    const key = `${m.date.getFullYear()}-${m.date.getMonth()}`
    const b = buckets.get(key)
    if (!b) continue // outside the lookback window
    if (m.type === 'Incoming') b.incoming += m.qty
    else b.outgoing += m.qty
  }
  return order.map((k) => buckets.get(k))
}
