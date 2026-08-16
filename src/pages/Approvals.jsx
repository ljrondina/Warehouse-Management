import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { approvals as seed } from '../data/transactions'
import { Card, Badge, KpiCard } from '../components/ui'
import { fmtDate } from '../lib/format'
import Icon from '../lib/icons'

export default function Approvals() {
  const nav = useNavigate()
  const [rows, setRows] = useState(seed.map((a) => ({ ...a, state: 'Pending' })))

  const act = (id, state) => setRows((rs) => rs.map((r) => (r.id === id ? { ...r, state } : r)))
  const pending = rows.filter((r) => r.state === 'Pending')

  return (
    <>
      <div className="section-note">Incoming acceptance & disposal requests awaiting your decision</div>

      <div className="kpi-grid mt" style={{ gridTemplateColumns: 'repeat(3,1fr)' }}>
        <KpiCard label="Pending" value={pending.length} unit="awaiting" color="#a8770f" />
        <KpiCard label="Incoming Acceptance" value={pending.filter((r) => r.category === 'incoming').length} unit="requests" color="#7d7c7c" />
        <KpiCard label="Disposal Requests" value={pending.filter((r) => r.category === 'disposal').length} unit="Class D review" color="#c42127" />
      </div>

      <div className="grid mt" style={{ gridTemplateColumns: '1fr' }}>
        {rows.map((r) => (
          <Card key={r.id} pad>
            <div className="spread">
              <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
                <span className={`badge badge-${r.category === 'disposal' ? 'danger' : 'info'}`} style={{ padding: 9 }}>
                  <Icon name={r.category === 'disposal' ? 'alert' : 'incoming'} size={18} />
                </span>
                <div>
                  <div style={{ fontWeight: 700 }}>{r.type} <span className="mono faint" style={{ fontSize: 12 }}>· {r.id}</span></div>
                  <div className="muted">{r.subject}</div>
                  <div className="faint" style={{ fontSize: 12 }}>Requested by {r.requestedBy} · {r.project} · {fmtDate(r.date)}</div>
                </div>
              </div>
              <div className="wrap-gap" style={{ alignItems: 'center' }}>
                {r.state === 'Pending' ? (
                  <>
                    {r.itemId && <button className="btn btn-sm" onClick={() => nav(`/inventory/${r.itemId}`)}>Review</button>}
                    <button className="btn btn-sm" onClick={() => act(r.id, 'Rejected')}>Reject</button>
                    <button className="btn btn-sm btn-primary" onClick={() => act(r.id, 'Approved')}><Icon name="check" size={14} /> Approve</button>
                  </>
                ) : (
                  <Badge tone={r.state === 'Approved' ? 'ok' : 'danger'}>{r.state}</Badge>
                )}
              </div>
            </div>
          </Card>
        ))}
      </div>
    </>
  )
}
