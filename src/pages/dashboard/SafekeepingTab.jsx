import { useEffect, useMemo, useState } from 'react'
import { soh, TRADES, SHEET_PROJECTS } from '../../data/safekeeping'
import { KPIS, bySkScope, SK_SCOPES, SHEET_VIEWS } from '../../data/safekeepingInsights'
import { Card, KpiCard, Segmented } from '../../components/ui'
import Select from '../../components/Select'
import DataSheet from '../../components/DataSheet'
import DeliveryTracker from '../../components/DeliveryTracker'
import { DistributionDonut } from '../../components/charts'
import { num } from '../../lib/format'
import { seriesFor, categoricalFor } from '../../lib/colors'
import { useTheme } from '../../context/ThemeContext'
import Icon from '../../lib/icons'

// `qty: true` cards take the dashboard's filter-aware unit label; the other two count
// things that are not units of measure, so they carry their own noun.
const SK_CARDS = [
  { key: 'lineItems', role: 'total', label: 'Total Line Items', icon: 'doc', unit: 'line items', tip: 'Distinct project/item lines on the Safekeeping stock-on-hand sheet.' },
  { key: 'totalSoh', role: 'available', label: 'Total Safekeeping SOH', icon: 'inventory', qty: true, tip: 'Total quantity currently held in safekeeping across every project.' },
  { key: 'distinctProjects', role: 'reserved', label: 'Projects in Safekeeping', icon: 'location', unit: 'projects', tip: 'Distinct projects with materials currently stored at the warehouse.' },
  { key: 'totalIn', role: 'incoming', label: 'Incoming', icon: 'incoming', qty: true, tip: 'Quantity received into safekeeping, per the SOH sheet’s In column.' },
  { key: 'totalOut', role: 'outgoing', label: 'Outgoing', icon: 'outgoing', qty: true, tip: 'Quantity pulled out of safekeeping, per the SOH sheet’s Out column.' },
]

// The donut folds everything past the 8th slice into "Others", which lands at index 8.
// The list keeps every row, so rows from 8 on take the Others colour — that is the slice
// they are actually inside, and it keeps bar colour and ring colour telling the same story.
const ROLLUP_N = 8

function rollup(data, n = ROLLUP_N) {
  if (data.length <= n) return data
  const top = data.slice(0, n)
  const rest = data.slice(n)
  const agg = rest.reduce((a, b) => ({ qty: a.qty + b.qty, count: a.count + b.count, share: a.share + b.share }), { qty: 0, count: 0, share: 0 })
  return [...top, { name: 'Others', label: `Others (${rest.length})`, ...agg, soh: agg.qty, value: 0, valueShare: 0, uom: '' }]
}

