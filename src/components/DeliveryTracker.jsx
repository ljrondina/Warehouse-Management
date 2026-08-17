import { useMemo, useState } from 'react'
import { deliveryRows, DELIVERY_STATUSES, deliveryStatusCounts, distinctProjects, distinctTrades } from '../data/deliveryTracker'
import { Card, KpiCard, Badge } from './ui'
import Select from './Select'
import DataSheet from './DataSheet'
import { num, fmtDate, fmtTargetText } from '../lib/format'
import { seriesFor } from '../lib/colors'
import { useTheme } from '../context/ThemeContext'
import Icon from '../lib/icons'

const STATUS_TONE = Object.fromEntries(DELIVERY_STATUSES.map((s) => [s.key, s.tone]))
const STATUS_ICON = Object.fromEntries(DELIVERY_STATUSES.map((s) => [s.key, s.icon]))
// KPI accents borrow the shared series roles rather than inventing new hexes, so an
// urgency here is the same colour family the rest of the dashboard uses.
const TONE_ROLE = { danger: 'outgoing', warn: 'damaged', info: 'incoming', neutral: 'reserved' }

const PROJECTS = distinctProjects()
const TRADES = distinctTrades()

// Target delivery is mixed in the source: a real date on most rows, a free-text estimate
// ("August 2026") where no firm date exists. Sorting keys on the ISO date when there is
// one and pushes the text-only rows last, since they cannot be ordered against it.
const targetLabel = (r) => (r.targetDate ? fmtDate(new Date(`${r.targetDate}T00:00:00`)) : fmtTargetText(r.targetText) || 'TBC')

