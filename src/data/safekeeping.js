// Safekeeping module data layer. The three transaction/stock tables are the COMPLETE
// sheets from `sample/CW Taytay inventory ao 2026 07 21.xlsx`, generated into
// ./safekeepingSheets.js — see that file's header for the source-data caveats.
//
// Unlike src/data/inventory.js (warehouse-owned stock), every row here belongs to a
// project; the warehouse is only the storage facility.
import { SOH_ROWS, INCOMING_ROWS, OUTGOING_ROWS } from './safekeepingSheets'

// Every export below is filled IN PLACE by rebuildSafekeeping() — never reassigned —
// so `import { soh }` elsewhere still points at the live array after
// src/lib/hydrate.js replaces the bundled rows with the ones from Postgres.
export const soh = []
// Dates arrive as ISO strings from the generator; Date objects are what the table
// formatters and sorts expect, so they are built once here rather than per render.
export const incoming = []
export const outgoing = []

// Vocabularies taken from the data itself, so a value that exists in the sheet can
// never be missing from a dropdown.
const distinctOf = (rows, key) => [...new Set(rows.map((r) => r[key]).filter(Boolean))].sort()

export const CLASSES = []
export const CONDITIONS = []
export const CATEGORIES = []
export const TRADES = []
export const ITEM_GROUPS = []
export const SHEET_PROJECTS = []
export const UOMS = []

const fill = (target, values) => {
  target.length = 0
  target.push(...values)
}
const withDate = (r) => ({ ...r, date: r.date ? new Date(`${r.date}T00:00:00`) : null })

export function rebuildSafekeeping() {
  fill(soh, SOH_ROWS)
  fill(incoming, INCOMING_ROWS.map(withDate))
  fill(outgoing, OUTGOING_ROWS.map(withDate))

  const all = [...soh, ...incoming, ...outgoing]
  const logs = [...incoming, ...outgoing]
  fill(CLASSES, distinctOf(all, 'class'))
  fill(CONDITIONS, distinctOf(logs, 'condition'))
  fill(CATEGORIES, distinctOf(logs, 'category'))
  fill(TRADES, distinctOf(soh, 'trade'))
  fill(ITEM_GROUPS, distinctOf(soh, 'itemGroup'))
  fill(SHEET_PROJECTS, distinctOf(all, 'project'))
  fill(UOMS, distinctOf(all, 'uom'))

  UOM_BY_CODE.clear()
  for (const r of all) {
    if (r.itemCode && r.uom && !UOM_BY_CODE.has(r.itemCode)) UOM_BY_CODE.set(r.itemCode, r.uom)
  }
}

export const PACKING_TYPES = ['Box', 'Carton', 'Container', 'Van', 'Crate', 'Pallet', 'Pieces', 'Bundle', 'Roll', 'Rack', 'Skid']
// Packing types that need Length x Width x Height; the rest are counted, not crated.
export const DIMENSIONED_PACKING = ['Box', 'Carton', 'Container', 'Van', 'Crate', 'Pallet', 'Rack', 'Skid']

// itemCode -> UOM, so the request form can settle a unit from the code alone. Built from
// every sheet: the item master only carries a UOM on a minority of its rows, and these
// are the units this warehouse has actually used for the item.
const UOM_BY_CODE = new Map()
export const uomForItemCode = (code) => UOM_BY_CODE.get(code) || ''

// Initial build from the bundled snapshot; hydrate.js calls it again with DB rows.
rebuildSafekeeping()

/* ------------------------------------------------------------------- Numbering --- */
// The sheets hold no request register, so there is nothing to seed here — every
// Safekeeping Request comes from an actual submission of the "+ New Transaction" form
// (see SafekeepingContext) and starts numbering fresh at SRN-000001.
const pad = (n, w) => String(n).padStart(w, '0')
let seq = 1
export const nextSrn = () => `SRN-${pad(seq++, 6)}`
export const peekNextSrn = () => `SRN-${pad(seq, 6)}`
export const nextPackingListNo = (srn, existingCount) => `${srn}-${existingCount + 1}`
