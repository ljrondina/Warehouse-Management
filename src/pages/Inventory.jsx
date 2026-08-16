import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { items, distinct } from '../data/insights'
import Select from '../components/Select'
import { Segmented } from '../components/ui'
const AddMaterialModal = lazy(() => import('../components/AddMaterialModal'))
import { useAuth } from '../context/AuthContext'
import { can } from '../data/roles'
import { num, peso, compact } from '../lib/format'
import Icon from '../lib/icons'

// Every column is sortable from its header — the old sort dropdown is gone. Widths
// are the defaults the user can then drag; they are sized so the header label and a
// realistic value both fit without clipping. Description is the only flexible one:
// it absorbs whatever is left and ellipsises, with the full text on hover.
const COLUMNS = [
  { key: 'itemCode', label: 'Item Code', width: 92 },
  { key: 'description', label: 'Material Description', width: null, flex: true },
  { key: 'uom', label: 'UOM', width: 56 },
  // Widest fixed column: it has to hold both the longest header label and an
  // eight-figure peso amount without clipping either.
  { key: 'inventoryValue', label: 'Inventory Value', width: 132, num: true, money: true },
  { key: 'totalQty', label: 'Total', width: 78, num: true },
  { key: 'reservedQty', label: 'Reserved', width: 84, num: true },
  { key: 'availableQty', label: 'Available', width: 88, num: true },
  { key: 'incomingQty', label: 'Incoming', width: 86, num: true },
  { key: 'outgoingQty', label: 'Outgoing', width: 86, num: true },
  { key: 'damagedQty', label: 'Damaged', width: 86, num: true },
]

const MIN_COL_W = 48
const PAGE_SIZE = 60

