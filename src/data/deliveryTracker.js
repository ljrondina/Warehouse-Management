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
// Trade names use the shortened app-wide forms (see renameTrade in trades.js): the
// "Works" suffix is dropped. MEPF stays as-is — the schedule manages it as one package.
const TRADE_BY_CATEGORY = {
  STRUCTURAL: 'Structural',
  ARCHITECTURAL: 'Architectural',
  MEPF: 'MEPF',
}

// The Warehouse Schedule sheet records projects by an informal short name; these are the
// proper project names from the project master list (public.projects), confirmed with
// the procurement team. Applied at build time so the column, the filter dropdown and the
// search box all read the proper name rather than the shorthand.
const PROJECT_NAME_BY_CODE = {
  AVESTA: 'Avesta Residences',
  JABS: '4PH Jab Greenwoods Dasmariñas',
  JENARA: '4PH Jenara Orchard Dasmarinas',
  STREVI: '4PH Strevi Bacoor',
  Southscape: 'Southscapes Trece Martires',
}

// The schedule's item strings are informal and bundle a brand in parentheses. This
// splits each into a proper material NAME + BRAND (+ optional detail), confirmed with
// the procurement team, and carries a `match` keyword the tracker uses to resolve a
// representative item code from the item master at runtime (the sheet has no code of
// its own, and codes are not shipped in this public repo — see ItemLookup.jsx).
const MATERIAL_MAP = {
  'Rebar Coupler & Accessories (Splice Sleeve)': { name: 'Rebar Coupler & Accessories', brand: 'Splice Sleeve', detail: '', match: 'coupler' },
  'AGW Sicher Aluminum': { name: 'Aluminum', brand: 'Sicher', detail: '', match: 'aluminum panel' },
  'KITCHEN CABINET': { name: 'Kitchen Cabinet', brand: '', detail: '', match: 'kitchen cabinet' },
  'KITO SEALANT (Interior)': { name: 'Sealant', brand: 'Kito', detail: 'Interior', match: 'sealant' },
  'Plumbing Fixtures (Laviya)': { name: 'Plumbing Fixtures', brand: 'Laviya', detail: '', match: 'lavatory' },
  'WIRING DEVICES (Lonon)': { name: 'Wiring Devices', brand: 'London', detail: '', match: 'convenience outlet' },
  'Wooden Door (Seyken)': { name: 'Wooden Door', brand: 'Seyken', detail: '', match: 'wooden door' },
}

// Filled in place by rebuildDeliveryRows() so consumers keep a live reference
// after src/lib/hydrate.js swaps in the rows from Postgres.
export const deliveryRows = []

export function rebuildDeliveryRows() {
  deliveryRows.length = 0
  deliveryRows.push(
    ...DELIVERY_TRACKER_ROWS.map((r) => {
      const m = MATERIAL_MAP[r.item] || {}
      return {
        ...r,
        trade: TRADE_BY_CATEGORY[r.category] || r.category,
        project: PROJECT_NAME_BY_CODE[r.project] || r.project,
        materialName: m.name || r.item,
        brand: m.brand || '',
        matDetail: m.detail || '',
        matchKey: m.match || '',
      }
    })
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
