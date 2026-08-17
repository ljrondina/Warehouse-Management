import { memo, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import {
  KPIS, byTradeL1, byTradeL2, movementCombinedSeries, PERIODS,
  topQuantity, fastMoving, lowStock, highValue, nonMoving, items,
  agingAnalysis, ledgerActivity,
} from '../../data/insights'
import { Card, Segmented, Toggle } from '../../components/ui'
import InventoryComposition from '../../components/InventoryComposition'
import { CardListPanel } from '../../components/MaterialList'
import { AgingBars, DistributionDonut, MovementComposed, NetChangeChart } from '../../components/charts'
import { num, peso, fmtDate } from '../../lib/format'
import { seriesFor } from '../../lib/colors'
import { useTheme } from '../../context/ThemeContext'
import Icon from '../../lib/icons'

// Three sub-views over the same inventory. Overview answers "what do we hold and what
// is it worth", Insights answers "which materials need attention", Activity answers
// "what has actually moved". Splitting them keeps each screen to a readable length —
// the single scroll they replaced ran to eleven cards.
const VIEWS = [
  { key: 'overview', label: 'Overview', icon: 'box' },
  { key: 'insights', label: 'Insights', icon: 'analytics' },
  { key: 'activity', label: 'Activity', icon: 'trend' },
]

// Chart/list controls. Each option carries a glyph so the toggles read as "what is
// being split" (layers = the broad trade, tag = the finer item group) and "what is
// being measured" (box = units on hand, receipt = pesos) at a glance, without the
// labels having to be any longer.
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

// Shown wherever a card's source data is genuinely absent, instead of drawing an
// empty chart that reads as "everything is zero".
function NoData({ what, why }) {
  return (
    <div className="nodata">
      <Icon name="alert" size={20} />
      <div>
        <b>{what}</b>
        <span>{why}</span>
      </div>
    </div>
  )
}

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

// Ranked movers from the ledger. Separate from InsightList because these rows are
// item CODES aggregated out of movement records, not inventory lines — several lines
// can share a code, and a code that has since been fully issued has no line at all,
// so a row may have nothing to navigate to.
const FlowList = memo(function FlowList({ rows, tone, metric }) {
  const nav = useNavigate()
  if (!rows.length) return <div className="empty">No recorded movements for the current selection.</div>
  const val = (r) => (metric === 'value' ? r.value : r.qty)
  const max = Math.max(...rows.map(val), 1)
  return (
    <div className="insight-list">
      {rows.map((r, i) => (
        <div className={`insight-row ${r.id ? '' : 'static'}`} key={r.code}
          onClick={() => r.id && nav(`/inventory/${r.id}`)}>
          <div className={`rank ${i < 3 ? 'top' : ''}`}>{i + 1}</div>
          <div className="insight-main">
            <div className="t" title={r.description}>{r.description}</div>
            <div className="s">{r.code}{r.tradeL1 ? ` · ${r.tradeL1}` : ''} · {num(r.moves)} movement{r.moves === 1 ? '' : 's'}</div>
            <div className="bar"><span style={{ width: `${(val(r) / max) * 100}%`, background: tone }} /></div>
          </div>
          <div className="right insight-num">
            <div className="v tabular">{metric === 'value' ? peso(r.value) : num(r.qty)}</div>
            <div className="u faint">{metric === 'value' ? `${num(r.qty)} ${r.uom}` : r.uom}</div>
          </div>
        </div>
      ))}
    </div>
  )
})

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

// NOT built at module scope. This module is imported eagerly from Dashboard, which
// App imports eagerly, so its top level runs while `items` is still empty —
// src/lib/hydrate.js only fills it later, and AuthContext re-runs the load again
// after sign-in. A module-scope snapshot froze all five lists at zero rows forever.
// Recomputing on items.length keeps the memo but survives every hydration.
const buildInsightRows = () => ({
  high: topQuantity(ALL),
  value: highValue(ALL),
  low: lowStock(ALL),
  fast: fastMoving(ALL),
  dead: nonMoving(ALL),
})

// `pool` and `qtyUnit` come from the dashboard shell, which owns the filter bar that
// is shared across all three dashboard tabs.
export default function InventoryTab({ pool, qtyUnit }) {
  const { theme } = useTheme()
  // Resolved per theme so every accent on this page — the composition tiles, card
  // icons and insight bars — stays legible on whichever card background is in play.
  const S = seriesFor(theme)
  // The sub-view lives in the URL alongside the dashboard's own ?tab, so a link can
  // point at "the Activity view of the Inventory dashboard" and Back works between
  // views. The guided tour relies on this too.
  const [params, setParams] = useSearchParams()
  const requested = params.get('view')
  const view = VIEWS.some((v) => v.key === requested) ? requested : 'overview'

  const [period, setPeriod] = useState('month')
  const [donutScope, setDonutScope] = useState('l1')
  const [donutMetric, setDonutMetric] = useState('qty')
  const [highStockMetric, setHighStockMetric] = useState('qty')
  const [agingMetric, setAgingMetric] = useState('value')
  const [flowMetric, setFlowMetric] = useState('qty')
  const [compMetric, setCompMetric] = useState('qty')
  // Overview selections. These used to open a full-screen sliding drawer; the list
  // now lives in the right-hand panel of the card that was clicked, so the selection
  // is per-card state rather than one modal shared by both.
  const [compSel, setCompSel] = useState(null)
  const [donutSel, setDonutSel] = useState(null)

  const INSIGHT_ROWS = useMemo(buildInsightRows, [items.length])
  const k = useMemo(() => KPIS(pool), [pool])
  const movementData = useMemo(() => movementCombinedSeries(pool, period), [pool, period])
  const aging = useMemo(() => agingAnalysis(pool), [pool])
  const activity = useMemo(() => ledgerActivity(pool, period), [pool, period])
  const periodOpts = PERIODS.map((p) => ({ value: p.key, label: p.label }))

  const donutData = useMemo(
    () => rollup(donutScope === 'l1' ? byTradeL1(pool) : byTradeL2(pool, 'all')),
    [pool, donutScope],
  )

  // The materials behind a clicked composition tile — the same set the drawer used to
  // list, ranked by the tile's own quantity column.
  const compRows = useMemo(() => {
    if (!compSel) return []
    return pool.filter((i) => (i[compSel.field] || 0) > 0).sort((a, b) => b[compSel.field] - a[compSel.field])
  }, [compSel, pool])

  // The materials behind a clicked slice. "Others" is the rollup bucket, not a real
  // category, so it resolves to everything NOT in one of the named slices rather than
  // to a category literally called Others — which would list nothing.
  const donutRows = useMemo(() => {
    if (!donutSel) return []
    const field = donutScope === 'l1' ? 'tradeL1' : 'tradeL2'
    const named = new Set(donutData.filter((d) => d.name !== 'Others').map((d) => d.name))
    const match = donutSel.name === 'Others'
      ? (i) => !named.has(i[field])
      : (i) => i[field] === donutSel.name
    return pool.filter(match).sort((a, b) => b.totalQty - a.totalQty)
  }, [donutSel, donutScope, donutData, pool])

  const selectView = (key) => {
    const next = new URLSearchParams(params)
    if (key === 'overview') next.delete('view')
    else next.set('view', key)
    setParams(next, { replace: true })
  }

  return (
    <>
      <div className="sub-tabs" role="tablist" data-tour="inv-views">
        {VIEWS.map((v) => (
          <button key={v.key} role="tab" aria-selected={v.key === view}
            className={`sub-tab ${v.key === view ? 'active' : ''}`} onClick={() => selectView(v.key)}>
            <Icon name={v.icon} size={15} />
            <span>{v.label}</span>
          </button>
        ))}
      </div>

      {/* ---------------------------------------------------------------- Overview
          Two full-width cards stacked, each split into a chart on the left and a
          material list down its right-hand side. The list is the same one that used
          to fly in as a full-screen drawer over the whole dashboard: keeping it
          inside the card means the figure you clicked stays on screen next to the
          rows it produced, instead of being covered by them. */}
      {view === 'overview' && (
        <div className="mt overview-stack">
          {/* The six quantity figures live INSIDE this card — see
              InventoryComposition. Each tile hovers for a description and clicks
              through to the material list on the right. */}
          <Card title="Inventory Composition" icon="box" className="composition-card" data-tour="kpis"
            foot={<Toggle size="sm" options={metricOpts} value={compMetric} onChange={setCompMetric} />}>
            <div className="card-split">
              <div className="card-split-main">
                <InventoryComposition k={k} unit={qtyUnit} metric={compMetric} series={S}
                  onPick={setCompSel} selectedKey={compSel?.key} />
              </div>
              <CardListPanel selection={compSel} rows={compRows} onClear={() => setCompSel(null)}
                hint="Click any figure on the left to list the materials behind it." />
            </div>
          </Card>

          <Card title="Inventory Distribution" icon="reports" className="distribution-card" data-tour="charts"
            foot={
              <div className="chart-controls">
                {/* Changing the scope clears the selection: a Trade name is not an
                    Item Group name, so the panel would otherwise keep a heading that
                    no slice on the new ring corresponds to. */}
                <Toggle size="sm" options={scopeOpts} value={donutScope}
                  onChange={(v) => { setDonutScope(v); setDonutSel(null) }} />
                <Toggle size="sm" options={metricOpts} value={donutMetric} onChange={setDonutMetric} />
              </div>
            }>
            <div className="card-split">
              <div className="card-split-main">
                {donutData.length === 0
                  ? <NoData what="No inventory loaded" why="Nothing matches the current filter, or the inventory table is empty." />
                  : <DistributionDonut data={donutData} metric={donutMetric} leaderLines wide
                      onSliceClick={(d) => setDonutSel((s) => (s?.name === d.name ? null : { name: d.name }))}
                      selectedName={donutSel?.name} />}
              </div>
              <CardListPanel
                selection={donutSel ? { label: donutSel.name, field: 'totalQty' } : null}
                rows={donutRows} onClear={() => setDonutSel(null)}
                hint="Click a slice of the ring to list the materials in that category." />
            </div>
          </Card>
        </div>
      )}

      {/* ---------------------------------------------------------------- Insights
          Six cards in three uniform two-across rows. ABC analysis was removed; Aging
          takes the slot beside Dead Stock, which is also where it belongs by subject
          — both answer "what is not moving". */}
      {view === 'insights' && (
        <div className="mt" data-tour="insights">
          <div className="grid grid-2 insight-grid">
            <Card title="High Stock Items" icon="box" iconColor={S.total}
              foot={<Toggle size="sm" options={metricOpts} value={highStockMetric} onChange={setHighStockMetric} />}>
              {/* The toggle swaps ONLY the headline figure. The ranking stays by quantity
                  (INSIGHT_ROWS.high is topQuantity) and `barValue` pins the bars to
                  quantity too — otherwise the bars would stop agreeing with the rank
                  order they sit in and the list would read as mis-sorted. */}
              <InsightList rows={INSIGHT_ROWS.high}
                main={highStockMetric === 'value' ? getValue : getTotalQty}
                money={highStockMetric === 'value'}
                unit={highStockMetric === 'value' ? qtyWithUom : byUom}
                barValue={getTotalQty} secondary={tradeSub} tone={S.total} />
            </Card>
            <Card title="High Value Items" icon="reports" iconColor={S.value}>
              {/* Headline is the UNIT price — the per-item worth, not the line total. */}
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

          <div className="grid grid-2 insight-grid mt-sm">
            <Card title="Dead Stock Items" icon="clock" iconColor={S.reserved}>
              {/* Headline is the last-moved date, so the bars size by quantity instead. */}
              <InsightList rows={INSIGHT_ROWS.dead} raw main={getLastMoved} barValue={getTotalQty}
                unit={qtyWithUom} secondary={tradeSub} tone={S.reserved} />
            </Card>

            {/* The only card on this view that follows the filter bar — every list
                beside it reads the whole warehouse. The chip says so, since silently
                mixing the two behaviours is what made the old layout confusing. */}
            <Card title="Aging Analysis" icon="clock" iconColor={S.damaged}
              right={<span className="chip">current filter</span>}
              foot={<Toggle size="sm" options={metricOpts} value={agingMetric} onChange={setAgingMetric} />}>
              {!aging
                ? <NoData what="No movement dates" why="No line in the current selection carries a last-movement date, so age cannot be computed." />
                : (
                  <>
                    <AgingBars bands={aging.bands} metric={agingMetric} />
                    <div className="band-rows">
                      <div className="band-row" style={{ '--band': S.total }}>
                        <span className="band-tag">90+</span>
                        <div className="band-main">
                          <div className="band-t">Idle over 90 days</div>
                          <div className="band-s">The figure a cycle-count or write-down review acts on</div>
                        </div>
                        <div className="right">
                          <div className="band-v tabular">{peso(aging.staleValue)}</div>
                          <div className="band-u faint">{aging.staleShare.toFixed(1)}% of value</div>
                        </div>
                      </div>
                    </div>
                    {aging.missing > 0 && (
                      <div className="card-note faint">{num(aging.missing)} line{aging.missing === 1 ? '' : 's'} excluded — no last-movement date recorded.</div>
                    )}
                  </>
                )}
            </Card>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------------------- Activity */}
      {view === 'activity' && (
        <div className="mt" data-tour="activity">
          {!activity.hasLedger && (
            <NoData what="No movement ledger loaded"
              why="Every chart and list on this view is built from recorded receipts and issues. None reached the browser, so nothing here can be shown." />
          )}

          {activity.hasLedger && (
            <>
              <div className="activity-summary">
                <div className="as-item" style={{ '--as': S.incoming }}>
                  <Icon name="incoming" size={16} />
                  <div><span className="as-val tabular">{num(activity.totals.inQty)}</span><span className="as-lbl">Received · {peso(activity.totals.inValue)}</span></div>
                </div>
                <div className="as-item" style={{ '--as': S.outgoing }}>
                  <Icon name="outgoing" size={16} />
                  <div><span className="as-val tabular">{num(activity.totals.outQty)}</span><span className="as-lbl">Issued · {peso(activity.totals.outValue)}</span></div>
                </div>
                <div className="as-item" style={{ '--as': activity.totals.netQty >= 0 ? S.available : S.total }}>
                  <Icon name={activity.totals.netQty >= 0 ? 'arrowUp' : 'arrowDown'} size={16} />
                  <div><span className="as-val tabular">{activity.totals.netQty >= 0 ? '+' : ''}{num(activity.totals.netQty)}</span><span className="as-lbl">Net over {num(activity.windowDays)} recorded days</span></div>
                </div>
                <div className="as-item" style={{ '--as': S.neutral }}>
                  <Icon name="clock" size={16} />
                  <div><span className="as-val tabular">{num(activity.rowCount)}</span><span className="as-lbl">Movements · newest {activity.ledgerLagDays === 0 ? 'today' : `${num(activity.ledgerLagDays)}d ago`}</span></div>
                </div>
              </div>

              <Card title="Movement History" icon="trend" className="movement-card mt"
                foot={<Segmented size="sm" options={periodOpts} value={period} onChange={setPeriod} />}>
                {/* Always `wide`: the card spans the page, so the legend belongs in a
                    column beside the chart rather than in a strip underneath it. */}
                <MovementComposed data={movementData} wide />
                {/* The one caveat on this chart that a reader cannot infer from it.
                    It sits under the chart as a footnote rather than in the card head,
                    where a paragraph of explanatory text crowded out the title. */}
                <div className="card-note faint">
                  Available/reserved split is modelled — the source sheets carry no reservation history.
                </div>
              </Card>

              <Card title="Net Inventory Change" icon="analytics" className="mt"
                foot={<Toggle size="sm" options={metricOpts} value={flowMetric} onChange={setFlowMetric} />}>
                {activity.coveredBuckets === 0
                  ? <NoData what="No coverage in this period" why={`The ledger's newest movement is ${num(activity.ledgerLagDays)} days old, so none of the ${period} buckets shown fall inside it. Try a wider granularity.`} />
                  : <NetChangeChart data={activity.series} metric={flowMetric} />}
              </Card>

              <div className="grid grid-2 insight-grid mt">
                <Card title="Top Incoming Items" icon="incoming" iconColor={S.incoming}
                  foot={<Toggle size="sm" options={metricOpts} value={flowMetric} onChange={setFlowMetric} />}>
                  <FlowList rows={activity.topIncoming} tone={S.incoming} metric={flowMetric} />
                </Card>
                <Card title="Top Outgoing Items" icon="outgoing" iconColor={S.outgoing}>
                  <FlowList rows={activity.topOutgoing} tone={S.outgoing} metric={flowMetric} />
                </Card>
              </div>
            </>
          )}
        </div>
      )}

    </>
  )
}
