import { num, peso, compact } from '../lib/format'
import Icon from '../lib/icons'
import { facilityCapacity } from '../data/warehouseMap'

// The three segments of the capacity gauge below. Each maps to a real area on the
// floor plan (see facilityCapacity() in warehouseMap.js) — Warehouse is every
// warehouse-owned rack (MEPFS, Structural, Architectural, High Value), Safekeeping is
// its own area, and Available is whatever pallet/shelf positions neither has filled.
// This is a SPACE measurement (positions occupied), not a stock measurement — it will
// not agree with the Available/Reserved split above it, and is not meant to.
const CAP_SEGMENTS = [
  { key: 'warehouse', role: 'total', icon: 'warehouse', label: 'Warehouse' },
  { key: 'safekeeping', role: 'reserved', icon: 'vault', label: 'Safekeeping' },
  { key: 'available', role: 'available', icon: 'box', label: 'Available' },
]

// The Inventory dashboard used to carry six quantity KPI cards in a grid ABOVE this
// gauge, plus three value cards beside them — all describing the same stock the gauge
// was already drawing. They are consolidated in here: the gauge shows the
// Available/Reserved split of stock on hand, the six figures sit beside it as tiles
// that hover for a description and click through to the matching material list, and
// the card's own Quantity/Value toggle swaps every figure between units and pesos.
// That toggle is what replaced the separate value cards; Average Value / SKU was
// dropped with them.
//
// `field` is the inventory column the drawer filters and sorts on when a tile is
// clicked (always the quantity column — the drawer lists materials, and "materials
// with a reserved quantity" is the same set in either metric). `role` indexes the
// shared per-theme series map so a concept keeps the same colour here, in the
// movement chart and on the storage map.
export const COMPOSITION_STATS = [
  {
    // "Total on Hand" rather than "Total Inventory": it is the accurate name for what
    // the figure counts, and it is the one label short enough to fit a third-width
    // tile without truncating. The tooltip carries the full definition either way.
    key: 'total', valueKey: 'totalValue', field: 'totalQty', role: 'total', icon: 'inventory', label: 'Total on Hand',
    tip: 'Stock on hand across every material in the Central Warehouse — always equal to Available plus Reserved. Damaged units are flagged in place and counted here; incoming and outgoing are in transit and are not.',
  },
  {
    key: 'available', valueKey: 'availableValue', field: 'availableQty', role: 'available', icon: 'box', label: 'Available',
    tip: 'Stock that is free to issue right now — total on hand less the quantities reserved against project requests.',
  },
  {
    key: 'reserved', valueKey: 'reservedValue', field: 'reservedQty', role: 'reserved', icon: 'reserve', label: 'Reserved',
    tip: 'Quantities already allocated to specific project requests and awaiting release.',
  },
  {
    key: 'incoming', valueKey: 'incomingValue', field: 'incomingQty', role: 'incoming', icon: 'incoming', label: 'Incoming',
    tip: 'Materials received or returned from sites that are awaiting warehouse acceptance and approval. In transit, so not yet part of stock on hand.',
  },
  {
    key: 'outgoing', valueKey: 'outgoingValue', field: 'outgoingQty', role: 'outgoing', icon: 'outgoing', label: 'Outgoing',
    tip: 'Materials that have been released and are currently in transit to project sites. In transit, so no longer part of stock on hand.',
  },
  {
    key: 'damaged', valueKey: 'damagedValue', field: 'damagedQty', role: 'damaged', icon: 'alert', label: 'Damaged',
    tip: 'Units flagged as damaged and pending disposal review. They sit inside the stock-on-hand total rather than alongside it.',
  },
]

export default function InventoryComposition({ k, unit, metric = 'qty', series, onPick, selectedKey }) {
  const money = metric === 'value'
  const fmtTile = (v) => (money ? `₱${compact(v)}` : num(v))

  // Real floor-space occupancy, not a function of the pool or the Quantity/Value
  // toggle — a pallet position is occupied or it isn't, regardless of which metric
  // the rest of the card is showing. Cheap to call per render: it reduces over
  // areaCapacity()'s own placement cache rather than recomputing placement itself.
  const cap = facilityCapacity()
  const capPct = { warehouse: cap.warehousePct, safekeeping: cap.safekeepingPct, available: cap.availablePct }

  return (
    <div className="comp-wrap">
      <div className="comp-gauge">
        {/* column-reverse: the first child renders at the bottom. Warehouse and
            Safekeeping fill up from the base — real racked/shelved space in use —
            and whatever is left rises as Available at the top, the way a tank's
            headroom sits above its contents. */}
        <div className="battery-tube cap-tube">
          {CAP_SEGMENTS.map((s) => (
            <div key={s.key} className="battery-seg cap-seg" style={{ height: `${capPct[s.key]}%`, '--seg': series[s.role] }} />
          ))}
        </div>

        {/* Legend sits beside the tube — the Total/Available stock headline that used
            to sit under it is gone; the gauge is now purely a space reading, and
            printing a stock figure directly beneath it read as though the two
            numbers were describing the same thing. */}
        <div className="comp-gauge-info">
          {/* Mini legend + percentages, one row per segment, in the same top-to-bottom
              order as the tube reads bottom-to-top (Warehouse first, Available last) —
              reading down the legend matches reading up the tube. No colour swatch:
              each segment's own icon already carries its identity, so a second colour
              chip beside it repeated the same information. */}
          <div className="cap-legend">
            {CAP_SEGMENTS.map((s) => (
              <span key={s.key} className="cap-item" style={{ '--seg': series[s.role] }}>
                <Icon name={s.icon} size={12} />
                <span className="cap-lbl">{s.label}</span>
                <span className="cap-pct tabular">{Math.round(capPct[s.key])}%</span>
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className="comp-stats">
        {COMPOSITION_STATS.map((s) => (
          <button
            key={s.key}
            type="button"
            className={`comp-stat ${selectedKey === s.key ? 'selected' : ''}`}
            aria-pressed={selectedKey === s.key}
            style={{ '--cs-color': series[s.role] }}
            onClick={() => onPick(selectedKey === s.key ? null : { key: s.key, field: s.field, label: s.label })}
            // A real tooltip element rather than a title attribute so it can hold a
            // full sentence and appear without the browser's ~1s delay.
            aria-label={`${s.label}: ${s.tip}`}
          >
            <span className="cs-icon"><Icon name={s.icon} size={17} /></span>
            <span className="cs-body">
              {/* No per-tile unit chip. Printing "units" six times down the card cost
                  the figures the width they needed to render without truncating, and
                  the headline beside the gauge already names the unit once. The exact
                  value and its unit are on the tile's own title attribute. */}
              <span className="cs-val tabular" title={money ? peso(k[s.valueKey]) : `${num(k[s.key])} ${unit}`}>
                {fmtTile(money ? k[s.valueKey] : k[s.key])}
              </span>
              <span className="cs-lbl">{s.label}</span>
            </span>
            <span className="comp-tip">{s.tip}<em>Click to list these materials</em></span>
          </button>
        ))}
      </div>
    </div>
  )
}
