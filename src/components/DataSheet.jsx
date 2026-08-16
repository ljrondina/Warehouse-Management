import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Segmented } from './ui'
import { num, fmtDate, compact } from '../lib/format'
import Icon from '../lib/icons'

// The Inventory Master List's table, generalised: fixed column widths, sortable sticky
// headers, N-level collapsible Section bands, a Full view that sorts globally, and
// pagination underneath. Extracted so the Safekeeping source tables and the Delivery
// Tracker are literally the same table rather than two lookalikes that drift apart.
//
// `columns`: { key, label, width, num, mono, strong, date, desc, blank, render, sub }
//   desc   — renders as a two-line cell (value + `sub(row)` beneath), the pattern the
//            masterlist uses to fold a secondary description out of its own column.
//   blank  — an empty value renders empty, not as an em-dash. For genuinely optional
//            text, where "—" would imply a missing required field.
//   render — full control over the cell body.
// `groupBy`: [{ key, label }] — omit for a table with no Section view at all.
// `aggKey`: numeric field summed onto each band; omit when the column is non-numeric
//           (the Delivery Tracker's Qty is free text like "TBC" or "207 * 7").
const MIN_ROWS_FOR_PAGING = 1
// Matches the Inventory Master List's own floor — narrow enough to shrink a column
// a lot, wide enough that a header label never disappears entirely.
const MIN_COL_W = 48

