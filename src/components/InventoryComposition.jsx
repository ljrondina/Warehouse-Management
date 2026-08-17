import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { num, peso, compact } from '../lib/format'
import Icon from '../lib/icons'
import { KpiCard } from './ui'

// The six quantity figures used to sit beside a stock-split gauge; the gauge moved to
// the Floor Plan module (it was a SPACE reading, not a stock one — see
// FacilityCapacityGauge.jsx) and these tiles now run the full width of the card on
// their own, styled like the Safekeeping tab's own KPI row. Clicking a tile expands
// the full material list beneath the whole row rather than opening a side panel,
// since there is no chart beside them any more to share the row with.
//
// `field` is the inventory column the expanded list filters and sorts on when a tile
// is clicked. `role` indexes the shared per-theme series map so a concept keeps the
// same colour here, in the movement chart and on the storage map.
export const COMPOSITION_STATS = [
  {
    // "Total Inventory" = Available + Reserved + Incoming — everything either on the
    // shelf now or already committed to arrive, which is why it does NOT match
    // totalQty (Available + Reserved only) the way it used to. See KPIS() in
    // insights.js for the totalInventory/totalInventoryValue fields this reads.
    key: 'totalInventory', valueKey: 'totalInventoryValue', field: 'totalQty', role: 'total', icon: 'inventory', label: 'Total Inventory',
    tip: 'Available plus Reserved plus Incoming — every unit already on the shelf or already committed to arrive. Outgoing and Damaged are not counted here.',
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

// One compact row per material — code + description on the first line, then the five
// figures that matter (quantity, condition, purchase price, trade, item group) as a
// single wrapping strip beneath it, instead of the old four-section card. This is
// deliberately its own renderer rather than MaterialList's default: this list is now
// full width, so it can afford one dense row per line instead of a stacked card.
function CompRow({ r, field, label }) {
  const nav = useNavigate()
  return (
    <div className="comp-row" onClick={() => nav(`/inventory/${r.id}`)}>
      <div className="cr-main">
        <span className="cr-code">{r.itemCode}</span>
        <span className="cr-desc" title={r.description}>{r.description}</span>
      </div>
      <div className="cr-meta">
        <span className="cr-chip"><small>{label}</small>{num(r[field])} {r.uom}</span>
        <span className="cr-chip"><small>Condition</small>Class {r.conditionClass}</span>
        <span className="cr-chip"><small>Price</small>{peso(r.unitPrice, { decimals: 2 })}</span>
        <span className="cr-chip"><small>Trade</small>{r.tradeL1}</span>
        <span className="cr-chip"><small>Item Group</small>{r.tradeL2}</span>
      </div>
    </div>
  )
}

export default function InventoryComposition({ k, unit, metric = 'qty', series, pool }) {
  const money = metric === 'value'
  const fmtTile = (v) => (money ? `₱${compact(v)}` : num(v))
  // Closed by default — no tile pre-selected. Clicking one expands its list beneath
  // the row; clicking the same tile again (or the close button) collapses it.
  const [selKey, setSelKey] = useState(null)
  const sel = COMPOSITION_STATS.find((s) => s.key === selKey)

  const rows = useMemo(() => {
    if (!sel) return []
    return pool.filter((i) => (i[sel.field] || 0) > 0).sort((a, b) => b[sel.field] - a[sel.field])
  }, [sel, pool])

  return (
    <div className="comp-wrap-v2">
      <div className="kpi-grid comp-kpis">
        {COMPOSITION_STATS.map((s) => (
          <KpiCard
            key={s.key}
            label={s.label}
            value={fmtTile(money ? k[s.valueKey] : k[s.key])}
            unit={money ? 'value' : unit}
            icon={s.icon}
            color={series[s.role]}
            tooltip={s.tip}
            active={selKey === s.key}
            onClick={() => setSelKey((cur) => (cur === s.key ? null : s.key))}
          />
        ))}
      </div>

      {sel && (
        <div className="comp-expand">
          <div className="comp-expand-head">
            <span className="comp-expand-title">{sel.label} <span className="faint">· {rows.length} material{rows.length === 1 ? '' : 's'}</span></span>
            <button className="clp-close" onClick={() => setSelKey(null)} aria-label="Close" title="Close">
              <Icon name="close" size={16} />
            </button>
          </div>
          <div className="comp-rows">
            {rows.length === 0
              ? <div className="empty">No materials in this selection.</div>
              : rows.map((r) => <CompRow key={r.id} r={r} field={sel.field} label={sel.label} />)}
          </div>
        </div>
      )}
    </div>
  )
}
