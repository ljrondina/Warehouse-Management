import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { reservations as seed } from '../data/transactions'
import { Card, Badge, DataTable, KpiCard } from '../components/ui'
import { num, fmtDate } from '../lib/format'

export default function Reservations() {
  const nav = useNavigate()
  const [rows, setRows] = useState(seed)
  const [filter, setFilter] = useState('')

  const view = filter ? rows.filter((r) => r.status === filter) : rows
  const release = (id) => setRows((rs) => rs.map((r) => (r.id === id ? { ...r, status: 'Released' } : r)))

  const stat = (s) => rows.filter((r) => r.status === s).length

  return (
    <>
      <div className="section-note">Material reservations across projects</div>

      <div className="kpi-grid mt" style={{ gridTemplateColumns: 'repeat(4,1fr)' }}>
        <KpiCard label="Reserved" value={num(stat('Reserved'))} unit="records" color="#7d7c7c" />
        <KpiCard label="For Release" value={num(stat('For Release'))} unit="records" color="#a8770f" />
        <KpiCard label="Released" value={num(stat('Released'))} unit="records" color="#2f7d5a" />
        <KpiCard label="Pending" value={num(stat('Pending'))} unit="records" color="#c42127" />
      </div>

      <Card className="mt" pad={false} title="Reservation Records" right={
        <select className="select" style={{ width: 180 }} value={filter} onChange={(e) => setFilter(e.target.value)}>
          <option value="">All statuses</option>
          {['Reserved', 'For Release', 'Released', 'Pending'].map((s) => <option key={s}>{s}</option>)}
        </select>
      }>
        <DataTable
          columns={[
            { key: 'id', label: 'Reservation', render: (r) => <span className="mono">{r.id}</span> },
            { key: 'itemCode', label: 'Item Code', render: (r) => <span className="mono">{r.itemCode}</span> },
            { key: 'description', label: 'Material', render: (r) => <div className="trunc">{r.description}</div> },
            { key: 'project', label: 'Project' },
            { key: 'qty', label: 'Reserved Qty', num: true, render: (r) => `${num(r.qty)} ${r.uom}` },
            { key: 'date', label: 'Reservation Date', render: (r) => fmtDate(r.date), sortValue: (r) => r.date },
            { key: 'requiredDate', label: 'Required', render: (r) => fmtDate(r.requiredDate), sortValue: (r) => r.requiredDate },
            { key: 'status', label: 'Status', render: (r) => <Badge>{r.status}</Badge> },
            { key: 'act', label: '', sortable: false, render: (r) => r.status !== 'Released'
                ? <button className="btn btn-sm" onClick={(e) => { e.stopPropagation(); release(r.id) }}>Release</button>
                : <span className="faint">✓ Done</span> },
          ]}
          rows={view}
          onRowClick={(r) => r.itemId && nav(`/inventory/${r.itemId}`)}
          initialSort={{ key: 'date', dir: 'desc' }}
        />
      </Card>
    </>
  )
}