export default function Inventory() {
  const nav = useNavigate()
  const { user } = useAuth()
  const canAdd = can(user.role, 'createMovement') || user.role === 'admin'
  const [showAdd, setShowAdd] = useState(false)
  const [search, setSearch] = useState('')
  const [tradeL1, setTradeL1] = useState('')
  const [tradeL2, setTradeL2] = useState('')
  const [matType, setMatType] = useState('')
  const [brand, setBrand] = useState('')
  const [sort, setSort] = useState({ key: 'inventoryValue', dir: 'desc' })
  const [page, setPage] = useState(0)
  const [collapsed, setCollapsed] = useState(() => new Set())
  const [colW, setColW] = useState({})
  // 'section' = Excel-style trade/item-group bands (sort applies within a group).
  // 'full'    = flat list, trade/item group moved onto each row (sort applies globally).
  const [grouping, setGrouping] = useState('section')

  const l1List = useMemo(() => distinct('tradeL1'), [])
  const l2List = useMemo(
    () => [...new Set(items.filter((i) => !tradeL1 || i.tradeL1 === tradeL1).map((i) => i.tradeL2))].sort(),
    [tradeL1]
  )
  const matTypes = useMemo(() => distinct('materialType'), [])
  const brands = useMemo(() => distinct('brand'), [])

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase()
    return items.filter((it) => {
      if (tradeL1 && it.tradeL1 !== tradeL1) return false
      if (tradeL2 && it.tradeL2 !== tradeL2) return false
      if (matType && it.materialType !== matType) return false
      if (brand && it.brand !== brand) return false
      if (q && !(`${it.itemCode} ${it.description} ${it.detailedDescription} ${it.brand}`.toLowerCase().includes(q))) return false
      return true
    })
  }, [search, tradeL1, tradeL2, matType, brand])

  // Build the two-level tree once per filter/sort change. Sorting reorders items
  // WITHIN an item group only — a global sort would split each group into scattered
  // fragments and there would be nothing left to collapse.
  const tree = useMemo(() => {
    const col = COLUMNS.find((c) => c.key === sort.key)
    const numeric = !!col?.num
    const cmp = (a, b) => {
      const va = a[sort.key], vb = b[sort.key]
      const r = numeric ? va - vb : String(va).localeCompare(String(vb))
      return sort.dir === 'asc' ? r : -r
    }
    const byTrade = new Map()
    for (const r of rows) {
      let t = byTrade.get(r.tradeL1)
      if (!t) { t = { name: r.tradeL1, groups: new Map(), count: 0, qty: 0, value: 0 }; byTrade.set(r.tradeL1, t) }
      let g = t.groups.get(r.tradeL2)
      if (!g) { g = { name: r.tradeL2, items: [], count: 0, qty: 0, value: 0 }; t.groups.set(r.tradeL2, g) }
      g.items.push(r)
      g.count++; g.qty += r.totalQty; g.value += r.inventoryValue
      t.count++; t.qty += r.totalQty; t.value += r.inventoryValue
    }
    const out = [...byTrade.values()].sort((a, b) => a.name.localeCompare(b.name))
    for (const t of out) {
      t.groupList = [...t.groups.values()].sort((a, b) => a.name.localeCompare(b.name))
      for (const g of t.groupList) g.items.sort(cmp)
    }
    return out
  }, [rows, sort])

  // FULL view: no section rows at all, so the sort applies across the entire filtered
  // set rather than only within a group. Each row carries its trade/item group on a
  // third line instead, which is the information the removed bands were conveying.
  const fullRows = useMemo(() => {
    if (grouping !== 'full') return []
    const col = COLUMNS.find((c) => c.key === sort.key)
    const numeric = !!col?.num
    return [...rows].sort((a, b) => {
      const va = a[sort.key], vb = b[sort.key]
      const r = numeric ? va - vb : String(va).localeCompare(String(vb))
      return sort.dir === 'asc' ? r : -r
    })
  }, [rows, sort, grouping])

  // Flatten the tree into the rows that are actually visible, honouring collapse
  // state. Pagination then runs over THIS list, so a collapsed trade genuinely frees
  // up page slots rather than leaving a gap.
  const flat = useMemo(() => {
    if (grouping === 'full') return fullRows.map((it) => ({ kind: 'item', key: `i:${it.id}`, node: it }))
    const out = []
    for (const t of tree) {
      const tKey = `t:${t.name}`
      out.push({ kind: 'trade', key: tKey, node: t, open: !collapsed.has(tKey) })
      if (collapsed.has(tKey)) continue
      for (const g of t.groupList) {
        const gKey = `g:${t.name}|${g.name}`
        out.push({ kind: 'group', key: gKey, node: g, open: !collapsed.has(gKey) })
        if (collapsed.has(gKey)) continue
        for (const it of g.items) out.push({ kind: 'item', key: `i:${it.id}`, node: it })
      }
    }
    return out
  }, [tree, collapsed, grouping, fullRows])

  const pageCount = Math.max(1, Math.ceil(flat.length / PAGE_SIZE))
  const safePage = Math.min(page, pageCount - 1)
  const view = flat.slice(safePage * PAGE_SIZE, safePage * PAGE_SIZE + PAGE_SIZE)
  useEffect(() => { setPage(0) }, [search, tradeL1, tradeL2, matType, brand, sort, collapsed, grouping])

  const toggle = (key) => setCollapsed((s) => {
    const n = new Set(s)
    if (n.has(key)) n.delete(key); else n.add(key)
    return n
  })
  const allKeys = useMemo(() => {
    const k = []
    for (const t of tree) { k.push(`t:${t.name}`); for (const g of t.groupList) k.push(`g:${t.name}|${g.name}`) }
    return k
  }, [tree])
  const anyOpen = allKeys.some((k) => !collapsed.has(k))

  const onSort = (key) => setSort((s) => ({ key, dir: s.key === key && s.dir === 'desc' ? 'asc' : 'desc' }))

  // Column resizing. The pointer is captured on the handle so the drag keeps
  // tracking even when it leaves the 5px hit area, and `select-none` on <body>
  // stops the table text highlighting mid-drag.
  const drag = useRef(null)
  const startResize = (e, key, th) => {
    e.preventDefault(); e.stopPropagation()
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

  const reset = () => { setSearch(''); setTradeL1(''); setTradeL2(''); setMatType(''); setBrand('') }
  const filtersOn = search || tradeL1 || tradeL2 || matType || brand
  const from = flat.length ? safePage * PAGE_SIZE + 1 : 0
  const to = Math.min((safePage + 1) * PAGE_SIZE, flat.length)
  const widthOf = (c) => colW[c.key] ?? (c.flex ? undefined : c.width)

  return (
    <div className="page-fit">
      <div className="spread inv-head">
        <div>
          <div className="section-note">{num(rows.length)} of {num(items.length)} materials · Central Warehouse Taytay</div>
        </div>
        <button className="btn btn-primary" onClick={() => canAdd && setShowAdd(true)} disabled={!canAdd}
          title={canAdd ? 'Add a new material' : 'Restricted to Warehouse & Administrator roles'}>
          <Icon name={canAdd ? 'plus' : 'settings'} size={15} /> Add Material {!canAdd && '🔒'}
        </button>
      </div>

      {showAdd && (
        <Suspense fallback={null}>
          <AddMaterialModal onClose={() => setShowAdd(false)} />
        </Suspense>
      )}

      {/* A plain .card rather than <Card>: that component wraps children in an extra
          div, which would sit between .inv-card and .inv-scroll and break the flex
          chain that lets the table region shrink and scroll on its own. */}
      <div className="card inv-card">
        {/* Grid, not flex-wrap: fractional tracks let every control stretch to fill
            the row and shrink together, so narrowing the window resizes the controls
            instead of spilling one onto a second line. */}
        <div className="inv-filters">
          <div className="field lookup inv-search">
            <div className="lookup-box">
              <Icon name="search" size={14} className="lookup-ico" />
              <input className="input lookup-input" placeholder="Search item code, description or brand…"
                value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
          </div>
          <Select value={tradeL1} options={l1List} placeholder="All Trades" size="sm"
            onChange={(v) => { setTradeL1(v); setTradeL2('') }} />
          <Select value={tradeL2} options={l2List} placeholder="All Item Groups" size="sm" onChange={setTradeL2} />
          <Select value={matType} options={matTypes} placeholder="All Types" size="sm" onChange={setMatType} align="right" />
          <Select value={brand} options={brands} placeholder="All Brands" size="sm" onChange={setBrand} align="right" />
          <Segmented size="sm" value={grouping} onChange={setGrouping}
            options={[{ value: 'section', label: 'Section' }, { value: 'full', label: 'Full' }]} />
          {/* Collapse/Expand only means something while the section bands exist —
              disabled rather than removed in Full view, so the control row doesn't
              reflow width every time the view toggles. */}
          <button className="btn btn-sm inv-collapse" disabled={grouping !== 'section'}
            onClick={() => setCollapsed(anyOpen ? new Set(allKeys) : new Set())}
            title={grouping !== 'section' ? 'Only applies to Section view' : anyOpen ? 'Collapse all groups' : 'Expand all groups'}>
            <Icon name={anyOpen ? 'minus' : 'plus'} size={12} /> {anyOpen ? 'Collapse' : 'Expand'}
          </button>
          <button className="btn btn-sm" onClick={reset} disabled={!filtersOn}>Reset</button>
        </div>

        <div className="inv-scroll">
          <table className="data inv-table">
            <colgroup>
              {COLUMNS.map((c) => <col key={c.key} style={{ width: widthOf(c) }} />)}
            </colgroup>
            <thead>
              <tr>
                {COLUMNS.map((c) => (
                  <th key={c.key} className={c.num ? 'num sortable' : 'sortable'} onClick={() => onSort(c.key)}
                    title={`Sort by ${c.label}`}>
                    <span className="th-label">{c.label}</span>
                    {sort.key === c.key && <span className="th-caret">{sort.dir === 'asc' ? '▲' : '▼'}</span>}
                    <span className="col-grip" onPointerDown={(e) => startResize(e, c.key, e.currentTarget.parentElement)}
                      onPointerMove={onResizeMove} onPointerUp={endResize} onClick={(e) => e.stopPropagation()} />
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {view.map((r) => {
                if (r.kind === 'item') {
                  const it = r.node
                  return (
                    <tr key={r.key} className={`inv-item ${grouping}`} onClick={() => nav(`/inventory/${it.id}`)}>
                      <td className="mono">{it.itemCode}</td>
                      <td>
                        <span className="inv-desc" title={it.description}>{it.description}</span>
                        {it.detailedDescription && (
                          <span className="inv-desc-sub" title={it.detailedDescription}>{it.detailedDescription}</span>
                        )}
                        {/* Full view has no section bands, so the trade path each row
                            belongs to moves onto the row itself. */}
                        {grouping === 'full' && (
                          <span className="inv-desc-path" title={`${it.tradeL1} · ${it.tradeL2}`}>
                            {it.tradeL1.replace(/\s+Works$/, '')} · {it.tradeL2}
                          </span>
                        )}
                      </td>
                      <td className="faint">{it.uom}</td>
                      <td className="num tabular">{peso(it.inventoryValue)}</td>
                      {COLUMNS.slice(4).map((c) => (
                        <td key={c.key} className={`num tabular ${it[c.key] ? '' : 'zero'}`}>{num(it[c.key])}</td>
                      ))}
                    </tr>
                  )
                }
                const n = r.node
                const lvl = r.kind === 'trade' ? 1 : 2
                return (
                  <tr key={r.key} className={`inv-band lvl${lvl}`} onClick={() => toggle(r.key)}>
                    <td colSpan={COLUMNS.length}>
                      <div className="ib-inner">
                        <span className={`ib-caret ${r.open ? 'open' : ''}`}><Icon name="chevronDown" size={12} /></span>
                        <span className={lvl === 1 ? 'ib-trade' : 'ib-group'}>{n.name}</span>
                        <span className="ib-count">{n.count} item{n.count === 1 ? '' : 's'}</span>
                        <span className="ib-agg">{compact(n.qty)} units · ₱{compact(n.value)}</span>
                      </div>
                    </td>
                  </tr>
                )
              })}
              {flat.length === 0 && (
                <tr><td colSpan={COLUMNS.length}><div className="empty">No materials match your filters.</div></td></tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="inv-foot">
          <span className="faint">Rows {num(from)}–{num(to)} of {num(flat.length)}</span>
          <div className="wrap-gap">
            <button className="btn btn-sm" disabled={safePage === 0} onClick={() => setPage(safePage - 1)}>Prev</button>
            <span className="chip">{safePage + 1} / {pageCount}</span>
            <button className="btn btn-sm" disabled={safePage >= pageCount - 1} onClick={() => setPage(safePage + 1)}>Next</button>
          </div>
        </div>
      </div>
    </div>
  )
}
