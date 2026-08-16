import { lazy, memo, Suspense, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  KPIS, byTradeL1, byTradeL2, movementCombinedSeries, PERIODS,
  topQuantity, fastMoving, lowStock, highValue, nonMoving,
} from '../../data/insights'
import { Card, KpiCard, Segmented } from '../../components/ui'
import StockBattery from '../../components/StockBattery'
import { DistributionDonut, MovementComposed } from '../../components/charts'
import { num, peso, fmtDate } from '../../lib/format'
import { seriesFor } from '../../lib/colors'
import { useTheme } from '../../context/ThemeContext'
import Icon from '../../lib/icons'

const KpiListModal = lazy(() => import('../../components/KpiListModal'))

// `role` indexes the shared SERIES map, resolved per theme at render time. Holding a
// literal hex here instead would pin the whole dashboard to the light ramp — which
// is what made the dark-gray bars and deep-red icons disappear on the dark card.
const QTY_CARDS = [
  { key: 'total', role: 'total', field: 'totalQty', label: 'Total Inventory', icon: 'inventory', tip: 'Stock on hand across every material in the Central Warehouse — always equal to Available plus Reserved. Damaged units are flagged in place and counted here; incoming and outgoing are in transit and are not.' },
  { key: 'available', role: 'available', field: 'availableQty', label: 'Available', icon: 'box', tip: 'Stock that is free to issue right now — total on hand less the quantities reserved against project requests.' },
  { key: 'reserved', role: 'reserved', field: 'reservedQty', label: 'Reserved', icon: 'reserve', tip: 'Quantities already allocated to specific project requests and awaiting release.' },
  { key: 'incoming', role: 'incoming', field: 'incomingQty', label: 'Incoming', icon: 'incoming', tip: 'Materials received or returned from sites that are awaiting warehouse acceptance and approval.' },
  { key: 'outgoing', role: 'outgoing', field: 'outgoingQty', label: 'Outgoing', icon: 'outgoing', tip: 'Materials that have been released and are currently in transit to project sites.' },
  { key: 'damaged', role: 'damaged', field: 'damagedQty', label: 'Damaged', icon: 'alert', tip: 'Units flagged as damaged and pending disposal review. They sit inside the stock-on-hand total rather than alongside it.' },
]

// Chart/list controls. Each option carries a glyph so the toggles read as "what is
// being split" (layers = the broad trade, tag = the finer item group) and "what is
// being measured" (box = units on hand, receipt = pesos) at a glance, without the
// labels having to be any longer. metricOpts is shared by the Distribution card and
// the High Stock list — it is the same question in both places, so it gets the same
// two words and the same two glyphs.
const scopeOpts = [{ value: 'l1', label: 'Trade', icon: 'layers' }, { value: 'l2', label: 'Item Group', icon: 'tag' }]
const metricOpts = [{ value: 'qty', label: 'Quantity', icon: 'box' }, { value: 'value', label: 'Value', icon: 'receipt' }]

function rollup(data, n = 8) {
  if (data.length <= n) return data
  const top = data.slice(0, n)
  const agg = data.slice(n).reduce((a, b) => ({ qty: a.qty + b.qty, value: a.value + b.value, count: a.count + b.count, share: a.share + b.share, valueShare: a.valueShare + b.valueShare }), { qty: 0, value: 0, count: 0, share: 0, valueShare: 0 })
  return [...top, { name: 'Others', ...agg }]
}

// Bottom breathing room left below the expanded card, matching .content's own
// bottom padding so the card doesn't butt flush against the viewport edge.
const EXPAND_MARGIN = 24