export default function DeliveryTracker() {
  const { theme } = useTheme()
  const S = seriesFor(theme)
  const [status, setStatus] = useState('')
  const [project, setProject] = useState('')
  const [trade, setTrade] = useState('')
  const [search, setSearch] = useState('')

  const counts = useMemo(() => deliveryStatusCounts(), [])

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase()
    return deliveryRows.filter((r) => {
      if (status && r.status !== status) return false
      if (project && r.project !== project) return false
      if (trade && r.trade !== trade) return false
      if (q && !`${r.item} ${r.trade} ${r.project} ${r.batch} ${r.location} ${r.opsRemarks} ${r.prcRemarks}`.toLowerCase().includes(q)) return false
      return true
    })
  }, [status, project, trade, search])

  const filtersOn = Boolean(status || project || trade || search)
  const reset = () => { setStatus(''); setProject(''); setTrade(''); setSearch('') }

  // Trade and batch ride on the Item cell's second line; project has its own column.
  // Widths are percentages summing to 100, which is what guarantees every column stays
  // visible at ANY container width — a pixel total only fits until the pane is narrower
  // than it. The split follows the content-priority order: item, project, target date,
  // qty, status, location, remarks.
  const columns = useMemo(() => [
    {
      // Project moved OUT of this cell's second line into its own column below — it
      // is a field worth sorting and scanning down, which a value buried in a
      // subtitle cannot be. Trade and batch stay here: neither has a column, and
      // both read as qualifiers of the item rather than as facts in their own right.
      key: 'item', label: 'Item', width: '26%',
      render: (r) => (
        <span className="dtk-itemtext">
          <span className="inv-desc" title={r.item}>{r.item}</span>
          <span className="inv-desc-sub" title={`${r.trade}${r.batch ? ` · ${r.batch}` : ''}`}>
            <span className="dtk-trade">{r.trade}</span>{r.batch && ` · ${r.batch}`}
          </span>
        </span>
      ),
    },
    { key: 'project', label: 'Project', width: '10%', blank: true },
    {
      key: 'targetDate', label: 'Target Delivery', width: '10.5%',
      // Every custom-`render` column below carries a `tooltip` too: once a column is
      // narrower than its content (the default fit, or after a manual resize), the
      // native title attribute is what still surfaces the full value on hover.
      tooltip: (r) => (r.targetDate ? fmtDate(new Date(`${r.targetDate}T00:00:00`)) : `Estimate — no firm date in the source ("${r.targetText}")`),
      render: (r) => (r.targetDate
        ? fmtDate(new Date(`${r.targetDate}T00:00:00`))
        : <span className="dtk-est">{fmtTargetText(r.targetText) || 'TBC'}</span>),
    },
    {
      key: 'qty', label: 'Qty', width: '6.5%', num: true,
      // Rendered, not left to num(): the source keeps "TBC" and compound counts like
      // "207 * 7" in this column, and num() would turn both into NaN.
      tooltip: (r) => (r.qty === 'TBC' || !r.qty ? 'TBC' : String(r.qty)),
      render: (r) => (r.qty === 'TBC' || !r.qty ? <span className="faint">TBC</span> : r.qty),
    },
    {
      key: 'uom', label: 'UOM', width: '5.5%',
      tooltip: (r) => (r.uom === 'TBC' || !r.uom ? '—' : r.uom),
      render: (r) => (r.uom === 'TBC' || !r.uom ? <span className="faint">—</span> : r.uom),
    },
    {
      key: 'status', label: 'Status', width: '11%',
      // noDot: the status glyph already carries the meaning, so the badge's own dot would
      // be a second marker competing for the label's space. Columns are user-resizable
      // (see DataSheet's col-grip), so a long label like "Due in 31-90 Days" is a drag
      // away from fully visible rather than something this column must force-fit.
      tooltip: (r) => r.status,
      render: (r) => (
        <Badge tone={STATUS_TONE[r.status] || 'neutral'} noDot>
          <Icon name={STATUS_ICON[r.status] || 'clock'} size={11} /> {r.status}
        </Badge>
      ),
    },
    { key: 'location', label: 'Location / Tower', width: '10%', blank: true },
    {
      key: 'dpPayment', label: 'DP', width: '4%',
      tooltip: (r) => r.dpPayment || '',
      render: (r) => (r.dpPayment
        ? <span className={`dtk-note-tag ${r.dpPayment === 'PAID' ? 'ok' : 'warn'}`}>{r.dpPayment}</span>
        : ''),
    },
    {
      key: 'opsRemarks', label: 'Remarks', width: '16.5%',
      // Ops and PRC keep separate notes in the source; both are shown rather than one
      // being dropped, with PRC's on the second line and labelled so they stay distinct.
      render: (r) => (
        <span className="dtk-itemtext">
          <span className="inv-desc" title={r.opsRemarks}>{r.opsRemarks || ''}</span>
          {r.prcRemarks && <span className="inv-desc-sub" title={r.prcRemarks}>PRC: {r.prcRemarks}</span>}
        </span>
      ),
    },
  ], [])

  return (
    <Card
      pad={false}
      title="Delivery Tracker" icon="truck" iconColor={S.total}
    >
      <div className="dtk-kpis">
        <KpiCard label="Total Scheduled" value={num(deliveryRows.length)} unit="deliveries" icon="truck" color={S.neutral}
          onClick={() => setStatus('')} tooltip="Every delivery currently on the warehouse schedule." />
        {DELIVERY_STATUSES.map((s) => (
          <KpiCard key={s.key} label={s.short} value={num(counts[s.key] || 0)} unit="deliveries"
            icon={s.icon} color={S[TONE_ROLE[s.tone]] || S.neutral}
            onClick={() => setStatus((f) => (f === s.key ? '' : s.key))}
            tooltip={`Deliveries in the "${s.key}" bucket.`} />
        ))}
      </div>

      <DataSheet
        columns={columns}
        rows={rows}
        groupBy={[{ key: 'trade', label: 'Trade' }]}
        defaultGrouping="full"
        pageSize={40}
        rowKey={(r) => r.no}
        note='Source: "Warehouse Schedule" sheet.'
        scrollClass="sheet-scroll dtk-scroll"
        filtersOn={filtersOn}
        resetFilters={reset}
        filters={
          <>
            <div className="field lookup inv-search">
              <div className="lookup-box">
                <Icon name="search" size={14} className="lookup-ico" />
                <input className="input lookup-input" placeholder="Search item, project, location or remarks…"
                  value={search} onChange={(e) => setSearch(e.target.value)} />
              </div>
            </div>
            <Select value={status} options={DELIVERY_STATUSES.map((s) => s.key)} placeholder="All Statuses" size="sm" onChange={setStatus} />
            <Select value={project} options={PROJECTS} placeholder="All Projects" size="sm" onChange={setProject} />
            <Select value={trade} options={TRADES} placeholder="All Trades" size="sm" onChange={setTrade} align="right" />
          </>
        }
      />
    </Card>
  )
}
