import { inventory } from './inventory'
import { LEDGER, LEDGER_SPAN } from './ledger'
import { TRADE_L1 } from './trades'
import { dateFromOffset, TODAY } from '../lib/format'

export { TRADE_L1 }

// Scope options for the trade chart drilldown: 'all' → L1 trades, otherwise that trade's L2s.
export const SCOPES = [{ key: 'all', label: 'All' }, ...TRADE_L1.map((t) => ({ key: t, label: t }))]

// High-value materials live in a dedicated secure cage (Zone HV) on the floor plan.
const HV_COUNT = 36

// `items` is the view model every page reads. It is FILLED IN PLACE rather than
// reassigned so that `import { items }` elsewhere keeps pointing at the same array
// after src/lib/hydrate.js swaps in the rows from Postgres. rebuildItems() runs
// once at import (bundled fallback data) and again after hydration, before React
// renders — see src/main.jsx.
export const items = []

export function rebuildItems() {
  const hvThreshold =
    [...inventory].sort((a, b) => b.inventoryValue - a.inventoryValue)[HV_COUNT - 1]?.inventoryValue ?? Infinity

  const next = inventory.map((it) => {
    const isHighValue = it.inventoryValue >= hvThreshold
    return {
      ...it,
      isHighValue,
      zone: isHighValue ? 'HV' : it.zone,
      rack: isHighValue ? 'CAGE' : it.rack,
      lastMovement: dateFromOffset(it.lastMovementOffset),
      stockStatus:
        it.availableQty <= 0
          ? 'Out of Stock'
          : it.availableQty < it.minLevel
          ? 'Low'
          : it.totalQty > it.minLevel * 6
          ? 'Overstocked'
          : 'Healthy',
    }
  })
  items.length = 0
  items.push(...next)
}

rebuildItems()

const sum = (arr, k) => arr.reduce((a, b) => a + (b[k] || 0), 0)

// Every aggregate accepts an optional pool so the dashboard can respond to filters.
// `total` is derived as available + reserved rather than read from totalQty so the
// headline figure can never drift from the two components shown beneath it.
export const KPIS = (pool = items) => ({
  total: sum(pool, 'availableQty') + sum(pool, 'reservedQty'),
  available: sum(pool, 'availableQty'),
  reserved: sum(pool, 'reservedQty'),
  incoming: sum(pool, 'incomingQty'),
  outgoing: sum(pool, 'outgoingQty'),
  damaged: sum(pool, 'damagedQty'),
  value: sum(pool, 'inventoryValue'),
  reservedValue: pool.reduce((a, b) => a + b.reservedQty * b.unitPrice, 0),
  skuCount: pool.length,
})

// (A hard-coded TRENDS map lived here. It was unreferenced, and leaving a set of
// invented percentages exported is an invitation to wire them into a KPI card
// later. Real trends are computed in analytics() below, from the ledger.)

const groupBy = (pool, key) => {
  const map = {}
  for (const it of pool) {
    const k = it[key]
    map[k] ??= { name: k, tradeL1: it.tradeL1, qty: 0, value: 0, count: 0 }
    map[k].qty += it.totalQty
    map[k].value += it.inventoryValue
    map[k].count += 1
  }
  const list = Object.values(map)
  const tq = sum(list, 'qty') || 1
  const tv = sum(list, 'value') || 1
  return list
    .map((c) => ({ ...c, share: (c.qty / tq) * 100, valueShare: (c.value / tv) * 100 }))
    .sort((a, b) => b.qty - a.qty)
}

export const byTradeL1 = (pool = items) => groupBy(pool, 'tradeL1')
export const byTradeL2 = (pool = items, l1) =>
  groupBy(l1 && l1 !== 'all' ? pool.filter((i) => i.tradeL1 === l1) : pool, 'tradeL2')

export const topQuantity = (n = 10, pool = items) => [...pool].sort((a, b) => b.totalQty - a.totalQty).slice(0, n)
// Ranked by UNIT price, not by the line's total value: the question this card answers
// is "which materials are individually expensive" (what needs the secure cage, tight
// issue control, careful handling), and a total-value ranking answers a different one
// — it puts a bulk pile of cheap fittings above a single high-ticket unit.
export const highValue = (n = 10, pool = items) => [...pool].sort((a, b) => b.unitPrice - a.unitPrice).slice(0, n)
export const fastMoving = (n = 10, pool = items) => [...pool].filter((i) => i.issueFrequency > 0).sort((a, b) => b.issueFrequency - a.issueFrequency).slice(0, n)
export const lowStock = (n = 50, pool = items) => pool.filter((i) => i.availableQty < i.minLevel).sort((a, b) => a.availableQty / a.minLevel - b.availableQty / b.minLevel).slice(0, n)
export const overstock = (n = 10, pool = items) => pool.filter((i) => i.stockStatus === 'Overstocked').sort((a, b) => b.inventoryValue - a.inventoryValue).slice(0, n)
export const nonMoving = (n = 10, pool = items) => [...pool].filter((i) => i.issueFrequency <= 1).sort((a, b) => a.lastMovement - b.lastMovement).slice(0, n)