// `main` drives the displayed headline value/unit; `barValue` (defaults to `main`)
// drives the bar width — the two can differ, e.g. Dead Stock shows a date as the
// headline but still sizes its bar by quantity. `raw: true` prints main(r) as-is
// (already-formatted text) instead of running it through num()/peso().
//
// Collapsed the card is a fixed 5-row window. Expanded, the window grows to fill
// whatever vertical space is left in the viewport below it — including the
// show-less bar — so the card always reaches the bottom of the screen rather than
// stopping at an arbitrary row count; the full ranked list scrolls inside that
// window. Collapsing always resets to the top-5 view (never reopens mid-scroll).
const InsightList = memo(function InsightList({ rows, main, unit, secondary, money, raw, barValue, tone }) {
  const nav = useNavigate()
  const [open, setOpen] = useState(false)
  const [expandedHeight, setExpandedHeight] = useState(null)
  const scrollRef = useRef(null)
  const moreRef = useRef(null)

  // Recomputed on open and on every resize while open — never while collapsed, so
  // resizing the window with everything closed does no extra work. useLayoutEffect
  // (not useEffect) so the real height is committed before the browser paints —
  // otherwise the CSS class's 700px default would flash for a frame first.
  useLayoutEffect(() => {
    if (!open) return
    const recalc = () => {
      const scrollEl = scrollRef.current
      const moreEl = moreRef.current
      if (!scrollEl || !moreEl) return
      const top = scrollEl.getBoundingClientRect().top
      const barH = moreEl.getBoundingClientRect().height
      const available = window.innerHeight - top - barH - EXPAND_MARGIN
      setExpandedHeight(Math.max(200, Math.round(available)))
    }
    recalc()
    window.addEventListener('resize', recalc)
    return () => window.removeEventListener('resize', recalc)
  }, [open])

  if (!rows.length) return <div className="empty">No materials match the current filters.</div>
  const bv = barValue || main
  const max = Math.max(...rows.map(bv), 1)
  const collapsible = rows.length > 5

  const close = () => {
    setOpen(false)
    if (scrollRef.current) scrollRef.current.scrollTop = 0
  }

  return (
    <>
      <div
        ref={scrollRef}
        className={`insight-scroll ${open ? 'open' : ''}`}
        style={open && expandedHeight ? { maxHeight: expandedHeight } : undefined}
      >
        <div className="insight-list">
          {rows.map((r, i) => {
            const display = main(r)
            return (
              <div className="insight-row" key={r.id} onClick={() => nav(`/inventory/${r.id}`)}>
                <div className={`rank ${i < 3 ? 'top' : ''}`}>{i + 1}</div>
                <div className="insight-main">
                  <div className="t" title={r.description}>{r.description}</div>
                  <div className="s" title={secondary(r)}>{secondary(r)}</div>
                  <div className="bar"><span style={{ width: `${(bv(r) / max) * 100}%`, background: tone }} /></div>
                </div>
                <div className="right insight-num">
                  <div className="v tabular">{raw ? display : money ? peso(display) : num(display)}</div>
                  {unit && <div className="u faint">{unit(r)}</div>}
                </div>
              </div>
            )
          })}
        </div>
      </div>
      {collapsible && (
        <button ref={moreRef} className={`insight-more ${open ? 'open' : ''}`} onClick={() => (open ? close() : setOpen(true))}
          type="button" aria-expanded={open}>
          <span>{open ? 'Show less' : `Show all ${num(rows.length)}`}</span>
          <Icon name="chevronDown" size={15} />
        </button>
      )}
    </>
  )
})

// Insight lists render their COMPLETE ranked list; the card shows 5 rows collapsed
// and 10 when expanded, with the remainder reachable by scrolling.
//
// Those lists ignore the filter, so they are built ONCE at module scope and the
// component is memoised. Without this, every filter keystroke would re-render a few
// thousand unchanged rows. The accessors live out here for the same reason —
// inline arrows would be new identities on each render and defeat the memo.
const ALL = Number.MAX_SAFE_INTEGER

