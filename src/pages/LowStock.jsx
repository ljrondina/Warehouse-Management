import { useNavigate } from 'react-router-dom'
import { lowStock } from '../data/insights'
import { Card, DataTable, Badge, KpiCard } from '../components/ui'
import { num, peso } from '../lib/format'
import Icon from '../lib/icons'

export default function LowStock() {
  const nav = useNavigate()
  const rows = lowStock(200)
  const critical = rows.filter((r) => r.availableQty <= 0).length

  return (
    <>
      <div className="section-title"><Icon name="alert" size={22} /> Low Stock Alerts</div>
      <div className="section-note">Materials at or below minimum stock level — replenishment required</div>

      <div className="kpi-grid mt" style={{ gridTemplateColumns: 'repeat(3,1fr)' }}>
        <KpiCard label="Below Minimum" value={rows.length} unit="materials" color="#a8770f" />
        <KpiCard label="Out of Stock" value={critical} unit="critical" color="#c42127" />
        <KpiCard label="Est. Replenishment" value={peso(rows.reduce((a, b) => a + (b.minLevel - b.availableQty) * b.unitPrice, 0))} unit="to restore min" color="#7d7c7c" />
      </div>

      <Card className="mt" pad={false} title="Replenishment List">
        <DataTable
          pageSize={12}
          initialSort={{ key: 'gap', dir: 'desc' }}
          onRowClick={(r) => nav(`/inventory/${r.id}`)}
          columns={[
            { key: 'itemCode', label: 'Item Code', render: (r) => <span className="mono">{r.itemCode}</span> },
            { key: 'description', label: 'Material', render: (r) => <div className="trunc">{r.description}</div> },
            { key: 'tradeL1', label: 'Trade' },
            { key: 'availableQty', label: 'Available', num: true, render: (r) => <b style={{ color: 'var(--warn)' }}>{num(r.availableQty)}</b> },
            { key: 'minLevel', label: 'Min Level', num: true, render: (r) => num(r.minLevel) },
            { key: 'gap', label: 'Shortfall', num: true, render: (r) => num(Math.max(0, r.minLevel - r.availableQty)), sortValue: (r) => r.minLevel - r.availableQty },
            { key: 'uom', label: 'UOM' },
            { key: 'stockStatus', label: 'Status', render: (r) => <Badge>{r.stockStatus}</Badge> },
            { key: 'act', label: '', sortable: false, render: () => <button className="btn btn-sm btn-primary" onClick={(e) => e.stopPropagation()}>Request</button> },
          ]}
          rows={rows}
        />
      </Card>
    </>
  )
}
