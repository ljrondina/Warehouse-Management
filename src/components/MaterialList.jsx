import { useNavigate } from 'react-router-dom'
import { num, peso } from '../lib/format'
import Icon from '../lib/icons'

const STATUS_COLOR = {
  Healthy: '#2f7d5a',
  Low: '#a8770f',
  Overstocked: '#2b2c2b',
  'Out of Stock': '#ee3124',
}

// The ranked material list behind a clicked figure. It used to live in a full-screen
// sliding drawer (KpiListModal, deleted with this change) that covered the whole
// dashboard; the Overview cards now render these rows in a panel down their own
// right-hand side, so the figure you clicked stays on screen beside the rows it
// produced.
//
// `field` is the quantity column the list is ranked and labelled by; `emptyHint`
// lets each caller explain an empty result in its own terms.
//
// `renderRow` lets a caller with a differently-shaped row (Safekeeping's SOH lines
// carry no unit price, brand or stock status — the inventory-specific fields below
// would print blanks or a false ₱0.00) supply its own card body while still getting
// the shared `.wpc` visual language and the panel/empty-state plumbing around it.
export default function MaterialList({ rows, field, label, emptyHint, dense = false, renderRow }) {
  const nav = useNavigate()
  if (rows.length === 0) return <div className="empty">{emptyHint || 'No materials match the current filters.'}</div>
  return (
    <div className={`mat-list ${dense ? 'dense' : ''}`}>
      {renderRow
        ? rows.map(renderRow)
        : rows.map((r) => {
            const sc = STATUS_COLOR[r.stockStatus] || 'var(--border-strong)'
            return (
              <div key={r.id} className="wpc" style={{ borderLeftColor: sc }} onClick={() => nav(`/inventory/${r.id}`)}>
                <div className="wpc-top">
                  <span className="wpc-code">{r.itemCode}</span>
                  <span className="wpc-badge" style={{ background: `${sc}22`, color: sc }}>{r.stockStatus}</span>
                </div>
                <div className="wpc-desc">{r.description}</div>
                <div className="wpc-meta">{r.tradeL1} › {r.tradeL2}</div>
                <div className="wpc-row">
                  <span><small>{label}</small>{num(r[field])} {r.uom}</span>
                  <span><small>Brand</small>{r.brand || '—'}</span>
                  <span><small>Condition</small>Class {r.conditionClass}</span>
                  <span><small>Purchase Price</small>{peso(r.unitPrice, { decimals: 2 })}</span>
                </div>
              </div>
            )
          })}
    </div>
  )
}

// The right-hand panel on the Overview cards. Collapsed it is a standing invitation
// ("click a figure"); with a selection it is a titled, scrolling list. It is NOT
// conditionally rendered away when empty — the card's width would change as you
// clicked, which is exactly the reflow the fixed card sizing exists to prevent.
export function CardListPanel({ selection, rows, onClear, hint, renderRow, noun = 'material' }) {
  return (
    <aside className={`card-list-panel ${selection ? 'has-sel' : ''}`}>
      {selection ? (
        <>
          <div className="clp-head">
            <div className="clp-titles">
              <div className="clp-title" title={selection.label}>{selection.label}</div>
              <div className="clp-sub">{rows.length} {noun}{rows.length === 1 ? '' : 's'}</div>
            </div>
            <button className="clp-close" onClick={onClear} aria-label="Clear selection" title="Clear selection">
              <Icon name="close" size={16} />
            </button>
          </div>
          <div className="clp-body">
            <MaterialList rows={rows} field={selection.field} label={selection.label} dense renderRow={renderRow}
              emptyHint={`No ${noun}s in this selection.`} />
          </div>
        </>
      ) : (
        <div className="clp-idle">
          <Icon name="search" size={22} />
          <b>Nothing selected</b>
          <span>{hint}</span>
        </div>
      )}
    </aside>
  )
}