const tradeSub = (r) => `${r.itemCode} · ${r.tradeL1} · ${r.tradeL2}`
const byUom = (r) => r.uom
// High Value and Dead Stock show the stocked quantity beneath their headline figure
// (a unit price and a date respectively), which neither conveys on its own.
const qtyWithUom = (r) => `${num(r.totalQty)} ${r.uom}`
const lblIssues = () => 'issues/mo'
const getTotalQty = (r) => r.totalQty
const getUnitPrice = (r) => r.unitPrice
const getValue = (r) => r.inventoryValue
const getAvailable = (r) => r.availableQty
const getIssueFreq = (r) => r.issueFrequency
const getLastMoved = (r) => fmtDate(r.lastMovement)

const INSIGHT_ROWS = {
  high: topQuantity(ALL),
  value: highValue(ALL),
  low: lowStock(ALL),
  fast: fastMoving(ALL),
  dead: nonMoving(ALL),
}

// `pool` and `qtyUnit` come from the dashboard shell, which owns the filter bar that
// is shared across all three dashboard tabs.
export default function InventoryTab({ pool, qtyUnit }) {
  const { theme } = useTheme()
  // Resolved per theme so every accent on this page — KPI stripes, card icons and
  // insight bars — stays legible on whichever card background is in play.
  const S = seriesFor(theme)
  const [period, setPeriod] = useState('month')
  const [donutScope, setDonutScope] = useState('l1')
  const [donutMetric, setDonutMetric] = useState('qty')
  const [highStockMetric, setHighStockMetric] = useState('qty')
  const [chartsWide, setChartsWide] = useState(false)
  const [kpiModal, setKpiModal] = useState(null)

  const k = useMemo(() => KPIS(pool), [pool])
  const movementData = useMemo(() => movementCombinedSeries(pool, period), [pool, period])
  const periodOpts = PERIODS.map((p) => ({ value: p.key, label: p.label }))

  const donutData = rollup(donutScope === 'l1' ? byTradeL1(pool) : byTradeL2(pool, 'all'))

  const valueCards = [
    { label: 'Total Inventory Value', value: peso(k.value), icon: 'reports', color: S.total, tip: 'Total purchase-cost value of all inventory currently held in the warehouse.' },
    { label: 'Average Value / SKU', value: peso(k.skuCount ? k.value / k.skuCount : 0), icon: 'analytics', color: S.neutral, tip: 'Average purchase-cost value per stock-keeping unit across the current selection.' },
    { label: 'Reserved Value', value: peso(k.reservedValue), icon: 'reserve', color: S.value, tip: 'Purchase-cost value of stock currently reserved for active project allocations.' },
  ]

  return (
    <>
      {/* Row A — KPI cards beside the composition gauge. Both react to the filter. */}
      <div className="dash-top">
        {/* One 3x3 grid rather than two stacked grids: equal-height rows keep all nine
            cards uniform and let the block stretch to match the composition card. */}
        <div className="dash-kpis" data-tour="kpis">
          {QTY_CARDS.map((c) => (
            <KpiCard key={c.key} label={c.label} value={num(k[c.key])} unit={qtyUnit} icon={c.icon} color={S[c.role]} tooltip={c.tip}
              onClick={() => setKpiModal({ field: c.field, label: c.label })} />
          ))}
          {valueCards.map((c) => <KpiCard key={c.label} {...c} tooltip={c.tip} />)}
        </div>
        <Card title="Inventory Composition" icon="box" className="composition-card">
          <StockBattery available={k.available} reserved={k.reserved} incoming={k.incoming} outgoing={k.outgoing} unit={qtyUnit} />
        </Card>
      </div>

      {/* Row B — movement over time beside the trade split. Both react to the filter.
          Expanding Movement History drops the two cards into a single column so each
          spans the full page width; both then move their legend to the side. */}
      <div className={`grid mt ${chartsWide ? 'grid-1' : 'grid-2'}`} data-tour="charts">
        <Card title="Movement History" icon="trend" className="movement-card"
          right={
            <div className="chart-controls">
              <Segmented size="sm" options={periodOpts} value={period} onChange={setPeriod} />
              <button className={`icon-btn chart-expand ${chartsWide ? 'on' : ''}`} onClick={() => setChartsWide((w) => !w)}
                type="button" aria-expanded={chartsWide}
                title={chartsWide ? 'Collapse to half width' : 'Expand to full width'}>
                <Icon name="chevronRight" size={16} />
              </button>
            </div>
          }>
          <MovementComposed data={movementData} wide={chartsWide} />
        </Card>

        <Card title="Inventory Distribution" icon="reports"
          right={
            <div className="chart-controls">
              <Segmented size="sm" options={scopeOpts} value={donutScope} onChange={setDonutScope} />
              <Segmented size="sm" options={metricOpts} value={donutMetric} onChange={setDonutMetric} />
            </div>
          }>
          <DistributionDonut data={donutData} metric={donutMetric} wide={chartsWide} />
        </Card>
      </div>

      {/* Insight cards — deliberately built from the full inventory, NOT `pool`, so
          they stay a stable top-10 reference while the filter drives everything else. */}
      <div className="grid grid-2 insight-grid mt" data-tour="insights">
        <Card title="High Stock Items" icon="box" iconColor={S.total}
          right={<Segmented size="sm" options={metricOpts} value={highStockMetric} onChange={setHighStockMetric} />}>
          {/* The toggle swaps ONLY the headline figure. The ranking stays by quantity
              (INSIGHT_ROWS.high is topQuantity) and `barValue` pins the bars to
              quantity too — otherwise the bars would stop agreeing with the rank
              order they sit in and the list would read as mis-sorted. In value mode
              the line beneath carries the quantity that the peso figure hides. */}
          <InsightList rows={INSIGHT_ROWS.high}
            main={highStockMetric === 'value' ? getValue : getTotalQty}
            money={highStockMetric === 'value'}
            unit={highStockMetric === 'value' ? qtyWithUom : byUom}
            barValue={getTotalQty} secondary={tradeSub} tone={S.total} />
        </Card>
        <Card title="High Value Items" icon="reports" iconColor={S.value}>
          {/* Headline is the UNIT price — the per-item worth, not the line total — and
              the bars are sized by it. The line beneath carries the stocked quantity,
              which a unit price says nothing about. */}
          <InsightList rows={INSIGHT_ROWS.value} main={getUnitPrice} unit={qtyWithUom} secondary={tradeSub} money tone={S.value} />
        </Card>
      </div>

      <div className="grid grid-2 insight-grid mt-sm">
        <Card title="Low Stock Items" icon="alert" iconColor={S.damaged} right={<span className="chip">{INSIGHT_ROWS.low.length} below min</span>}>
          <InsightList rows={INSIGHT_ROWS.low} main={getAvailable} unit={byUom} secondary={tradeSub} tone={S.damaged} />
        </Card>
        <Card title="Fast Moving Items" icon="trend" iconColor={S.available}>
          <InsightList rows={INSIGHT_ROWS.fast} main={getIssueFreq} unit={lblIssues} secondary={tradeSub} tone={S.available} />
        </Card>
      </div>

      <div className="grid grid-1 insight-grid mt-sm">
        <Card title="Dead Stock Items" icon="clock" iconColor={S.reserved}>
          {/* Headline is the last-moved date, so the bars size by quantity instead and
              the unit line carries that quantity. Secondary matches the other cards. */}
          <InsightList rows={INSIGHT_ROWS.dead} raw main={getLastMoved} barValue={getTotalQty}
            unit={qtyWithUom} secondary={tradeSub} tone={S.reserved} />
        </Card>
      </div>

      <Suspense fallback={null}>
        {kpiModal && <KpiListModal field={kpiModal.field} label={kpiModal.label} pool={pool} onClose={() => setKpiModal(null)} />}
      </Suspense>
    </>
  )
}
