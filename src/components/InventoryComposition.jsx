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

// Same table shape as the Inventory Master List's "Full" view — `.data.inv-table`
// with a header row, `.inv-item.full` rows, and the description cell stacking the
// detailed description and the trade path beneath the material name. Reusing those
// classes (rather than a bespoke card) is what keeps the two lists reading as the
// same object: a row here and a row there line up column for column.
//
// Only the quantity column is card-specific — its header takes the clicked tile's
// own label, since "Reserved" and "Incoming" are different numbers off the same row.
const COMP_COLUMNS = [
  { key: 'itemCode', label: 'Item Code', width: 96 },
  { key: 'description', label: 'Material Description', width: null },
  { key: 'qty', label: 'Qty', width: 88, num: true },
  { key: 'uom', label: 'UOM', width: 60 },
  { key: 'unitPrice', label: 'Purchase Price', width: 118, num: true },
  { key: 'conditionClass', label: 'Condition', width: 84 },
]

export default function InventoryComposition({ k, unit, metric = 'qty', series, pool }) {
  const nav = useNavigate()
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
          <div className="comp-rows inv-scroll">
            {rows.length === 0
              ? <div className="empty">No materials in this selection.</div>
              : (
                <table className="data inv-table comp-table">
                  <colgroup>
                    {COMP_COLUMNS.map((c) => <col key={c.key} style={c.width ? { width: c.width } : undefined} />)}
                  </colgroup>
                  <thead>
                    <tr>
                      {COMP_COLUMNS.map((c) => (
                        <th key={c.key} className={`no-sort ${c.num ? 'num' : ''}`}>
                          <span className="th-label">{c.key === 'qty' ? sel.label : c.label}</span>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r) => (
                      <tr key={r.id} className="inv-item full" onClick={() => nav(`/inventory/${r.id}`)}>
                        <td className="mono">{r.itemCode}</td>
                        <td>
                          <span className="inv-desc" title={r.description}>{r.description}</span>
                          {r.detailedDescription && (
                            <span className="inv-desc-sub" title={r.detailedDescription}>{r.detailedDescription}</span>
                          )}
                          <span className="inv-desc-path" title={`${r.tradeL1} · ${r.tradeL2}`}>
                            {r.tradeL1.replace(/\s+Works$/, '')} · {r.tradeL2}
                          </span>
                        </td>
                        <td className="num tabular">{num(r[sel.field])}</td>
                        <td className="faint">{r.uom}</td>
                        <td className="num tabular">{peso(r.unitPrice, { decimals: 2 })}</td>
                        <td>Class {r.conditionClass}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
          </div>
        </div>
      )}
    </div>
  )
}
