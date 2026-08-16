// ============================================================================
// Central Warehouse Taytay — three-level facility map.
//
// GEOMETRY PROVENANCE. Every shape below is traced from
//   sample/EPC. FIN. WM. CW Taytay Warehouse Plan.pptx  (gitignored — it is a real
//   company drawing and this repository is public).
//
//   · SITE level      — slide 4, "SITE DEVELOPMENT PLAN". Coordinates are the raw
//                       PowerPoint shape offsets in SLIDE INCHES, converted below.
//                       The property boundary is the slide's own freeform path.
//   · WAREHOUSE level — slide 9, "WAREHOUSE PLAN – TOP VIEW". Coordinates are pixel
//                       positions in the underlying CAD raster (628 x 924, portrait),
//                       measured by scanning the drawing for its magenta wall lines
//                       and grey rack frames. The deck presents that plan rotated 90°
//                       clockwise, and so do we — see `pl()`.
//   · RACKING level   — slides 10-15. Bay counts are the numbers printed at each rack
//                       run's ends (13 on Rack 1, 10 on every other). Level heights,
//                       bay loads and frame sizes are from slide 15, "RACKING SYSTEM –
//                       FRONT VIEW".
//
// Keeping the raw drawing coordinates here (rather than pre-converted numbers) means
// anyone can re-open the reference and check a shape against its source.
// ============================================================================

import { items } from './insights'

/* ---------------------------------------------------------------- site level */

// Property boundary bounding box, in slide inches, from the slide-4 freeform path.
const SX = 3.535
const SY = 1.292
const SW = 6.271
const SHT = 4.402

export const SITE_VB = { w: 1000, h: Math.round((SHT / SW) * 1000) } // 1000 x 702

// Slide inches -> site viewBox. BOTH axes divide by SW so the drawing keeps its
// aspect ratio; dividing y by SHT instead would quietly stretch the site north-south.
const k = SITE_VB.w / SW
const sp = (x, y) => [(x - SX) * k, (y - SY) * k]
const sr = (x, y, w, h) => ({ x: (x - SX) * k, y: (y - SY) * k, w: w * k, h: h * k })

export const SITE_BOUNDARY = [
  [3.535, 2.966], [6.333, 1.354], [6.59, 1.292], [9.792, 1.299],
  [9.796, 2.699], [9.801, 4.1], [9.806, 5.5], [3.695, 5.694],
].map(([x, y]) => sp(x, y))

// The building is drawn as three rectangles: the main shed plus two ground-floor
// wings either side of the loading/unloading recess at the bottom. Drawing it as one
// box would swallow the recess the delivery trucks actually back into.
export const SITE_BUILDING = [
  sr(6.599, 1.407, 3.083, 2.659),
  sr(6.595, 4.06, 0.848, 0.648),
  sr(8.329, 4.066, 1.351, 0.641),
]

// Areas that hold material, and are therefore clickable.
export const SITE_AREAS = [
  {
    id: 'warehouse',
    name: 'Central Warehouse',
    role: 'building',
    drill: true,
    note: '2,520 m² enclosed shed. Five material areas inside — open it to go to the warehouse plan.',
    rects: SITE_BUILDING,
    label: sr(6.599, 1.407, 3.083, 2.659),
  },
  {
    id: 'rebar',
    name: 'Deformed Rebar',
    role: 'rebar',
    note: 'Open stockyard bay for reinforcing steel, kept outside the shed and reachable by truck.',
    rects: [sr(3.9675, 3.8635, 0.774, 1.291)],
  },
  {
    id: 'tiles',
    name: 'Tiles Area',
    role: 'tiles',
    note: 'Covered tile stacking area on the open stockyard, beside the warehouse entrance road.',
    rects: [sr(5.183, 3.847, 1.339, 0.835), sr(5.183, 4.684, 1.061, 0.45)],
    label: sr(5.183, 3.847, 1.339, 0.835),
  },
  {
    id: 'mrf',
    name: 'Material Recovery Facility',
    role: 'mrf',
    note:
      'Segregation and recovery yard at the north-west corner of the site. Damaged stock is flagged where it lies ' +
      'rather than physically moved, so this lists every line carrying a damaged quantity — the units awaiting ' +
      'disposition, not lines that have left their rack.',
    rotRect: { cx: 5.1565, cy: 2.462, w: 1.003, h: 0.566, rot: -28.29 },
    rects: [],
  },
]

