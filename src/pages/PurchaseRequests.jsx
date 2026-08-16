import { useState } from 'react'
import { purchaseRequests as seed } from '../data/transactions'
import { Card, DataTable, Badge, KpiCard } from '../components/ui'
import { num, peso, fmtDate } from '../lib/format'
import Icon from '../lib/icons'

export default function PurchaseRequests() {
  const [rows] = useState(seed)
  const total = rows.reduce((a, b) => a + b.estCost, 0)

  return (
    <>
      <div className="spread">
        <div>
          <div className="section-title"><Icon name="request" size={22} /> Purchase Requirements</div>
          <div className="section-note">Replenishment & procurement requests</div>
        </div>
        <button className="btn btn-primary"><Icon name="plus" size={16} /> New Purchase Request</button>
      </div>

      <div className="kpi-grid mt" style={{ gridTemplateColumns: 'repeat(3,1fr)' }}>
        <KpiCard label="Open Requests" value={rows.length} unit="items" color="#ee3124" />
        <KpiCard label="Submitted / Approved" value={rows.filter((r) => ['Submitted', 'Approved'].includes(r.status)).length} unit="in pipeline" color="#7d7c7c" />
        <KpiCard label="Estimated Cost" value={peso(total)} unit="total" color="#2b2c2b" />
      </div>

      <Card className="mt" pad={false} title="Requests">
        <DataTable
          pageSize={12}
          initialSort={{ key: 'date', dir: 'desc' }}
          columns={[
            { key: 'id', label: 'PR No.', render: (r) => <span className="mono">{r.id}</span> },
            { key: 'itemCode', label: 'Item Code', render: (r) => <span className="mono">{r.itemCode}</span> },
            { key: 'description', label: 'Material', render: (r) => <div className="trunc">{r.description}</div> },
            { key: 'qtyNeeded', label: 'Qty Needed', num: true, render: (r) => `${num(r.qtyNeeded)} ${r.uom}` },
            { key: 'reason', label: 'Reason', render: (r) => <span className="muted">{r.reason}</span> },
            { key: 'estCost', label: 'Est. Cost', num: true, render: (r) => peso(r.estCost) },
            { key: 'date', label: 'Date', render: (r) => fmtDate(r.date), sortValue: (r) => r.date },
            { key: 'status', label: 'Status', render: (r) => <Badge>{r.status}</Badge> },
          ]}
          rows={rows}
        />
      </Card>
    </>
  )
}
