import { num } from '../lib/format'
import Icon from '../lib/icons'

// The Inventory dashboard used to carry six quantity KPI cards in a grid ABOVE this
// gauge, all six describing the same pile of stock the gauge was already drawing.
// They are consolidated in here: the gauge shows the Available/Reserved split of
// stock on hand, and the six figures sit beside it as tiles that each hover for a
// description and click through to the matching material list.
//
// `field` is the inventory column the drawer filters and sorts on when the tile is
// clicked; `role` indexes the shared per-theme series map so a concept keeps the same
// colour here, in the movement chart and on the storage map.
export const COMPOSITION_STATS = [
  {
    key: 'total', field: 'totalQty', role: 'total', icon: 'inventory', label: 'Total Inventory',
    tip: 'Stock on hand across every material in the Central Warehouse — always equal to Available plus Reserved. Damaged units are flagged in place and counted here; incoming and outgoing are in transit and are not.',
  },
  {
    key: 'available', field: 'availableQty', role: 'available', icon: 'box', label: 'Available',
    tip: 'Stock that is free to issue right now — total on hand less the quantities reserved against project requests.',
  },
  {
    key: 'reserved', field: 'reservedQty', role: 'reserved', icon: 'reserve', label: 'Reserved',
    tip: 'Quantities already allocated to specific project requests and awaiting release.',
  },
  {
    key: 'incoming', field: 'incomingQty', role: 'incoming', icon: 'incoming', label: 'Incoming',
    tip: 'Materials received or returned from sites that are awaiting warehouse acceptance and approval. In transit, so not yet part of stock on hand.',
  },
  {
    key: 'outgoing', field: 'outgoingQty', role: 'outgoing', icon: 'outgoing', label: 'Outgoing',
    tip: 'Materials that have been released and are currently in transit to project sites. In transit, so no longer part of stock on hand.',
  },
  {
    key: 'damaged', field: 'damagedQty', role: 'damaged', icon: 'alert', label: 'Damaged',
    tip: 'Units flagged as damaged and pending disposal review. They sit inside the stock-on-hand total rather than alongside it.',
  },
]

export default function InventoryComposition({ k, unit, series, onPick }) {
  const base = k.available + k.reserved
  const availPct = base > 0 ? Math.round((k.available / base) * 100) : 0
  const reservedPct = 100 - availPct

  return (
    <div className="comp-wrap">
      <div className="comp-gauge">
        {/* column-reverse: the first child renders at the bottom, so Available fills
            from the base up and Reserved caps it off on top. The two segments sum to
            stock on hand by construction, which is the same identity the Movement
            History chart enforces with its stacked areas. */}
        <div className="battery-tube">
          <div className="battery-seg seg-avail" style={{ height: `${availPct}%` }} />
          <div className="battery-seg seg-res" style={{ height: `${reservedPct}%` }} />
          <div className="battery-pct">{availPct}%</div>
        </div>
        <div className="battery-stats">
          <div className="battery-stat-main tabular">
            <span className="bs-avail">{num(k.available)}</span>
            <span className="bs-sep">/</span>
            <span className="bs-total">{num(base)}</span>
            <span className="bs-unit">{unit}</span>
          </div>
          <div className="battery-stat-sub">Available of SOH</div>
        </div>
      </div>

      <div className="comp-stats">
        {COMPOSITION_STATS.map((s) => (
          <button
            key={s.key}
            type="button"
            className="comp-stat"
            style={{ '--cs-color': series[s.role] }}
            onClick={() => onPick({ field: s.field, label: s.label })}
            // The tooltip is a real element rather than a title attribute so it can
            // hold a full sentence and appear without the browser's ~1s delay.
            aria-label={`${s.label}: ${s.tip}`}
          >
            <span className="cs-icon"><Icon name={s.icon} size={17} /></span>
            <span className="cs-body">
              <span className="cs-val tabular">{num(k[s.key])}</span>
              <span className="cs-lbl">{s.label}</span>
            </span>
            <span className="cs-unit">{unit}</span>
            <span className="comp-tip">{s.tip}<em>Click to list these materials</em></span>
          </button>
        ))}
      </div>
    </div>
  )
}