// Everything else the site plan delineates. Not clickable — nothing is stored here.
export const SITE_FACILITIES = [
  { id: 'yard', name: 'Open Stock Yard', kind: 'yard', rect: sr(4.32, 3.42, 2.28, 1.86), sub: 'accessible to trucks' },
  { id: 'unload', name: '9.0 m Unloading Area', kind: 'yard', rect: sr(4.35, 2.86, 1.72, 0.52) },
  { id: 'carpark', name: 'Car Park', kind: 'park', rect: sr(6.436, 4.812, 0.899, 0.299) },
  { id: 'truckpark', name: 'Delivery Truck Parking', kind: 'park', rect: sr(8.932, 4.837, 0.856, 0.38) },
  { id: 'queue', name: 'Queue Parking', kind: 'park', rect: sr(7.86, 4.96, 0.95, 0.24) },
  { id: 'canopy-e', name: 'Canopy', kind: 'canopy', rect: sr(6.395, 3.384, 0.145, 0.366), vertical: true },
  { id: 'gate', name: 'Entrance / Exit', kind: 'gate', rect: sr(6.568, 3.384, 0.145, 0.366), vertical: true },
  { id: 'canopy-l', name: 'Canopy', kind: 'canopy', rect: sr(7.603, 3.959, 0.673, 0.097) },
  { id: 'bay', name: 'Loading / Unloading', kind: 'dock', rect: sr(7.44, 4.34, 0.98, 0.42) },
]

// Guard posts, drawn where the slide places its guard-post glyphs.
export const SITE_MARKERS = [
  { id: 'guard-1', kind: 'guard', at: sp(7.604, 3.8) },
  { id: 'guard-2', kind: 'guard', at: sp(4.19, 5.42) },
]

// Vehicle route along the site's south access road — the slide's ingress (blue) and
// egress (pink) arrow rows, reduced to one line each with a direction marker.
export const SITE_ROUTES = [
  { id: 'egress', dir: 'out', from: sp(7.55, 5.3), to: sp(5.02, 5.3) },
  { id: 'ingress', dir: 'in', from: sp(5.03, 5.43), to: sp(7.56, 5.43) },
]

/* ----------------------------------------------------------- warehouse level */

// The CAD raster behind slide 9 is 628 x 924 and portrait; the deck rotates it 90°
// clockwise to present it. `pl` does the same rotation: a portrait pixel (ix, iy)
// becomes landscape (924 - iy, ix), so the office end sits on the left and the rack
// runs read left-to-right, exactly as the slide shows them.
export const WH_VB = { w: 924, h: 628 }
const pl = (ix0, iy0, ix1, iy1) => ({ x: 924 - iy1, y: ix0, w: iy1 - iy0, h: ix1 - ix0 })

// 1 px of the CAD raster is ~76 mm: the drawing's own "3950 R-R" clear aisle measures
// 52 px between rack runs. Used only for the dimension read-outs, never for stock.
export const WH_MM_PER_PX = 76

export const WH_BUILDING = pl(38, 25, 607, 842)
export const WH_CANOPY = pl(38, 842, 607, 878)