/* --------------------------------------------------------------- Distribution list --- */
// Two tight lines per group: the label/value row, then a full-width bar beneath it. Giving
// the bar the whole row width (rather than a 52px inline column) makes the comparison
// actually readable, and the list scrolls to fill whatever height the card has.
function ScopeList({ rows, palette, mixedLabel }) {
  if (!rows.length) return <div className="empty">No safekeeping lines match the current filters.</div>
  const max = Math.max(...rows.map((r) => r.qty), 1)
  return (
    <div className="sk-dist-list dense">
      {/* Inner wrapper exists purely so its auto margins can centre the rows in a taller
          box — centring the scroll container itself would clip the top row on overflow. */}
      <div className="skd-inner">
        {rows.map((r, i) => {
          const tone = palette[Math.min(i, ROLLUP_N) % palette.length]
          return (
            <div className="skd-row" key={r.name}>
              <div className="skd-head">
                <span className="sk-swatch" style={{ background: tone }} />
                <span className="skd-name" title={r.label}>{r.label}</span>
                <span className="skd-val tabular">{num(r.qty)}</span>
                <span className="skd-uom faint">{r.uom || mixedLabel}</span>
                <span className="skd-share tabular faint">{r.share.toFixed(1)}%</span>
              </div>
              <span className="skd-bar"><span style={{ width: `${(r.qty / max) * 100}%`, background: tone }} /></span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

/* ------------------------------------------------------------ Source sheet tables --- */
// Trade → Item Group vocabulary read off the SOH sheet itself (safekeeping's grouping is
// sheet-specific, not the app's shared trade taxonomy), so a combination that exists in
// the data can never be missing from the cascade.
const ITEM_GROUPS_BY_TRADE = (() => {
  const map = {}
  for (const r of soh) (map[r.trade] ??= new Set()).add(r.itemGroup)
  return Object.fromEntries(Object.entries(map).map(([k, v]) => [k, [...v].sort()]))
})()
const ALL_ITEM_GROUPS = [...new Set(soh.map((r) => r.itemGroup))].sort()

function SourceTables({ view }) {
  const [search, setSearch] = useState('')
  const [trade, setTrade] = useState('')
  const [itemGroup, setItemGroup] = useState('')
  const [project, setProject] = useState('')
  const hasTradeFields = view.groupBy.some((g) => g.key === 'trade')

  // Switching sheets drops any Trade/Item Group filter the new sheet cannot apply.
  useEffect(() => { if (!hasTradeFields) { setTrade(''); setItemGroup('') } }, [hasTradeFields])

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase()
    return view.rows().filter((r) => {
      if (project && r.project !== project) return false
      if (hasTradeFields && trade && r.trade !== trade) return false
      if (hasTradeFields && itemGroup && r.itemGroup !== itemGroup) return false
      if (q && !`${r.itemCode} ${r.description} ${r.detailedDescription}`.toLowerCase().includes(q)) return false
      return true
    })
  }, [view, search, trade, itemGroup, project, hasTradeFields])

  const filtersOn = Boolean(search || trade || itemGroup || project)
  const reset = () => { setSearch(''); setTrade(''); setItemGroup(''); setProject('') }

  // In Full view the group path each row belongs to has no band to live in, so it rides
  // under the description — the same trick the masterlist uses.
  const columns = useMemo(
    () => view.columns.map((c) => (c.desc
      ? { ...c, sub: (r) => [r.detailedDescription, view.groupBy.map((g) => r[g.key] || '—').join(' · ')].filter(Boolean).join('  ·  ') }
      : c)),
    [view],
  )

  return (
    <DataSheet
      columns={columns}
      rows={rows}
      groupBy={view.groupBy}
      aggKey={view.value === 'soh' ? 'soh' : 'qty'}
      aggLabel={view.value === 'soh' ? 'SOH' : 'units'}
      defaultGrouping="full"
      note={view.note}
      filtersOn={filtersOn}
      resetFilters={reset}
      filters={
        <>
          <div className="field lookup inv-search">
            <div className="lookup-box">
              <Icon name="search" size={14} className="lookup-ico" />
              <input className="input lookup-input" placeholder="Search item code or description…"
                value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
          </div>
          <Select value={project} options={SHEET_PROJECTS} placeholder="All Projects" size="sm" onChange={setProject} />
          {hasTradeFields && (
            <>
              <Select value={trade} options={TRADES} placeholder="All Trades" size="sm"
                onChange={(v) => { setTrade(v); setItemGroup('') }} />
              <Select value={itemGroup} options={trade ? (ITEM_GROUPS_BY_TRADE[trade] || []) : ALL_ITEM_GROUPS}
                placeholder="All Item Groups" size="sm" onChange={setItemGroup} align="right" />
            </>
          )}
        </>
      }
    />
  )
}

// `pool` and `qtyUnit` come from the dashboard shell, which owns the filter bar shared
// across all three dashboard tabs.
export default function SafekeepingTab({ pool, qtyUnit = 'units' }) {
  const { theme } = useTheme()
  const S = seriesFor(theme)
  const PALETTE = categoricalFor(theme)
  const [scope, setScope] = useState('project')
  const [sheet, setSheet] = useState('soh')

  const k = useMemo(() => KPIS(pool), [pool])
  const scopeRows = useMemo(() => bySkScope(pool, scope, qtyUnit), [pool, scope, qtyUnit])
  const donutRows = useMemo(() => rollup(scopeRows), [scopeRows])
  const scopeLabel = SK_SCOPES.find((s) => s.value === scope)?.label || 'Project'
  const sheetView = SHEET_VIEWS.find((v) => v.value === sheet) || SHEET_VIEWS[0]

  return (
    <>
      {/* Row 1 — the five headline figures beside the Distribution card. */}
      <div className="dash-top sk-top">
        <div className="dash-kpis">
          {SK_CARDS.map((c) => (
            <KpiCard key={c.key} label={c.label} value={num(k[c.key])}
              unit={c.qty ? qtyUnit : c.unit} icon={c.icon} color={S[c.role]} tooltip={c.tip} />
          ))}
        </div>

        <Card title={`Safekeeping Distribution by ${scopeLabel}`} icon="reports" iconColor={S.total} className="sk-dist-card"
          right={<Segmented size="sm" options={SK_SCOPES} value={scope} onChange={setScope} />}>
          <div className="sk-dist compact">
            <ScopeList rows={scopeRows} palette={PALETTE} mixedLabel={qtyUnit} />
            <div className="sk-dist-chart">
              {/* 240 rather than the card's full height: the ring must not be what sets
                  the row height, or a short list leaves slack beneath it. The list drives
                  the height now; the ring is centred in whatever it gets. */}
              <DistributionDonut data={donutRows} metric="qty" hideLegend showValue={false} unit={qtyUnit}
                height={240} innerRadius={64} outerRadius={96} />
            </div>
          </div>
        </Card>
      </div>

      {/* Row 2 — the Delivery Tracker, full width. Sourced entirely from the real
          Warehouse Schedule sheet, not seeded data. */}
      <div className="mt">
        <DeliveryTracker />
      </div>

      {/* Row 3 — the three source sheets in full, with the same search + filter bar
          convention as the Inventory Master List. */}
      <div className="mt">
        <Card pad={false}
          title="Safekeeping Source Tables" icon="reports" iconColor={S.neutral}
          right={<Segmented size="sm" options={SHEET_VIEWS} value={sheet} onChange={setSheet} />}>
          <SourceTables key={sheet} view={sheetView} />
        </Card>
      </div>
    </>
  )
}
