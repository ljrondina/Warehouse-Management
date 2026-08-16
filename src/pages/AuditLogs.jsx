import { useState } from 'react'
import { auditLog } from '../data/transactions'
import { Card, DataTable, Badge } from '../components/ui'
import { fmtDate } from '../lib/format'
import Icon from '../lib/icons'

const TONE = { Login: 'info', Approval: 'ok', 'Inventory Adjustment': 'warn', 'Movement Created': 'neutral', 'Condition Update': 'warn', 'Location Update': 'neutral', 'User Modified': 'danger' }

export default function AuditLogs() {
  const [q, setQ] = useState('')
  const rows = auditLog.filter((l) => `${l.user} ${l.action} ${l.detail}`.toLowerCase().includes(q.toLowerCase()))

  return (
    <>
      <div className="section-title"><Icon name="audit" size={22} /> Audit Trail</div>
      <div className="section-note">Login history, data modifications, inventory adjustments & approvals</div>

      <Card className="mt" pad={false} title="Activity Log" right={
        <div className="search" style={{ width: 260 }}>
          <Icon name="search" size={15} className="ico" />
          <input className="input" placeholder="Search activity…" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
      }>
        <DataTable
          pageSize={14}
          initialSort={{ key: 'date', dir: 'desc' }}
          columns={[
            { key: 'date', label: 'Timestamp', render: (r) => fmtDate(r.date), sortValue: (r) => r.date },
            { key: 'user', label: 'User' },
            { key: 'action', label: 'Action', render: (r) => <Badge tone={TONE[r.action] || 'neutral'}>{r.action}</Badge> },
            { key: 'detail', label: 'Detail', render: (r) => <span className="muted">{r.detail}</span> },
            { key: 'ip', label: 'IP Address', render: (r) => <span className="mono">{r.ip}</span> },
          ]}
          rows={rows}
        />
      </Card>
    </>
  )
}