// Racks. `px` is the run's portrait-x extent (its depth on the plan); `span` is the
// portrait-y extent (its length). Rack 1 stands alone against the west wall and is
// three bays longer than the rest; runs 2-6 are back-to-back pairs, which is how the
// eleven racks the deck names fit into six runs on the drawing.
export const RACKS = [
  { id: 'R1', n: 1, area: 'mepfs', bays: 13, levels: 5, type: 'A', px: [54, 71], span: [31, 480], single: true },
  { id: 'R2', n: 2, area: 'mepfs', bays: 10, levels: 5, type: 'B', px: [122, 139], span: [31, 376] },
  { id: 'R3', n: 3, area: 'mepfs', bays: 10, levels: 5, type: 'B', px: [139, 156], span: [31, 376] },
  { id: 'R4', n: 4, area: 'structural', bays: 10, levels: 5, type: 'B', px: [208, 225], span: [31, 376] },
  { id: 'R5', n: 5, area: 'architectural', bays: 10, levels: 5, type: 'B', px: [225, 242], span: [31, 376] },
  { id: 'R6', n: 6, area: 'safekeeping', bays: 10, levels: 5, type: 'B', px: [294, 311], span: [31, 376] },
  { id: 'R7', n: 7, area: 'safekeeping', bays: 10, levels: 5, type: 'B', px: [311, 328], span: [31, 376] },
  { id: 'R8', n: 8, area: 'safekeeping', bays: 10, levels: 5, type: 'B', px: [380, 397], span: [31, 376] },
  { id: 'R9', n: 9, area: 'safekeeping', bays: 10, levels: 5, type: 'B', px: [397, 414], span: [31, 376] },
  { id: 'R10', n: 10, area: 'safekeeping', bays: 10, levels: 5, type: 'B', px: [465, 482], span: [31, 376] },
  { id: 'R11', n: 11, area: 'safekeeping', bays: 10, levels: 5, type: 'B', px: [482, 499], span: [31, 376] },
]
RACKS.forEach((r) => {
  r.name = `Rack ${r.n}`
  r.rect = pl(r.px[0], r.span[0], r.px[1], r.span[1])
  r.positions = r.bays * r.levels
})

// Two non-pallet storage forms inside the Safekeeping area, both named on slide 13.
export const CANTILEVER = {
  id: 'CANT', name: 'Cantilever', area: 'safekeeping', kind: 'cantilever',
  arms: 3, bayCentre: 900, armLength: 1000, armLoad: 300, upright: 3000,
  bays: 22, levels: 3,
  // Clamped to the wall line (iy 25..842): measured off the raster it read 30..850,
  // which floated the run a few pixels outside the shed it is bolted to.
  rect: pl(571, 32, 594, 838),
}
CANTILEVER.positions = CANTILEVER.bays * CANTILEVER.arms

export const FLOOR_AREA = {
  id: 'FLOOR', name: 'Floor Area', area: 'safekeeping', kind: 'floor',
  rect: pl(500, 40, 570, 820),
}

// The High-Value / Fixed Assets room is fitted out with LS600 boltless shelving:
// four runs of four bays, four shelf levels each (slide 15's LS600 elevation).
export const HV_SHELVING = {
  id: 'HV', name: 'LS600 Shelving', area: 'highvalue', kind: 'shelving',
  runs: 4, bays: 4, levels: 4, bayWidth: 1200, frameHeight: 2100,
}
HV_SHELVING.positions = HV_SHELVING.runs * HV_SHELVING.bays * HV_SHELVING.levels

// Material areas inside the shed. `hull` is the outline the deck highlights; the
// racks listed in `racks` are drawn individually on top of it.
export const WH_AREAS = [
  {
    id: 'mepfs', name: 'MEPFS Materials', short: 'MEPFS', role: 'mepfs',
    trades: ['Mechanical Works', 'Electrical and Auxiliary Works', 'Plumbing Works', 'Fire Protection Works'],
    hull: [pl(46, 28, 164, 490)],
    note: 'Mechanical, electrical, plumbing, fire-protection and auxiliary stock. Racks 1–3.',
  },
  {
    id: 'structural', name: 'Structural Materials', short: 'Structural', role: 'structural',
    trades: ['Structural Works'],
    hull: [pl(206, 28, 227, 380)],
    note: 'Rebar accessories, formwork, concrete and structural steel. Rack 4.',
  },
  {
    id: 'architectural', name: 'Architectural Materials', short: 'Architectural', role: 'architectural',
    trades: ['Architectural Works'],
    hull: [pl(223, 28, 244, 380)],
    note: 'Masonry, ceiling, doors, metals, paint and finishes. Rack 5.',
  },
  {
    id: 'safekeeping', name: 'Safekeeping Materials', short: 'Safekeeping', role: 'safekeeping',
    trades: ['General Requirements', 'Site Works', 'Allied Services'],
    hull: [pl(288, 28, 600, 490), pl(400, 28, 600, 830)],
    note: 'General requirements and project-held goods. Racks 6–11, plus the cantilever run and the open floor area.',
  },
  {
    id: 'highvalue', name: 'High Value Materials / Fixed Assets', short: 'High Value', role: 'highvalue',
    trades: [],
    hull: [pl(91, 581, 210, 756)],
    secure: true,
    note: 'Locked room off the security check. LS600 shelving, four runs of four bays.',
  },
]

