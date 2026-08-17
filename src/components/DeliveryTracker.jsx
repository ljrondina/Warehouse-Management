import { useMemo, useState } from 'react'
import { deliveryRows, DELIVERY_STATUSES, deliveryStatusCounts, distinctProjects, distinctTrades } from '../data/deliveryTracker'
import { Card, KpiCard } from './ui'
import Select from './Select'
import DataSheet from './DataSheet'
import { num, fmtDate, fmtTargetText, fmtTower } from '../lib/format'
import { seriesFor } from '../lib/colors'
import { useTheme } from '../context/ThemeContext'
import Icon from '../lib/icons'

// KPI accents borrow the shared series roles rather than inventing new hexes, so an
// urgency here is the same colour family the rest of the dashboard uses. (Status is no
// longer a table column — the requested column set omits it — but it still drives the
// KPI filter row above the table.)
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

  // Laid out like the Inventory Master List's Full view: a wide Material Description
  // cell whose secondary line folds the qualifiers (trade · batch) out of their own
  // columns, then the fields that stand on their own. Widths are PIXELS, not
  // percentages, so the table has a real intrinsic width that can exceed the card — on
  // a desktop every column up to DP is visible and Remarks sits just past the right
  // edge, reachable by scrolling the table sideways. (A percentage set would instead
  // squeeze everything to fit and never scroll.)
  //
  // The source's own columns limit what can be shown: the Warehouse Schedule sheet
  // carries no item code, no detailed (2nd) description and no item group, so those
  // three requested sub-fields have no data behind them — trade and batch are the
  // qualifiers that actually exist, and they ride the description's second line.
  const columns = useMemo(() => [
    {
      key: 'item', label: 'Material Description', width: 320,
      render: (r) => (
        <>
          <span className="inv-desc" title={r.item}>{r.item}</span>
          <span className="inv-desc-sub" title={`${r.trade}${r.batch ? ` · ${r.batch}` : ''}`}>
            <span className="dtk-trade">{r.trade}</span>{r.batch && ` · ${r.batch}`}
          </span>
        </>
      ),
    },
    { key: 'project', label: 'Project', width: 210, blank: true },
    {
      key: 'targetDate', label: 'Target Delivery', width: 132,
      // Every custom-`render` column carries a `tooltip` too: once a column is narrower
      // than its content, the native title attribute is what still surfaces the full
      // value on hover.
      tooltip: (r) => (r.targetDate ? fmtDate(new Date(`${r.targetDate}T00:00:00`)) : `Estimate — no firm date in the source ("${r.targetText}")`),
      render: (r) => (r.targetDate
        ? fmtDate(new Date(`${r.targetDate}T00:00:00`))
        : <span className="dtk-est">{fmtTargetText(r.targetText) || 'TBC'}</span>),
    },
    {
      key: 'qty', label: 'Qty', width: 72, num: true,
      // Rendered, not left to num(): the source keeps "TBC" and compound counts like
      // "207 * 7" in this column, and num() would turn both into NaN.
      tooltip: (r) => (r.qty === 'TBC' || !r.qty ? 'TBC' : String(r.qty)),
      render: (r) => (r.qty === 'TBC' || !r.qty ? <span className="faint">TBC</span> : r.qty),
    },
    {
      key: 'uom', label: 'UOM', width: 68,
      tooltip: (r) => (r.uom === 'TBC' || !r.uom ? '—' : r.uom),
      render: (r) => (r.uom === 'TBC' || !r.uom ? <span className="faint">—</span> : r.uom),
    },
    {
      key: 'location', label: 'Location / Tower', width: 150, blank: true,
      // Free-text tower strings from the source ("Tower 1 & 2", "T2, T5 & T10")
      // standardised to the compact "T1, T2" / "TA, TB" form.
      tooltip: (r) => fmtTower(r.location),
      render: (r) => fmtTower(r.location),
    },
    {
      key: 'dpPayment', label: 'DP', width: 66,
      tooltip: (r) => r.dpPayment || '',
      render: (r) => (r.dpPayment
        ? <span className={`dtk-note-tag ${r.dpPayment === 'PAID' ? 'ok' : 'warn'}`}>{r.dpPayment}</span>
        : ''),
    },
    {
      key: 'opsRemarks', label: 'Remarks', width: 300,
      // Ops and PRC keep separate notes in the source; both are shown rather than one
      // being dropped, with PRC's on the second line and labelled so they stay distinct.
      render: (r) => (
        <>
          <span className="inv-desc" title={r.opsRemarks}>{r.opsRemarks || ''}</span>
          {r.prcRemarks && <span className="inv-desc-sub" title={r.prcRemarks}>PRC: {r.prcRemarks}</span>}
        </>
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
