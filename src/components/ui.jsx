import { useState, useMemo } from 'react'
import Icon from '../lib/icons'

/* ---------- Badge ---------- */
const STATUS_TONE = {
  Healthy: 'ok', Completed: 'ok', Approved: 'ok', Released: 'ok', Delivered: 'ok', Full: 'ok',
  Low: 'warn', 'For Release': 'warn', Submitted: 'info', Reserved: 'info', Draft: 'neutral',
  'Out of Stock': 'danger', Overstocked: 'warn', 'Pending Approval': 'warn', Pending: 'warn',
  Ordered: 'info', Active: 'ok', Inactive: 'neutral',
}
// `noDot` drops the leading dot for callers that already supply their own glyph — two
// markers on one badge just competes for the space the label needs.
export function Badge({ children, tone, noDot }) {
  const t = tone || STATUS_TONE[children] || 'neutral'
  return (
    <span className={`badge badge-${t}`}>
      {!noDot && <span className="dot" />}
      {children}
    </span>
  )
}

/* ---------- KPI card ----------
   `tooltip` shows a comprehensive one-sentence description on hover (replaces the
   old static unit sublabel). `icon` shows a recognizable glyph. */
export function KpiCard({ label, value, unit, trend, color, tooltip, icon, onClick }) {
  const up = (trend ?? 0) >= 0
  return (
    <div
      className={`kpi ${tooltip ? 'has-tip' : ''} ${onClick ? 'clickable' : ''}`}
      style={{ '--kpi-color': color }}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
    >
      <div className="kpi-top">
        <div className="kpi-label">{label}</div>
        {icon && <span className="kpi-icon" style={{ color }}><Icon name={icon} size={18} /></span>}
      </div>
      <div className="kpi-value tabular">{value}</div>
      {(unit || trend !== undefined) && (
        <div className="spread">
          <span className="kpi-unit">{unit}</span>
          {trend !== undefined && (
            <span className={`kpi-trend ${up ? 'trend-up' : 'trend-down'}`}>
              <Icon name={up ? 'arrowUp' : 'arrowDown'} size={14} />
              {Math.abs(trend)}%
            </span>
          )}
        </div>
      )}
      {onClick && <span className="kpi-expand" title="View materials">⤢</span>}
      {tooltip && <div className="kpi-tip">{tooltip}</div>}
    </div>
  )
}

/* ---------- Segmented toggle ----------
   An option may carry an `icon`, which is drawn ahead of its label. It inherits
   currentColor so the glyph tracks the button's own idle/hover/active colour
   instead of needing a second set of states of its own. */
export function Segmented({ options, value, onChange, size }) {
  return (
    <div className={`segmented ${size === 'sm' ? 'seg-sm' : ''}`}>
      {options.map((o) => (
        <button key={o.value} className={value === o.value ? 'active' : ''} onClick={() => onChange(o.value)} type="button">
          {o.icon && <Icon name={o.icon} size={size === 'sm' ? 13 : 14} />}
          {o.label}
        </button>
      ))}
    </div>
  )
}

/* ---------- Toggle (two-state sliding switch) ----------
   For binary choices only — Quantity/Value, Trade/Item Group. Segmented still
   handles three-or-more (the period picker), where a sliding thumb stops being
   readable.

   The two options share ONE grid track each rather than sizing to their text, so
   the thumb is always exactly half the track and lands flush on either side. Sizing
   the columns to the labels would make the thumb width change as it slid, which
   reads as the control resizing rather than switching. The whole thing is
   `flex-shrink: 0` in CSS: it must never wrap or compress out of a card head. */
export function Toggle({ options, value, onChange, size, className = '' }) {
  const idx = Math.max(0, options.findIndex((o) => o.value === value))
  return (
    <div className={`toggle ${size === 'sm' ? 'toggle-sm' : ''} ${className}`} role="group">
      <span className="toggle-thumb" style={{ transform: `translateX(${idx * 100}%)` }} aria-hidden="true" />
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          className={value === o.value ? 'active' : ''}
          aria-pressed={value === o.value}
          onClick={() => onChange(o.value)}
          title={o.label}
        >
          {o.icon && <Icon name={o.icon} size={size === 'sm' ? 12 : 13} />}
          <span className="toggle-lbl">{o.label}</span>
        </button>
      ))}
    </div>
  )
}