// Rooms and working areas. Not material storage, so not clickable, but the plan shows
// them and the map is unreadable without them.
export const WH_ROOMS = [
  { id: 'office', name: 'Warehouse Office', rect: pl(39, 781, 148, 841) },
  { id: 'reception', name: 'Security Reception', rect: pl(148, 781, 198, 841) },
  // Rooms on the west wall start at ix 39, the inside face of that wall (the raster
  // measurement drifted a few pixels into the wall itself on two of them).
  { id: 'pantry', name: 'Pantry', rect: pl(39, 727, 80, 760) },
  { id: 'ee', name: 'EE Cabinet', rect: pl(39, 644, 92, 678) },
  { id: 'check', name: 'Security Check', rect: pl(39, 592, 92, 644) },
  { id: 'sorting', name: 'Sorting Bay', rect: pl(214, 592, 404, 700), area: '90.45 m²', accent: true },
  { id: 'platform', name: 'Platform', rect: pl(223, 700, 364, 730) },
  { id: 'loading', name: 'Loading & Unloading Bay', rect: pl(218, 730, 352, 845), accent: true },
]

// Open floor, with the areas the drawing itself states.
export const WH_OPEN = [
  { id: 'open-1', name: 'Open Flat Area', area: '628.63 m²', rect: pl(38, 382, 607, 568) },
  { id: 'open-2', name: 'Open Flat Area', area: '262.84 m²', rect: pl(405, 690, 607, 800) },
]

export const AREA_BY_ID = Object.fromEntries(WH_AREAS.map((a) => [a.id, a]))

/* ------------------------------------------------------------- racking level */

// Slide 15, INTERLOCK 600 selective pallet racking. Level 1 is a floor position; the
// four above it sit on beams at these heights. Frame height 5000 mm.
export const BEAM_HEIGHTS = [0, 1095, 2295, 3545, 4795]
export const FRAME_HEIGHT = 5000
export const RACK_TYPES = {
  A: { label: 'Type A', bayCentre: 2300, bayLoad: 1200 },
  B: { label: 'Type B', bayCentre: 3300, bayLoad: 1500 },
}
export const LS600_LEVELS = [167, 717, 1267, 1817]

/* ----------------------------------------------------------------- placement */

// -------------------------------------------------------------------------
// HOW A MATERIAL LINE GETS A LOCATION
//
// The stock sheet does not record where anything physically sits — the zone / rack /
// shelf / bin columns it used to carry were synthesized for the prototype and bore no
// relation to this building. Rather than keep showing those, every line is placed by
// the rule the warehouse plan itself implies:
//
//   1. Item group first, where the plan puts that group OUTSIDE the shed —
//      rebar to the Deformed Rebar bay, tiles to the Tiles Area.
//   2. Then value — the top lines by stock value go to the locked High-Value room,
//      which is the same `isHighValue` set the rest of the app already uses.
//   3. Then trade — the four material areas inside the shed are trade areas, so a
//      line's Trade decides which one it belongs to.
//   4. Inside an area, lines are ordered by issue frequency and laid into the rack
//      positions from ground level upward, so fast-moving stock sits at pick height.
//
// Steps 1-3 are a real reading of the plan. Step 4 is a MODEL: which specific bay a
// line occupies is not recorded anywhere and is not a measurement. Every screen that
// shows a bay says so.
// -------------------------------------------------------------------------

const REBAR_GROUPS = new Set(['Rebar Works', 'Rebar Consumables'])
const TILE_GROUPS = new Set(['Tiles', 'Tile Consumables'])
const LONG_UOM = new Set(['M', 'ROLL'])

