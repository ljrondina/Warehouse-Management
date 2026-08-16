import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { items } from '../data/insights'
import { movements as seedMovements } from '../data/transactions'
import { Card, Badge, DataTable, Modal } from '../components/ui'
import { num, fmtDate, TODAY, isoDate } from '../lib/format'
import Icon from '../lib/icons'

const CONDITIONS = [
  'Class A - Excellent Condition',
  'Class B - Good Condition',
  'Class C - Requires Repair',
  'Class D - Disposal',
]

function AddMovementForm({ type, onClose, onSave }) {
  const [code, setCode] = useState('')
  const item = useMemo(() => items.find((i) => i.itemCode === code), [code])
  const [form, setForm] = useState({
    detailed: '', brand: '', model: '', condition: CONDITIONS[1], qty: '', date: isoDate(),
    price: '', project: '', zone: 'A', rack: 'R01', shelf: 'S1', bin: 'B01',
  })
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))

  const submit = (e) => {
    e.preventDefault()
    onSave({
      id: `MV-${Math.floor(Math.random() * 9000) + 1000}`,
      itemId: item?.id,
      itemCode: code,
      description: item?.description || code,
      type: type === 'outgoing' ? 'Outgoing' : 'Incoming',
      qty: Number(form.qty) || 0,
      uom: item?.uom || 'PC',
      project: form.project || 'Central Warehouse',
      user: 'You',
      ref: `${type === 'outgoing' ? 'MI' : 'DR'}-2026-${Math.floor(Math.random() * 9000)}`,
      date: new Date(form.date),
      status: type === 'incoming' ? 'Pending Approval' : 'Completed',
    })
    onClose()
  }

  return (
    <Modal
      large
      title={`Add ${type === 'outgoing' ? 'Outgoing' : 'Incoming'} Material`}
      onClose={onClose}
      footer={
        <>
          <button className="btn" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" form="mv-form" type="submit"><Icon name="check" size={15} /> Save Movement</button>
        </>
      }
    >
      <form id="mv-form" onSubmit={submit}>
        <div className="field">
          <label>SAP Item Code</label>
          <select className="select" value={code} onChange={(e) => setCode(e.target.value)} required>
            <option value="">Select item code…</option>
            {items.slice(0, 200).map((i) => (
              <option key={i.id} value={i.itemCode}>{i.itemCode} — {i.description}</option>
            ))}
          </select>
        </div>

        <div className="card mt-sm" style={{ background: 'var(--surface-2)', padding: 14 }}>
          <div className="card-sub" style={{ marginBottom: 8 }}>Auto-generated from SAP item code</div>
          <div className="grid grid-3">
            <div><div className="faint" style={{ fontSize: 11 }}>Item Code</div><b>{item?.itemCode || '—'}</b></div>
            <div><div className="faint" style={{ fontSize: 11 }}>Description</div><b>{item?.description || '—'}</b></div>
            <div><div className="faint" style={{ fontSize: 11 }}>Trade</div><b>{item?.tradeL1 || '—'}</b></div>
            <div><div className="faint" style={{ fontSize: 11 }}>UOM</div><b>{item?.uom || '—'}</b></div>
            <div><div className="faint" style={{ fontSize: 11 }}>Material Type</div><b>{item?.materialType || '—'}</b></div>
            <div><div className="faint" style={{ fontSize: 11 }}>On Hand</div><b>{item ? num(item.totalQty) : '—'}</b></div>
          </div>
        </div>

        <div className="grid grid-2 mt-sm">
          <div className="field"><label>Detailed Material Description</label><input className="input" value={form.detailed} onChange={set('detailed')} placeholder={item?.detailedDescription} /></div>
          <div className="field"><label>Brand</label><input className="input" value={form.brand} onChange={set('brand')} placeholder={item?.brand} /></div>
          <div className="field"><label>Model</label><input className="input" value={form.model} onChange={set('model')} /></div>
          <div className="field"><label>Material Condition</label>
            <select className="select" value={form.condition} onChange={set('condition')}>{CONDITIONS.map((c) => <option key={c}>{c}</option>)}</select>
          </div>
          <div className="field"><label>Quantity</label><input className="input" type="number" min="1" value={form.qty} onChange={set('qty')} required /></div>
          <div className="field"><label>Date</label><input className="input" type="date" value={form.date} onChange={set('date')} /></div>
          <div className="field"><label>Purchase Price (₱)</label><input className="input" type="number" step="0.01" value={form.price} onChange={set('price')} placeholder={item?.unitPrice} /></div>
          <div className="field"><label>Project Source</label><input className="input" value={form.project} onChange={set('project')} placeholder="e.g. MRT-7 Depot" /></div>
        </div>

        <div className="card-sub mt-sm" style={{ marginBottom: 6 }}>Warehouse Location</div>
        <div className="grid" style={{ gridTemplateColumns: 'repeat(4,1fr)' }}>
          <div className="field"><label>Zone</label><input className="input" value={form.zone} onChange={set('zone')} /></div>
          <div className="field"><label>Rack</label><input className="input" value={form.rack} onChange={set('rack')} /></div>
          <div className="field"><label>Shelf</label><input className="input" value={form.shelf} onChange={set('shelf')} /></div>
          <div className="field"><label>Bin</label><input className="input" value={form.bin} onChange={set('bin')} /></div>
        </div>

        <div className="card-sub mt-sm" style={{ marginBottom: 6 }}>Attachments</div>
        <div className="dropzone">
          <Icon name="doc" size={28} />
          <div style={{ marginTop: 8 }}>Drop photos, delivery receipts, inspection reports & documents here</div>
          <div className="faint" style={{ fontSize: 12 }}>or click to browse (prototype)</div>
        </div>
      </form>
    </Modal>
  )
}

