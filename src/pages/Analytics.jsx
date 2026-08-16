import { byTradeL1, KPIS, fastMoving, overstock } from '../data/insights'
import { Card, KpiCard } from '../components/ui'
import { DistributionDonut, TrendArea, HBar } from '../components/charts'
import { num, peso } from '../lib/format'
import Icon from '../lib/icons'

// Prototype 6-month trend derived from current totals.
const trend = (base, seed) =>
  ['Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul'].map((label, i) => ({
    label,
    value: Math.round(base * (0.82 + ((i * 7 + seed) % 20) / 100 + i * 0.02)),
  }))

export default function Analytics() {
  const k = KPIS()
  return (
    <>
      <div className="section-title"><Icon name="trend" size={22} /> Analytics</div>
      <div className="section-note">Inventory trends, utilization & movement analytics</div>

      <div className="kpi-grid mt" style={{ gridTemplateColumns: 'repeat(4,1fr)' }}>
        <KpiCard label="Inventory Value" value={peso(k.value)} unit="total" trend={3.2} color="#ee3124" />
        <KpiCard label="Stock Turnover" value="2.4x" unit="annualized" trend={5.1} color="#2f7d5a" />
        <KpiCard label="Warehouse Utilization" value="78%" unit="of capacity" trend={1.4} color="#7d7c7c" />
        <KpiCard label="Non-Moving Value" value={peso(overstock(999).reduce((a, b) => a + b.inventoryValue, 0))} unit="at risk" trend={-2.3} color="#a8770f" />
      </div>

      <div className="grid grid-2 mt">
        <Card title="Inventory Value Trend" sub="Last 6 months"><TrendArea data={trend(k.value, 3)} money color="#ee3124" /></Card>
        <Card title="Total Quantity Trend" sub="Last 6 months"><TrendArea data={trend(k.total, 7)} color="#7d7c7c" /></Card>
      </div>

      <div className="grid grid-2 mt">
        <Card title="Trade Distribution"><DistributionDonut data={byTradeL1()} metric="qty" /></Card>
        <Card title="Top Fast-Moving Materials"><HBar data={fastMoving(8).map((r) => ({ name: r.description.slice(0, 20), value: r.issueFrequency }))} color="#2f7d5a" /></Card>
      </div>
    </>
  )
}