export function siteAreaFor(it) {
  if (REBAR_GROUPS.has(it.tradeL2)) return 'rebar'
  if (TILE_GROUPS.has(it.tradeL2)) return 'tiles'
  return null
}

export function warehouseAreaFor(it) {
  if (it.isHighValue) return 'highvalue'
  const a = WH_AREAS.find((w) => w.trades.includes(it.tradeL1))
  return a ? a.id : 'safekeeping'
}

// Ordered pallet positions for an area: level 1 across every bay of every rack first,
// then level 2, and so on.
function positionsFor(rackList) {
  const out = []
  const maxLevels = Math.max(...rackList.map((r) => r.levels), 0)
  for (let lvl = 1; lvl <= maxLevels; lvl++) {
    for (const r of rackList) {
      if (lvl > r.levels) continue
      for (let bay = 1; bay <= r.bays; bay++) out.push({ rack: r.id, bay, level: lvl })
    }
  }
  return out
}

function hvPositions() {
  const out = []
  for (let lvl = 1; lvl <= HV_SHELVING.levels; lvl++)
    for (let run = 1; run <= HV_SHELVING.runs; run++)
      for (let bay = 1; bay <= HV_SHELVING.bays; bay++)
        out.push({ rack: `HV${run}`, bay, level: lvl })
  return out
}

// Deterministic ordering — same input, same map, every reload.
const byPickRate = (a, b) =>
  (b.issueFrequency || 0) - (a.issueFrequency || 0) ||
  (b.inventoryValue || 0) - (a.inventoryValue || 0) ||
  a.id - b.id

let cache = null
let cacheKey = -1

// `placement()` is rebuilt whenever the hydrated item count changes, which is the same
// trigger the dashboard's memoised insight lists use.
export function placement() {
  if (cache && cacheKey === items.length) return cache

  const byLine = new Map() // item id -> location
  const site = { rebar: [], tiles: [], mrf: [] }
  const areas = Object.fromEntries(WH_AREAS.map((a) => [a.id, []]))

  for (const it of items) {
    const s = siteAreaFor(it)
    if (s) {
      site[s].push(it)
      byLine.set(it.id, { level: 'site', area: s, label: SITE_AREAS.find((a) => a.id === s).name })
    } else {
      areas[warehouseAreaFor(it)].push(it)
    }
  }
  // The MRF is where damaged stock is segregated for disposition. Those lines are
  // still counted at their storage location — only the damaged quantity is here — so
  // this is a view over the same rows, not a fourth exclusive bucket.
  site.mrf = items.filter((i) => (i.damagedQty || 0) > 0)

  const slots = {} // "rack|bay|level" -> item[]
  const put = (key, it) => { (slots[key] ??= []).push(it) }

  for (const area of WH_AREAS) {
    const pool = areas[area.id].slice().sort(byPickRate)

    if (area.id === 'highvalue') {
      const pos = hvPositions()
      pool.forEach((it, i) => {
        const p = pos[i % pos.length]
        const loc = { level: 'rack', area: area.id, rack: p.rack, bay: p.bay, lvl: p.level, kind: 'shelving' }
        byLine.set(it.id, loc)
        put(`${p.rack}|${p.bay}|${p.level}`, it)
      })
      continue
    }

    let racked = pool
    if (area.id === 'safekeeping') {
      // Long goods go on the cantilever run; bulky reusable kit is block-stacked on
      // the open floor. Both match what slide 13's photographs show in each.
      const cant = pool.filter((i) => LONG_UOM.has(i.uom))
      const floor = pool.filter((i) => !LONG_UOM.has(i.uom) && i.materialType === 'Reusable')
      const rest = pool.filter((i) => !cant.includes(i) && !floor.includes(i))
      cant.forEach((it, i) => {
        const bay = (i % CANTILEVER.bays) + 1
        const arm = (Math.floor(i / CANTILEVER.bays) % CANTILEVER.arms) + 1
        byLine.set(it.id, { level: 'rack', area: area.id, rack: 'CANT', bay, lvl: arm, kind: 'cantilever' })
        put(`CANT|${bay}|${arm}`, it)
      })
      floor.forEach((it) => {
        byLine.set(it.id, { level: 'rack', area: area.id, rack: 'FLOOR', kind: 'floor' })
        put('FLOOR||', it)
      })
      racked = rest
    }

    const rackList = RACKS.filter((r) => r.area === area.id)
    const pos = positionsFor(rackList)
    if (!pos.length) continue
    racked.forEach((it, i) => {
      const p = pos[i % pos.length]
      byLine.set(it.id, { level: 'rack', area: area.id, rack: p.rack, bay: p.bay, lvl: p.level, kind: 'pallet' })
      put(`${p.rack}|${p.bay}|${p.level}`, it)
    })
  }

  cache = { byLine, site, areas, slots }
  cacheKey = items.length
  return cache
}