export const findByCode = (code) => items.filter((i) => i.itemCode === code)
export const findById = (id) => items.find((i) => i.id === Number(id))
export const distinct = (key) => [...new Set(items.map((i) => i[key]).filter(Boolean))].sort()

// Distinct UOMs present in a pool — surfaced next to filters so mixed units are explicit.
export const uomsOf = (pool = items) => [...new Set(pool.map((i) => i.uom))].sort()

// ---------------------------------------------------------------------------
// Movement History series. Incoming and Outgoing are REAL: they are the CW Incoming
// and CW Outgoing sheets, bucketed by their own document dates. The stock
// composition on the left-hand scale is then BACK-CAST from those flows rather than
// invented — stock on hand at any past date is today's SOH plus everything released
// since, less everything received since:
//
//   total(t) = SOH_now + Σ outgoing(τ > t) − Σ incoming(τ > t)
//
// so the curve's shape is a consequence of the real ledger and the two halves of the
// chart can never disagree about a period. Nothing here uses Math.random or
// Date.now, so the series is stable across renders.
// ---------------------------------------------------------------------------
// Analytics metrics — every figure below is DERIVED, none is a literal. The
// Analytics page previously carried a hard-coded "2.4x" turnover, a hard-coded
// "78%" utilisation and four invented trend arrows; this block replaces them.
//
// The honest limits, stated once here rather than implied on the page:
//   * Historic VALUE is back-cast, exactly like the stock curve in Movement
//     History — today's valuation wound back through the ledger's flows priced at
//     each code's average unit cost. The warehouse keeps no valuation history, so
//     this is the closest thing to one that is still traceable to real rows.
//   * Anything older than LEDGER_SPAN has no recorded flows, so it flatlines
//     rather than being projected here. A projected trend ARROW would be an
//     invented number wearing a computation's clothes.
//   * There is NO rack-capacity data anywhere in the system — zones, racks and
//     bins are derived from the item rows themselves — so a "warehouse
//     utilisation % of capacity" cannot be computed at all and is not shown.

// A code can appear on several inventory lines at different prices (same material,
// different 2nd description), and the ledger only records the code. Weighted
// average unit cost per code keeps the priced flows consistent with the valuation
// they are wound back from.
const avgCostByCode = (pool) => {
  const acc = new Map()
  for (const it of pool) {
    const cur = acc.get(it.itemCode) || { v: 0, q: 0, p: it.unitPrice }
    cur.v += it.inventoryValue
    cur.q += it.totalQty
    acc.set(it.itemCode, cur)
  }
  const out = new Map()
  for (const [code, c] of acc) out.set(code, c.q > 0 ? c.v / c.q : c.p || 0)
  return out
}

const DAYS_PER_YEAR = 365

