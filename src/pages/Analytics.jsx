import { useMemo } from 'react'
import { analytics, byTradeL1, fastMoving, items, movementCombinedSeries } from '../data/insights'
import { Card, KpiCard } from '../components/ui'
import { DistributionDonut, TrendArea, HBar } from '../components/charts'
import { num, peso } from '../lib/format'
import Icon from '../lib/icons'

// Every figure on this page is computed from the Postgres rows. Where the data
// cannot support one — no ledger loaded, no valuation to divide by — the tile
// shows an em dash and drops its trend arrow rather than displaying a number that
// looks measured and is not. See the header comment on analytics() in
// src/data/insights.js for what is recorded and what is back-cast.
const DASH = '—'

export default function Analytics() {
  // Recomputes after each hydration pass; the ledger walk is O(rows) and this page
  // has no filter bar, so once per data load is the right cadence.
  const a = useMemo(() => analytics(), [items.length])
  const valueSeries = useMemo(() => a.valueSeries(6), [a])
  const qtySeries = useMemo(
    () => movementCombinedSeries(items, 'month').map((b) => ({ label: b.label, value: b.total })),
    [items.length]
  )

  const pct1 = (v) => (v == null ? null : Math.round(v * 10) / 10)
  const window = a.windowDays ? `over ${num(a.windowDays)} recorded days` : 'no ledger loaded'

  return (
    <>
      <div className="section-title"><Icon name="trend" size={22} /> Analytics</div>
      <div className="section-note">
        Inventory trends & movement analytics — derived from the stock ledger
        {a.windowDays
          ? `. Ledger covers ${num(a.windowDays)} days, most recent movement ${a.ledgerLagDays === 0 ? 'today' : `${num(a.ledgerLagDays)} days ago`}.`
          : '. No movement ledger loaded — turnover and trends are unavailable.'}
      </div>

      <div className="kpi-grid mt" style={{ gridTemplateColumns: 'repeat(4,1fr)' }}>
        <KpiCard label="Inventory Value" value={peso(a.inventoryValue)}
          unit={a.lookbackDays ? `vs ${a.lookbackDays} recorded days earlier` : 'total'}
          trend={pct1(a.valueTrend) ?? undefined} color="#ee3124"
          tooltip="Total purchase-cost value of stock on hand. The change compares today's valuation with the same valuation wound back through the ledger's recorded movements." />

        <KpiCard label="Stock Turnover"
          value={a.turnover == null ? DASH : `${(Math.round(a.turnover * 10) / 10).toFixed(1)}x`}
          unit={a.turnover == null ? window : 'annualized'}
          trend={pct1(a.turnoverTrend) ?? undefined} color="#2f7d5a"
          tooltip="Cost of materials issued divided by the average value held, scaled to a full year. The trend compares the recent half of the ledger window against the earlier half." />

        {/* Was "Warehouse Utilization 78%" — a literal. Nothing in the system records
            rack capacity (zones and bins are derived from the item rows themselves),
            so utilisation is not computable and this slot now carries a ratio that is. */}
        <KpiCard label="Stock Availability"
          value={a.availabilityPct == null ? DASH : `${Math.round(a.availabilityPct)}%`}
          unit="free to issue" color="#7d7c7c"
          tooltip="Share of stock on hand that is not reserved against a project request. No trend is shown: the warehouse keeps no history of reservations to compare against." />

        <KpiCard label="Non-Moving Value" value={peso(a.nonMovingValue)}
          unit={`${num(a.nonMovingCount)} materials at risk`} color="#a8770f"
          tooltip="Purchase-cost value of materials issued at most once per month. No trend is shown: issue frequency is a current snapshot with no recorded history." />
      </div>

      <div className="grid grid-2 mt">
        {/* The back-cast caveat moved out of the card head and under the chart, so the
            header carries the title alone. It still has to be stated somewhere: these
            curves are reconstructed from the ledger, not a recorded valuation history. */}
        <Card title="Inventory Value Trend">
          <TrendArea data={valueSeries} money color="#ee3124" />
          <div className="card-note faint">Last 6 months — back-cast from the ledger</div>
        </Card>
        <Card title="Total Quantity Trend">
          <TrendArea data={qtySeries} color="#7d7c7c" />
          <div className="card-note faint">Last 6 months — back-cast from the ledger</div>
        </Card>
      </div>

      <div className="grid grid-2 mt">
        {/* Same leader-line treatment as the Inventory dashboard's distribution card —
            the slice names and figures sit on the ring rather than in a colour key. */}
        <Card title="Trade Distribution"><DistributionDonut data={byTradeL1()} metric="qty" leaderLines wide /></Card>
        <Card title="Top Fast-Moving Materials"><HBar data={fastMoving(8).map((r) => ({ name: r.description.slice(0, 20), value: r.issueFrequency }))} color="#2f7d5a" /></Card>
      </div>
    </>
  )
}
