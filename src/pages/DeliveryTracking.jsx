import { materialRequests } from '../data/transactions'
import { Card, Badge, KpiCard } from '../components/ui'
import { num, fmtDate } from '../lib/format'
import Icon from '../lib/icons'

const STAGES = ['Submitted', 'Approved', 'Reserved', 'Delivered']

function Tracker({ status }) {
  const idx = STAGES.indexOf(status) === -1 ? 0 : STAGES.indexOf(status)
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 0, flex: 1 }}>
      {STAGES.map((s, i) => (
        <div key={s} style={{ display: 'flex', alignItems: 'center', flex: i < STAGES.length - 1 ? 1 : 'none' }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
            <div style={{ width: 22, height: 22, borderRadius: '50%', display: 'grid', placeItems: 'center', background: i <= idx ? 'var(--brand-red)' : 'var(--surface-2)', color: i <= idx ? '#fff' : 'var(--text-faint)', border: '1px solid var(--border)' }}>
              {i < idx ? <Icon name="check" size={12} /> : i + 1}
            </div>
            <span className="faint" style={{ fontSize: 10 }}>{s}</span>
          </div>
          {i < STAGES.length - 1 && <div style={{ height: 2, flex: 1, background: i < idx ? 'var(--brand-red)' : 'var(--border)', margin: '0 4px', marginBottom: 16 }} />}
        </div>
      ))}
    </div>
  )
}

export default function DeliveryTracking() {
  const rows = materialRequests

  return (
    <>
      <div className="section-note">Track requested materials from approval to site delivery</div>

      <div className="kpi-grid mt" style={{ gridTemplateColumns: 'repeat(4,1fr)' }}>
        {STAGES.map((s, i) => (
          <KpiCard key={s} label={s} value={rows.filter((r) => r.status === s).length} unit="requests" color={['#7d7c7c', '#a8770f', '#2b2c2b', '#2f7d5a'][i]} />
        ))}
      </div>

      <div className="grid mt" style={{ gridTemplateColumns: '1fr' }}>
        {rows.slice(0, 12).map((r) => (
          <Card key={r.id} pad>
            <div className="spread" style={{ marginBottom: 12 }}>
              <div>
                <b>{r.description}</b> <span className="mono faint" style={{ fontSize: 12 }}>· {r.id}</span>
                <div className="faint" style={{ fontSize: 12 }}>{r.project} · {num(r.qty)} {r.uom} · required {fmtDate(r.requiredDate)}</div>
              </div>
              <Badge>{r.status}</Badge>
            </div>
            <Tracker status={r.status} />
          </Card>
        ))}
      </div>
    </>
  )
}
