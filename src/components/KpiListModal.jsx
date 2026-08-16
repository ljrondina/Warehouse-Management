import { useNavigate } from 'react-router-dom'
import { items } from '../data/insights'
import { num, peso } from '../lib/format'
import Icon from '../lib/icons'

const STATUS_COLOR = {
  Healthy: '#2f7d5a',
  Low: '#a8770f',
  Overstocked: '#2b2c2b',
  'Out of Stock': '#ee3124',
}

// Expanded material list for a clicked KPI, styled after the reference dashboard's
// work-package status drawer: a right-side sliding panel with vertical scroll
// (no pagination) and colored status cards instead of a wide data table.
export default function KpiListModal({ field, label, pool = items, onClose }) {
  const nav = useNavigate()
  const rows = pool.filter((i) => (i[field] || 0) > 0).sort((a, b) => b[field] - a[field])

  return (
    <div className="drawer-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="drawer-panel">
        <div className="drawer-head">
          <div>
            <div className="drawer-title">{label}</div>
            <div className="drawer-sub">{rows.length} material{rows.length === 1 ? '' : 's'} · click a card for its full profile</div>
          </div>
          <button className="drawer-close" onClick={onClose} aria-label="Close">
            <Icon name="close" size={20} />
          </button>
        </div>

        <div className="drawer-body">
          {rows.length === 0 && <div className="empty">No materials match the current filters.</div>}
          {rows.map((r) => {
            const sc = STATUS_COLOR[r.stockStatus] || 'var(--border-strong)'
            return (
              <div key={r.id} className="wpc" style={{ borderLeftColor: sc }} onClick={() => { onClose(); nav(`/inventory/${r.id}`) }}>
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
      </div>
    </div>
  )
}
