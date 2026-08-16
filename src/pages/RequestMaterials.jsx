import { useMemo, useState } from 'react'
import { items } from '../data/insights'
import { materialRequests as seed } from '../data/transactions'
import { Card, DataTable, Badge, Modal } from '../components/ui'
import { num, fmtDate, TODAY } from '../lib/format'
import Icon from '../lib/icons'

const PROJECTS = ['MRT-7 Depot', 'Cebu Airport T2', 'Malolos-Clark Rail', 'PITX Phase 2', 'Cavite Expressway']

export default function RequestMaterials() {
  const [rows, setRows] = useState(seed)
  const [show, setShow] = useState(false)
  const [form, setForm] = useState({ project: PROJECTS[0], code: '', qty: '', requiredDate: '', purpose: '' })
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))
  const item = useMemo(() => items.find((i) => i.itemCode === form.code), [form.code])

  const submit = (e) => {
    e.preventDefault()
    setRows((r) => [
      {
        id: `REQ-${5000 + r.length}`, itemId: item?.id, itemCode: form.code, description: item?.description || form.code,
        qty: Number(form.qty), uom: item?.uom || 'PC', project: form.project,
        requiredDate: form.requiredDate ? new Date(form.requiredDate) : TODAY, purpose: form.purpose, status: 'Submitted', date: TODAY,
      },
      ...r,
    ])
    setShow(false)
    setForm({ project: PROJECTS[0], code: '', qty: '', requiredDate: '', purpose: '' })
  }

  return (
    <>
      <div className="spread">
        <div>
          <div className="section-title"><Icon name="request" size={22} /> Request Materials</div>
          <div className="section-note">Submit material requests for your project site</div>
        </div>
        <button className="btn btn-primary" onClick={() => setShow(true)}><Icon name="plus" size={16} /> New Material Request</button>
      </div>

      <Card className="mt" pad={false} title="My Requests">
        <DataTable
          pageSize={12}
          initialSort={{ key: 'date', dir: 'desc' }}
          columns={[
            { key: 'id', label: 'Request', render: (r) => <span className="mono">{r.id}</span> },
            { key: 'project', label: 'Project' },
            { key: 'description', label: 'Material', render: (r) => <div className="trunc">{r.description}</div> },
            { key: 'qty', label: 'Qty', num: true, render: (r) => `${num(r.qty)} ${r.uom}` },
            { key: 'purpose', label: 'Purpose / Activity', render: (r) => <span className="muted">{r.purpose}</span> },
            { key: 'requiredDate', label: 'Required', render: (r) => fmtDate(r.requiredDate), sortValue: (r) => r.requiredDate },
            { key: 'status', label: 'Status', render: (r) => <Badge>{r.status}</Badge> },
          ]}
          rows={rows}
        />
      </Card>

      {show && (
        <Modal title="New Material Request" onClose={() => setShow(false)}
          footer={<><button className="btn" onClick={() => setShow(false)}>Cancel</button><button className="btn btn-primary" type="submit" form="req-form"><Icon name="check" size={14} /> Submit Request</button></>}>
          <form id="req-form" onSubmit={submit}>
            <div className="grid grid-2">
              <div className="field"><label>Project Name</label><select className="select" value={form.project} onChange={set('project')}>{PROJECTS.map((p) => <option key={p}>{p}</option>)}</select></div>
              <div className="field"><label>Material Required</label>
                <select className="select" value={form.code} onChange={set('code')} required>
                  <option value="">Select material…</option>
                  {items.slice(0, 200).map((i) => <option key={i.id} value={i.itemCode}>{i.itemCode} — {i.description}</option>)}
                </select>
              </div>
              <div className="field"><label>Quantity Requested {item ? `(avail ${num(item.availableQty)} ${item.uom})` : ''}</label><input className="input" type="number" min="1" value={form.qty} onChange={set('qty')} required /></div>
              <div className="field"><label>Required Date</label><input className="input" type="date" value={form.requiredDate} onChange={set('requiredDate')} required /></div>
            </div>
            <div className="field mt-sm"><label>Purpose / Activity</label><textarea className="input" rows={3} value={form.purpose} onChange={set('purpose')} placeholder="e.g. Formworks installation at Level 3" /></div>
          </form>
        </Modal>
      )}
    </>
  )
}