export default function DataSheet({
  columns, rows, groupBy, aggKey, aggLabel = 'units',
  defaultGrouping = 'full', pageSize = 60, note, filters, resetFilters, filtersOn,
  rowKey = (r, i) => r.id ?? i, scrollClass = 'sheet-scroll',
}) {
  const canGroup = Boolean(groupBy?.length)
  const [sort, setSort] = useState({ key: null, dir: 'asc' })
  const [page, setPage] = useState(0)
  const [collapsed, setCollapsed] = useState(() => new Set())
  const [grouping, setGrouping] = useState(canGroup ? defaultGrouping : 'full')
  // User-dragged column widths, keyed by column key — same mechanism as the Inventory
  // Master List's col-grip. Starts empty (every column at its authored default) and
  // only ever gains overrides for columns the user has actually resized.
  const [colW, setColW] = useState({})

  const cmp = useMemo(() => {
    if (!sort.key) return null
    const col = columns.find((c) => c.key === sort.key)
    const numeric = !!(col?.num || col?.date)
    return (a, b) => {
      const va = a[sort.key], vb = b[sort.key]
      if (va == null || va === '') return 1
      if (vb == null || vb === '') return -1
      const r = numeric ? (va > vb ? 1 : va < vb ? -1 : 0) : String(va).localeCompare(String(vb))
      return sort.dir === 'asc' ? r : -r
    }
  }, [sort, columns])

  // Sort applies WITHIN the deepest group only: a global sort would scatter each group's
  // rows and leave nothing coherent to collapse.
  const tree = useMemo(() => {
    if (!canGroup || grouping === 'full') return []
    const fields = groupBy.map((g) => g.key)
    const root = new Map()
    for (const r of rows) {
      let level = root
      let path = ''
      for (let d = 0; d < fields.length; d++) {
        const name = r[fields[d]] || '—'
        path = path ? `${path}|${name}` : name
        let node = level.get(name)
        if (!node) {
          node = { name, path, depth: d, count: 0, agg: 0, children: new Map(), items: [] }
          level.set(name, node)
        }
        node.count++
        if (aggKey) node.agg += Number(r[aggKey]) || 0
        if (d === fields.length - 1) node.items.push(r)
        level = node.children
      }
    }
    const sortLevel = (map) => {
      const list = [...map.values()].sort((a, b) => a.name.localeCompare(b.name))
      for (const n of list) {
        if (n.items.length) { if (cmp) n.items.sort(cmp) }
        else n.childList = sortLevel(n.children)
      }
      return list
    }
    return sortLevel(root)
  }, [rows, groupBy, canGroup, grouping, aggKey, cmp])

  const fullRows = useMemo(() => (cmp ? [...rows].sort(cmp) : rows), [rows, cmp])

  // Flatten to only the rows actually visible, honouring collapse state, so pagination
  // runs over what's on screen — a collapsed band genuinely frees page slots.
  const flat = useMemo(() => {
    if (!canGroup || grouping === 'full') return fullRows.map((r, i) => ({ kind: 'item', key: `i:${rowKey(r, i)}`, node: r }))
    const out = []
    // Every level gets its own band, INCLUDING the deepest one (which also holds the
    // leaf items) — `items.length` decides whether to recurse or list, not whether a
    // band is drawn at all.
    const walk = (list) => {
      for (const n of list) {
        out.push({ kind: 'band', key: `b:${n.path}`, node: n, open: !collapsed.has(n.path) })
        if (collapsed.has(n.path)) continue
        if (n.items.length) {
          for (const it of n.items) out.push({ kind: 'item', key: `i:${n.path}:${rowKey(it, 0)}`, node: it })
        } else walk(n.childList)
      }
    }
    walk(tree)
    return out
  }, [tree, collapsed, grouping, fullRows, canGroup, rowKey])

  const pageCount = Math.max(1, Math.ceil(flat.length / pageSize))
  const safePage = Math.min(page, pageCount - 1)
  const slice = flat.slice(safePage * pageSize, safePage * pageSize + pageSize)
  // Percentage widths (any string width) make the table FLUID by default: it is always
  // exactly as wide as its container, so every column stays visible with no scrolling
  // needed. The moment the user drags a grip, every column's CURRENT rendered width gets
  // frozen into pixels (see startResize) — that is what lets the table's total width
  // legitimately exceed the container and trigger the scroll container's horizontal
  // scrollbar, instead of table-layout:fixed silently re-squeezing everything back to
  // 100% because the remaining columns are still percentage-defined.
  const resized = Object.keys(colW).length > 0
  const fluid = columns.every((c) => typeof c.width === 'string')
  const widthOf = (c) => colW[c.key] ?? c.width
  const totalWidth = resized || !fluid
    ? columns.reduce((a, c) => a + (Number(widthOf(c)) || 0), 0)
    : '100%'
  useEffect(() => { setPage(0) }, [sort, collapsed, grouping, rows])

  // Column resizing — same mechanism as the Inventory Master List (pointer captured on
  // the grip so the drag keeps tracking past the 7px hit area; `col-resizing` on <body>
  // stops text highlighting mid-drag), plus a one-time freeze of every column's current
  // width the first time any grip is used, so the fluid percentage layout doesn't fight
  // the drag on every other column.
  const tableRef = useRef(null)
  const drag = useRef(null)
  const startResize = (e, key, th) => {
    e.preventDefault(); e.stopPropagation()
    setColW((w) => {
      if (Object.keys(w).length > 0) return w
      const ths = tableRef.current.querySelectorAll('thead th')
      const frozen = {}
      columns.forEach((c, i) => { frozen[c.key] = Math.round(ths[i].getBoundingClientRect().width) })
      return frozen
    })
    drag.current = { key, startX: e.clientX, startW: th.getBoundingClientRect().width }
    e.currentTarget.setPointerCapture(e.pointerId)
    document.body.classList.add('col-resizing')
  }
  const onResizeMove = useCallback((e) => {
    if (!drag.current) return
    const { key, startX, startW } = drag.current
    setColW((w) => ({ ...w, [key]: Math.max(MIN_COL_W, Math.round(startW + (e.clientX - startX))) }))
  }, [])
  const endResize = useCallback(() => {
    drag.current = null
    document.body.classList.remove('col-resizing')
  }, [])
  const resetColumns = () => setColW({})

  const allPaths = useMemo(() => {
    const out = []
    const walk = (list) => { for (const n of list) { out.push(n.path); if (!n.items.length) walk(n.childList) } }
    walk(tree)
    return out
  }, [tree])
  const anyOpen = allPaths.some((p) => !collapsed.has(p))

  const toggleSort = (key) => setSort((s) => ({ key, dir: s.key === key && s.dir === 'asc' ? 'desc' : 'asc' }))
  const toggleBand = (path) => setCollapsed((s) => { const n = new Set(s); n.has(path) ? n.delete(path) : n.add(path); return n })

  const cell = (r, c) => {
    if (c.render) return c.render(r)
    const v = r[c.key]
    if (c.date) return v ? fmtDate(v) : '—'
    if (c.num) return num(v)
    if (c.blank) return v || ''
    return v === '' || v == null ? '—' : v
  }

  return (
    <>
      <div className="sheet-filters">
        {filters}
        {canGroup && (
          <Segmented size="sm" value={grouping} onChange={setGrouping}
            options={[{ value: 'section', label: 'Section' }, { value: 'full', label: 'Full' }]} />
        )}
        {canGroup && (
          <button className="btn btn-sm" disabled={grouping !== 'section'}
            onClick={() => setCollapsed(anyOpen ? new Set(allPaths) : new Set())}
            title={grouping !== 'section' ? 'Only applies to Section view' : anyOpen ? 'Collapse all groups' : 'Expand all groups'}>
            <Icon name={anyOpen ? 'minus' : 'plus'} size={12} /> {anyOpen ? 'Collapse' : 'Expand'}
          </button>
        )}
        {resetFilters && (
          <button className="btn btn-sm" onClick={() => { resetFilters(); resetColumns() }}
            disabled={!filtersOn && !resized} title="Reset filters and column widths">
            Reset
          </button>
        )}
      </div>

      <div className={scrollClass}>
        <table ref={tableRef} className="data inv-table sheet-table"
          style={resized || !fluid ? { width: totalWidth, minWidth: '100%' } : { width: '100%' }}>
          <colgroup>{columns.map((c) => <col key={c.key} style={{ width: widthOf(c) }} />)}</colgroup>
          <thead>
            <tr>
              {columns.map((c) => (
                <th key={c.key} className={`sortable ${c.num ? 'num' : ''}`} onClick={() => toggleSort(c.key)} title={`Sort by ${c.label}`}>
                  <span className="th-label">{c.label}</span>
                  {sort.key === c.key && <span className="th-caret">{sort.dir === 'asc' ? '▲' : '▼'}</span>}
                  <span className="col-grip" onPointerDown={(e) => startResize(e, c.key, e.currentTarget.parentElement)}
                    onPointerMove={onResizeMove} onPointerUp={endResize} onClick={(e) => e.stopPropagation()} />
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {slice.map((r) => {
              if (r.kind === 'item') {
                const it = r.node
                return (
                  <tr key={r.key} className={`inv-item ${grouping}`} data-depth={canGroup && grouping === 'section' ? groupBy.length : 0}>
                    {columns.map((c) => {
                      if (c.desc) {
                        const sub = c.sub?.(it)
                        return (
                          <td key={c.key}>
                            <span className="inv-desc" title={it[c.key]}>{it[c.key] || '—'}</span>
                            {sub && <span className="inv-desc-sub" title={sub}>{sub}</span>}
                          </td>
                        )
                      }
                      // A column with a custom `render` has no plain value to fall back
                      // on for the hover tooltip, so it opts in explicitly via `tooltip`
                      // — that's how a badge/tag cell still reveals its full content
                      // once a narrow column truncates the visible text.
                      const title = c.tooltip ? c.tooltip(it)
                        : c.render || c.date || c.num ? undefined
                        : String(it[c.key] ?? '')
                      return (
                        <td key={c.key}
                          className={`${c.num ? 'num tabular' : ''} ${c.mono ? 'mono' : ''} ${c.strong ? 'strong' : ''}`}
                          title={title}>
                          {cell(it, c)}
                        </td>
                      )
                    })}
                  </tr>
                )
              }
              const n = r.node
              const lvl = Math.min(n.depth + 1, 3)
              return (
                <tr key={r.key} className={`inv-band lvl${lvl}`} onClick={() => toggleBand(n.path)}>
                  <td colSpan={columns.length}>
                    <div className="ib-inner">
                      <span className={`ib-caret ${r.open ? 'open' : ''}`}><Icon name="chevronDown" size={12} /></span>
                      <span className={lvl === 1 ? 'ib-trade' : 'ib-group'}>{n.name}</span>
                      <span className="ib-count">{n.count} line{n.count === 1 ? '' : 's'}</span>
                      {aggKey && <span className="ib-agg">{compact(n.agg)} {aggLabel}</span>}
                    </div>
                  </td>
                </tr>
              )
            })}
            {flat.length === 0 && (
              <tr><td colSpan={columns.length}><div className="empty">No rows match your filters.</div></td></tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="pagination">
        <span>
          Showing {flat.length === 0 ? 0 : safePage * pageSize + 1}–{Math.min((safePage + 1) * pageSize, flat.length)} of {num(flat.length)} rows
          {note && <span className="faint"> · {note}</span>}
        </span>
        {flat.length > pageSize * MIN_ROWS_FOR_PAGING && (
          <div className="wrap-gap">
            <button className="btn btn-sm" disabled={safePage === 0} onClick={() => setPage(safePage - 1)}>Prev</button>
            <span className="chip">{safePage + 1} / {pageCount}</span>
            <button className="btn btn-sm" disabled={safePage >= pageCount - 1} onClick={() => setPage(safePage + 1)}>Next</button>
          </div>
        )}
      </div>
    </>
  )
}