export default function Movement() {
  const [params, setParams] = useSearchParams()
  const type = params.get('type') === 'outgoing' ? 'outgoing' : 'incoming'
  const [records, setRecords] = useState(seedMovements)
  const [showForm, setShowForm] = useState(false)

  const filtered = records.filter((m) =>
    type === 'incoming' ? ['Incoming', 'Return'].includes(m.type) : m.type === 'Outgoing'
  )

  return (
    <>
      <div className="spread">
        <div>
          <div className="section-note">{type === 'incoming' ? 'Incoming materials & project returns' : 'Outgoing material releases to projects'}</div>
        </div>
        <button className="btn btn-primary" onClick={() => setShowForm(true)}>
          <Icon name="plus" size={16} /> Add Material Movement
        </button>
      </div>

      <div className="wrap-gap mt">
        <button className={`btn btn-sm ${type === 'incoming' ? 'btn-primary' : ''}`} onClick={() => setParams({ type: 'incoming' })}>Incoming Material</button>
        <button className={`btn btn-sm ${type === 'outgoing' ? 'btn-primary' : ''}`} onClick={() => setParams({ type: 'outgoing' })}>Outgoing Material</button>
      </div>

      <Card className="mt" pad={false}>
        <DataTable
          columns={[
            { key: 'date', label: 'Date', render: (r) => fmtDate(r.date), sortValue: (r) => r.date },
            { key: 'itemCode', label: 'Item Code', render: (r) => <span className="mono">{r.itemCode}</span> },
            { key: 'description', label: 'Description', render: (r) => <div className="trunc">{r.description}</div> },
            { key: 'type', label: 'Type', render: (r) => <Badge tone={r.type === 'Incoming' ? 'ok' : r.type === 'Return' ? 'warn' : 'info'}>{r.type}</Badge> },
            { key: 'qty', label: 'Quantity', num: true, render: (r) => `${num(r.qty)} ${r.uom}` },
            { key: 'project', label: 'Project' },
            { key: 'user', label: 'User' },
            { key: 'ref', label: 'Reference', render: (r) => <span className="mono">{r.ref}</span> },
            { key: 'status', label: 'Status', render: (r) => <Badge>{r.status}</Badge> },
          ]}
          rows={filtered}
          initialSort={{ key: 'date', dir: 'desc' }}
        />
      </Card>

      {showForm && <AddMovementForm type={type} onClose={() => setShowForm(false)} onSave={(rec) => setRecords((r) => [rec, ...r])} />}
    </>
  )
}