/* ---------- Card ---------- */
// Unrecognised props land on the root element, which is how callers attach
// `data-tour` anchors (the guided tour finds its targets by that attribute) without
// needing a wrapper div that would break the surrounding grid's row sizing.
export function Card({ title, sub, right, icon, iconColor, children, pad = true, className = '', ...rest }) {
  return (
    <div className={`card ${className}`} {...rest}>
      {(title || right) && (
        <div className="card-head">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
            {icon && <span className="card-icon" style={{ color: iconColor || 'var(--brand-red)' }}><Icon name={icon} size={18} /></span>}
            <div style={{ minWidth: 0 }}>
              {title && <div className="card-title">{title}</div>}
              {sub && <div className="card-sub">{sub}</div>}
            </div>
          </div>
          {right}
        </div>
      )}
      <div className={pad ? 'card-pad' : ''}>{children}</div>
    </div>
  )
}

/* ---------- Section header ---------- */
export function SectionHeader({ priority, title, note, icon }) {
  return (
    <div className="spread mt" style={{ alignItems: 'flex-end', marginBottom: 12 }}>
      <div>
        <div className="section-title">
          {icon && <Icon name={icon} size={22} />}
          {title}
        </div>
        {note && <div className="section-note">{note}</div>}
      </div>
      {priority && <span className="priority-tag">{priority}</span>}
    </div>
  )
}

/* ---------- DataTable (sortable + paginated) ---------- */
export function DataTable({ columns, rows, onRowClick, pageSize = 12, initialSort }) {
  const [sort, setSort] = useState(initialSort || { key: null, dir: 'asc' })
  const [page, setPage] = useState(0)

  const sorted = useMemo(() => {
    if (!sort.key) return rows
    const col = columns.find((c) => c.key === sort.key)
    const acc = col?.sortValue || ((r) => r[sort.key])
    return [...rows].sort((a, b) => {
      const va = acc(a), vb = acc(b)
      if (va == null) return 1
      if (vb == null) return -1
      const cmp = typeof va === 'number' ? va - vb : String(va).localeCompare(String(vb))
      return sort.dir === 'asc' ? cmp : -cmp
    })
  }, [rows, sort, columns])

  const pageCount = Math.ceil(sorted.length / pageSize) || 1
  const view = sorted.slice(page * pageSize, page * pageSize + pageSize)
  const safePage = Math.min(page, pageCount - 1)

  const toggleSort = (key) =>
    setSort((s) => ({ key, dir: s.key === key && s.dir === 'asc' ? 'desc' : 'asc' }))

  return (
    <div>
      <div className="table-wrap">
        <table className="data">
          <thead>
            <tr>
              {columns.map((c) => (
                <th
                  key={c.key}
                  className={`${c.sortable === false ? 'no-sort' : ''} ${c.num ? 'num' : ''}`}
                  onClick={() => c.sortable !== false && toggleSort(c.key)}
                  style={c.width ? { width: c.width } : undefined}
                >
                  {c.label}
                  {sort.key === c.key ? (sort.dir === 'asc' ? ' ▲' : ' ▼') : ''}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {view.map((r, i) => (
              <tr key={r.id ?? i} onClick={() => onRowClick?.(r)}>
                {columns.map((c) => (
                  <td key={c.key} className={c.num ? 'num tabular' : ''}>
                    {c.render ? c.render(r) : r[c.key]}
                  </td>
                ))}
              </tr>
            ))}
            {view.length === 0 && (
              <tr>
                <td colSpan={columns.length}>
                  <div className="empty">No records match your filters.</div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      {sorted.length > pageSize && (
        <div className="pagination">
          <span>
            Showing {safePage * pageSize + 1}–{Math.min((safePage + 1) * pageSize, sorted.length)} of{' '}
            {sorted.length}
          </span>
          <div className="wrap-gap">
            <button className="btn btn-sm" disabled={safePage === 0} onClick={() => setPage(safePage - 1)}>
              Prev
            </button>
            <span className="chip">
              {safePage + 1} / {pageCount}
            </span>
            <button
              className="btn btn-sm"
              disabled={safePage >= pageCount - 1}
              onClick={() => setPage(safePage + 1)}
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

/* ---------- Modal ---------- */
export function Modal({ title, onClose, children, footer, large, xl }) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className={`modal ${xl ? 'modal-xl' : large ? 'modal-lg' : ''}`} onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <div className="card-title">{title}</div>
          <button className="icon-btn" onClick={onClose} aria-label="Close">
            <Icon name="close" size={18} />
          </button>
        </div>
        <div className="modal-body">{children}</div>
        {footer && <div className="modal-foot">{footer}</div>}
      </div>
    </div>
  )
}