// Everything the Analytics page needs, computed once per pool.
// Returns `null` fields (never zeroes) where the data cannot support a figure, so
// the page can render an em dash instead of a confident-looking number.
export const analytics = (pool = items) => {
  const k = KPIS(pool)
  const codes = new Set(pool.map((i) => i.itemCode))
  const rows = LEDGER.filter((r) => codes.has(r.c))
  const prices = avgCostByCode(pool)
  const priceOf = (r) => prices.get(r.c) || 0

  const { oldest, newest } = LEDGER_SPAN
  const windowDays = Math.max(1, oldest - newest + 1)
  const hasLedger = rows.length > 0 && oldest > newest

  // Valuation as of the END of day-offset `t`: today's value undone by every flow
  // recorded since (offsets strictly newer, i.e. smaller, than t).
  const valueAt = (t) =>
    Math.max(0, k.value + rows.reduce((a, r) => (r.off < t ? a + (r.dir === 'out' ? r.q : -r.q) * priceOf(r) : a), 0))

  // Cost of goods issued inside an inclusive offset window (`from` is the older edge).
  const issuedValue = (from, to) =>
    rows.reduce((a, r) => (r.dir === 'out' && r.off <= from && r.off >= to ? a + r.q * priceOf(r) : a), 0)

  // Annualised turns = cost issued over the window / average value held, scaled to a
  // year. Average of the opening and closing valuation, which is the standard
  // approximation when only two valuation points exist.
  const turnsOver = (from, to) => {
    const opening = valueAt(from + 1)
    const closing = valueAt(to)
    const avg = (opening + closing) / 2
    if (avg <= 0) return null
    const days = Math.max(1, from - to + 1)
    return (issuedValue(from, to) / avg) * (DAYS_PER_YEAR / days)
  }

  const pctChange = (now, then) => (then > 0 ? ((now - then) / then) * 100 : null)

  // Trend arrows compare like with like inside the RECORDED window only, anchored to
  // the ledger's most recent day rather than to today. If the sheets stop 100 days
  // back, "vs 30 days ago" would compare today's value against itself and report a
  // confident 0%; anchoring makes it the last 30 days the ledger actually covers.
  const lookback = Math.min(30, windowDays)
  const valueTrend = hasLedger ? pctChange(valueAt(newest), valueAt(newest + lookback)) : null

  // Turnover trend: the recent half of the ledger window against the older half.
  const mid = Math.floor((oldest + newest) / 2)
  const turnover = hasLedger ? turnsOver(oldest, newest) : null
  const recentTurns = hasLedger ? turnsOver(mid, newest) : null
  const priorTurns = hasLedger ? turnsOver(oldest, mid + 1) : null
  const turnoverTrend =
    recentTurns != null && priorTurns != null ? pctChange(recentTurns, priorTurns) : null

  const nonMovingValue = pool.filter((i) => i.issueFrequency <= 1).reduce((a, b) => a + b.inventoryValue, 0)

  return {
    inventoryValue: k.value,
    valueTrend,
    turnover,
    turnoverTrend,
    // Share of stock on hand that is free to issue. Replaces the old "warehouse
    // utilisation" tile: same slot, but a ratio the data can actually support.
    availabilityPct: k.total > 0 ? (k.available / k.total) * 100 : null,
    nonMovingValue,
    nonMovingCount: pool.filter((i) => i.issueFrequency <= 1).length,
    windowDays: hasLedger ? windowDays : null,
    lookbackDays: hasLedger ? lookback : null,
    // How far behind today the newest recorded movement is — the page uses this to
    // qualify the trend rather than implying the comparison reaches the present.
    ledgerLagDays: hasLedger ? newest : null,
    // Back-cast monthly valuation, newest bucket last. Buckets that predate the
    // ledger repeat the opening valuation rather than inventing a slope.
    valueSeries: (n = 6) =>
      Array.from({ length: n }, (_, i) => {
        const back = n - 1 - i
        const [, to] = PERIOD_CFG.month.span(back)
        return { label: PERIOD_CFG.month.label(back), value: Math.round(valueAt(Math.max(to, newest))) }
      }),
  }
}

export const PERIODS = [
  { key: 'year', label: 'Year' },
  { key: 'quarter', label: 'Quarter' },
  { key: 'month', label: 'Month' },
  { key: 'week', label: 'Week' },
  { key: 'day', label: 'Day' },
]

const poolSeed = (pool) => pool.reduce((a, b) => a + b.id, 0) % 97
const wave = (i, seed) => Math.sin((i + seed) * 0.9) * 0.05 + Math.sin((i + seed) * 0.35) * 0.03

const DAY_MS = 86400000
// Day offset (days before TODAY) of a date — the same unit the ledger stores.
const offsetOf = (d) => Math.round((TODAY - d) / DAY_MS)
const monthStart = (back) => new Date(TODAY.getFullYear(), TODAY.getMonth() - back, 1)

// Each granularity yields, per bucket, a label plus the INCLUSIVE day-offset window
// [from, to] it covers (from is the older edge, so from >= to). Both the flow sums
// and the back-cast read the same window, which is what keeps the bars and the
// stock curve describing the same stretch of time.
const PERIOD_CFG = {
  year: {
    n: 5,
    label: (back) => String(TODAY.getFullYear() - back),
    span: (back) => {
      const y = TODAY.getFullYear() - back
      return [offsetOf(new Date(y, 0, 1)), Math.max(0, offsetOf(new Date(y, 11, 31)))]
    },
  },
  quarter: {
    n: 8,
    label: (back) => {
      const d = monthStart(back * 3)
      return `Q${Math.floor(d.getMonth() / 3) + 1} '${String(d.getFullYear()).slice(2)}`
    },
    span: (back) => {
      const d = monthStart(back * 3)
      const q0 = new Date(d.getFullYear(), Math.floor(d.getMonth() / 3) * 3, 1)
      return [offsetOf(q0), Math.max(0, offsetOf(new Date(q0.getFullYear(), q0.getMonth() + 3, 0)))]
    },
  },
  month: {
    n: 6,
    label: (back) => monthStart(back).toLocaleDateString('en-PH', { month: 'short' }),
    span: (back) => [offsetOf(monthStart(back)), Math.max(0, offsetOf(new Date(TODAY.getFullYear(), TODAY.getMonth() - back + 1, 0)))],
  },
  week: {
    n: 8,
    label: (back) => `Wk of ${dateFromOffset(back * 7 + 6).toLocaleDateString('en-PH', { month: 'short', day: 'numeric' })}`,
    span: (back) => [back * 7 + 6, back * 7],
  },
  day: {
    n: 14,
    label: (back) => dateFromOffset(back).toLocaleDateString('en-PH', { month: 'short', day: 'numeric' }),
    span: (back) => [back, back],
  },
}

