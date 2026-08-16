import { byTradeL1, byTradeL2, KPIS, highValue, nonMoving } from '../data/insights'
import { Card, KpiCard, DataTable } from '../components/ui'
import { CategoryChart, HBar } from '../components/charts'
import { num, peso } from '../lib/format'
import Icon from '../lib/icons'

export default function Reports() {
  const k = KPIS()
  const cats = byTradeL1()
  const subs = byTradeL2()

  return (
    <>
      <div className="spread">
        <div>
          <div className="section-note">Summary reporting across the Central Warehouse</div>
        </div>
        <button className="btn"><Icon name="doc" size={15} /> Export CSV</button>
      </div>

      <div className="kpi-grid mt" style={{ gridTemplateColumns: 'repeat(4,1fr)' }}>
        <KpiCard label="Total Value" value={peso(k.value)} unit="at cost" color="#ee3124" />
        <KpiCard label="Total Units" value={num(k.total)} unit="on hand" color="#7d7c7c" />
        <KpiCard label="SKUs" value={num(k.skuCount)} unit="active" color="#2f7d5a" />
        <KpiCard label="Damaged" value={num(k.damaged)} unit="for review" color="#c42127" />
      </div>

      <div className="grid grid-2 mt">
        <Card title="Quantity by Trade"><CategoryChart data={cats} metric="qty" /></Card>
        <Card title="Value by Trade"><HBar data={cats.map((c) => ({ name: c.name, value: c.value }))} money color="#2b2c2b" /></Card>
      </div>

      <Card className="mt" pad={false} title="Trade & Item Group Breakdown">
        <DataTable
          pageSize={10}
          initialSort={{ key: 'qty', dir: 'desc' }}
          columns={[
            { key: 'tradeL1', label: 'Trade' },
            { key: 'name', label: 'Item Group' },
            { key: 'count', label: 'SKUs', num: true, render: (r) => num(r.count) },
            { key: 'qty', label: 'Total Qty', num: true, render: (r) => num(r.qty) },
            { key: 'value', label: 'Value', num: true, render: (r) => peso(r.value) },
          ]}
          rows={subs}
        />
      </Card>

      <div className="grid grid-2 mt">
        <Card title="High Value Report" pad={false}>
          <DataTable pageSize={6} initialSort={{ key: 'inventoryValue', dir: 'desc' }}
            columns={[
              { key: 'itemCode', label: 'Code', render: (r) => <span className="mono">{r.itemCode}</span> },
              { key: 'description', label: 'Material', render: (r) => <div className="trunc">{r.description}</div> },
              { key: 'inventoryValue', label: 'Value', num: true, render: (r) => peso(r.inventoryValue) },
            ]} rows={highValue(20)} />
        </Card>
        <Card title="Non-Moving Report" pad={false}>
          <DataTable pageSize={6}
            columns={[
              { key: 'itemCode', label: 'Code', render: (r) => <span className="mono">{r.itemCode}</span> },
              { key: 'description', label: 'Material', render: (r) => <div className="trunc">{r.description}</div> },
              { key: 'totalQty', label: 'Qty', num: true, render: (r) => num(r.totalQty) },
              { key: 'inventoryValue', label: 'Value', num: true, render: (r) => peso(r.inventoryValue) },
            ]} rows={nonMoving(20)} />
        </Card>
      </div>
    </>
  )
}
