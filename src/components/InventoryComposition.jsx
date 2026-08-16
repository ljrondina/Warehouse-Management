import { num, peso, compact } from '../lib/format'
import Icon from '../lib/icons'

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

export default function InventoryComposition({ k, unit, metric = 'qty', series, onPick }) {
  const money = metric === 'value'
  const available = money ? k.availableValue : k.available
  const reserved = money ? k.reservedValue : k.reserved
  const base = available + reserved
  // The split is computed from whichever metric is showing, so the gauge always
  // agrees with the two figures printed under it. Reserved stock is generally worth
  // more or less per unit than available stock, so the value split is NOT the same
  // percentage as the quantity split — showing one while labelling the other would
  // be a quiet lie.
  const availPct = base > 0 ? Math.round((available / base) * 100) : 0
  const reservedPct = 100 - availPct
  const fmtBig = (v) => (money ? `₱${compact(v)}` : num(v))
  const fmtTile = (v) => (money ? `₱${compact(v)}` : num(v))

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

        {/* The headline readout. Deliberately the largest type in the card: it is the
            one sentence a warehouse manager reads first — how much of what we hold is
            actually free to issue. */}
        <div className="comp-headline">
          <div className="ch-figure">
            <span className="ch-avail tabular">{fmtBig(available)}</span>
            <span className="ch-of">of</span>
            <span className="ch-total tabular">{fmtBig(base)}</span>
          </div>
          <div className="ch-caption">
            {money ? 'value' : unit} available of stock on hand
          </div>
          <div className="ch-split">
            <span className="ch-chip" style={{ '--chip': series.available }}>
              <i /> Available {availPct}%
            </span>
            <span className="ch-chip" style={{ '--chip': series.reserved }}>
              <i /> Reserved {reservedPct}%
            </span>
          </div>
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