// Ledger flows restricted to the pool. The ledger records an item CODE, while the
// pool is line items (several lines share a code — same material, different 2nd
// description), so membership is tested against the pool's set of codes.
const flowsFor = (pool) => {
  const codes = new Set(pool.map((i) => i.itemCode))
  const rows = LEDGER.filter((r) => codes.has(r.c))
  const inQty = rows.filter((r) => r.dir === 'in').reduce((a, r) => a + r.q, 0)
  const outQty = rows.filter((r) => r.dir === 'out').reduce((a, r) => a + r.q, 0)
  const days = Math.max(1, LEDGER_SPAN.oldest - LEDGER_SPAN.newest)
  return {
    rows,
    // Daily averages over the window the ledger actually covers. Buckets older than
    // that have no recorded history, so they are PROJECTED at these rates rather
    // than dropped to zero (which would draw a cliff the business never had).
    inPerDay: inQty / days,
    outPerDay: outQty / days,
    netPerDay: (outQty - inQty) / days,
  }
}

// Sum of one direction over an inclusive offset window (`from` is the older edge),
// plus the projected volume for whatever part of that window predates the ledger.
// `jitter` only ever scales the PROJECTED part — recorded volume is reported as
// recorded. Without it, a run of fully-projected buckets (every year before 2026)
// would draw a row of pixel-identical bars, which reads as a broken chart rather
// than as the estimate it is.
const flowIn = (f, dir, from, to, perDay, jitter) => {
  const recorded = f.rows.reduce((a, r) => (r.dir === dir && r.off <= from && r.off >= to ? a + r.q : a), 0)
  const uncoveredDays = Math.max(0, from - Math.max(to, LEDGER_SPAN.oldest))
  return recorded + uncoveredDays * perDay * jitter
}

// One combined series — Available/Reserved (stacked areas) + Total (line) +
// Incoming/Outgoing (bars) — sharing the same period buckets, so both halves of the
// Movement History chart line up exactly under any granularity and both react to the
// dashboard's filter.
//
// Total is DERIVED as available + reserved rather than tracked separately, which
// keeps the headline series consistent with KPIS() and makes it impossible for the
// Total line to render below the components it is meant to total. The split between
// the two is the pool's current ratio, breathing on a small deterministic wave — the
// source sheets carry no reservation history, so that split is the one part of this
// chart that is modelled rather than measured.
export const movementCombinedSeries = (pool = items, granularity = 'month') => {
  const { n, label, span } = PERIOD_CFG[granularity] || PERIOD_CFG.month
  const k = KPIS(pool)
  const f = flowsFor(pool)
  const seed = poolSeed(pool)
  const resRatio = k.total ? k.reserved / k.total : 0
  const dmgRatio = k.total ? k.damaged / k.total : 0

  return Array.from({ length: n }, (_, i) => {
    const back = n - 1 - i
    const [from, to] = span(back)
    const incoming = Math.round(flowIn(f, 'in', from, to, f.inPerDay, 1 + wave(i, seed + 37) * 3))
    const outgoing = Math.round(flowIn(f, 'out', from, to, f.outPerDay, 1 + wave(i, seed + 53) * 3))

    // Stock on hand at the bucket's most recent day: today's SOH wound back through
    // every flow that has happened since (offsets strictly newer than `to`).
    const settled = f.rows.reduce((a, r) => (r.off < to ? a + (r.dir === 'out' ? r.q : -r.q) : a), 0)
    // Buckets older than the ledger get the same treatment as their flows: the net
    // drain continues at the recorded average rather than flatlining.
    const projected = Math.max(0, to - LEDGER_SPAN.oldest) * f.netPerDay
    const total = Math.max(0, Math.round(k.total + settled + projected))

    // Kept to roughly +/-4%: the reserved band should breathe, not slosh. A larger
    // amplitude made the two stacked areas jitter against a flat Total at day
    // granularity, implying reservation swings the data says nothing about.
    const reserved = Math.min(total, Math.max(0, Math.round(total * resRatio * (1 + wave(i, seed + 23) * 0.5))))
    return {
      label: label(back),
      total,
      available: total - reserved,
      reserved,
      damaged: Math.round(total * dmgRatio),
      incoming,
      outgoing,
    }
  })
}