/* ---------------------------------------------------------------- aggregates */

export const totals = (pool) => ({
  lines: pool.length,
  qty: pool.reduce((a, b) => a + (b.availableQty || 0) + (b.reservedQty || 0), 0),
  available: pool.reduce((a, b) => a + (b.availableQty || 0), 0),
  reserved: pool.reduce((a, b) => a + (b.reservedQty || 0), 0),
  damaged: pool.reduce((a, b) => a + (b.damagedQty || 0), 0),
  value: pool.reduce((a, b) => a + (b.inventoryValue || 0), 0),
  low: pool.filter((i) => i.stockStatus === 'Low' || i.stockStatus === 'Out of Stock').length,
})

// Pallet/shelf positions an area offers, and how many of them the placement fills.
// Occupancy is "positions holding at least one line", not a volume measurement —
// nothing in the system records how full a pallet is.
export function areaCapacity(areaId) {
  const { slots, areas } = placement()
  if (areaId === 'highvalue') {
    const used = Object.keys(slots).filter((k) => k.startsWith('HV')).length
    return { positions: HV_SHELVING.positions, used, unit: 'shelf positions' }
  }
  const rackList = RACKS.filter((r) => r.area === areaId)
  let positions = rackList.reduce((a, r) => a + r.positions, 0)
  let used = Object.keys(slots).filter((k) => rackList.some((r) => k.startsWith(`${r.id}|`))).length
  if (areaId === 'safekeeping') {
    positions += CANTILEVER.positions
    used += Object.keys(slots).filter((k) => k.startsWith('CANT|')).length
  }
  return { positions, used, unit: 'pallet positions', lines: areas[areaId]?.length ?? 0 }
}

export function rackOccupancy(rackId) {
  const { slots } = placement()
  const r = RACKS.find((x) => x.id === rackId)
  if (!r) return { positions: 0, used: 0 }
  let used = 0
  for (let lvl = 1; lvl <= r.levels; lvl++)
    for (let bay = 1; bay <= r.bays; bay++) if (slots[`${r.id}|${bay}|${lvl}`]?.length) used++
  return { positions: r.positions, used }
}

export const slotItems = (rack, bay, level) => placement().slots[`${rack}|${bay}|${level}`] || []

export const areaItems = (areaId) => placement().areas[areaId] || []
export const siteItems = (areaId) => placement().site[areaId] || []

// Where one material line lives — used by the material profile page.
export function locationOf(item) {
  const loc = placement().byLine.get(item.id)
  if (!loc) return null
  if (loc.level === 'site') return { area: loc.label, detail: 'Outdoor stockyard', ...loc }
  const area = AREA_BY_ID[loc.area]
  if (loc.rack === 'FLOOR') return { area: area.name, detail: 'Floor Area — block stacked', ...loc }
  if (loc.rack === 'CANT') return { area: area.name, detail: `Cantilever · Bay ${loc.bay} · Arm ${loc.lvl}`, ...loc }
  if (loc.kind === 'shelving')
    return { area: area.name, detail: `Shelving run ${loc.rack.slice(2)} · Bay ${loc.bay} · Level ${loc.lvl}`, ...loc }
  return { area: area.name, detail: `Rack ${loc.rack.slice(1)} · Bay ${loc.bay} · Level ${loc.lvl}`, ...loc }
}
