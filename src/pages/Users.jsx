import { useState } from 'react'
import { DEMO_USERS, ROLES, ROLE_LIST } from '../data/roles'
import { Card, Badge, DataTable, KpiCard, Modal } from '../components/ui'
import { initials } from '../lib/format'
import Icon from '../lib/icons'

const seedUsers = DEMO_USERS.map((u, i) => ({
  ...u,
  id: `USR-${100 + i}`,
  status: 'Active',
}))

export default function Users() {
  const [users, setUsers] = useState(seedUsers)
  const [showAdd, setShowAdd] = useState(false)
  const [form, setForm] = useState({ name: '', email: '', role: 'warehouse', department: '', accessLevel: 'Standard' })
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))

  const add = (e) => {
    e.preventDefault()
    setUsers((u) => [...u, { ...form, id: `USR-${100 + u.length}`, status: 'Active' }])
    setShowAdd(false)
    setForm({ name: '', email: '', role: 'warehouse', department: '', accessLevel: 'Standard' })
  }
  const toggle = (id) => setUsers((us) => us.map((u) => (u.id === id ? { ...u, status: u.status === 'Active' ? 'Inactive' : 'Active' } : u)))

  return (
    <>
      <div className="spread">
        <div>
          <div className="section-note">Create, edit and assign roles across the warehouse ecosystem</div>
        </div>
        <button className="btn btn-primary" onClick={() => setShowAdd(true)}><Icon name="plus" size={16} /> Add User</button>
      </div>

      <div className="kpi-grid mt" style={{ gridTemplateColumns: 'repeat(3,1fr)' }}>
        <KpiCard label="Total Users" value={users.length} unit="accounts" color="#ee3124" />
        <KpiCard label="Active" value={users.filter((u) => u.status === 'Active').length} unit="enabled" color="#2f7d5a" />
        <KpiCard label="Roles" value={ROLE_LIST.length} unit="defined" color="#7d7c7c" />
      </div>

      <Card className="mt" pad={false} title="Accounts">
        <DataTable
          pageSize={10}
          columns={[
            { key: 'name', label: 'Name', render: (r) => (
                <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                  <div className="avatar" style={{ width: 30, height: 30, fontSize: 11 }}>{initials(r.name)}</div>
                  <b>{r.name}</b>
                </div>
              ) },
            { key: 'department', label: 'Department' },
            { key: 'role', label: 'Role', render: (r) => ROLES[r.role]?.label },
            { key: 'email', label: 'Email', render: (r) => <span className="muted">{r.email}</span> },
            { key: 'accessLevel', label: 'Access Level', render: (r) => <span className="chip">{r.accessLevel}</span> },
            { key: 'status', label: 'Status', render: (r) => <Badge>{r.status}</Badge> },
            { key: 'act', label: '', sortable: false, render: (r) => (
                <button className="btn btn-sm" onClick={(e) => { e.stopPropagation(); toggle(r.id) }}>{r.status === 'Active' ? 'Disable' : 'Enable'}</button>
              ) },
          ]}
          rows={users}
        />
      </Card>

      {showAdd && (
        <Modal
          title="Add User"
          onClose={() => setShowAdd(false)}
          footer={<><button className="btn" onClick={() => setShowAdd(false)}>Cancel</button><button className="btn btn-primary" type="submit" form="user-form">Create User</button></>}
        >
          <form id="user-form" onSubmit={add} className="grid grid-2">
            <div className="field"><label>Name</label><input className="input" value={form.name} onChange={set('name')} required /></div>
            <div className="field"><label>Email</label><input className="input" type="email" value={form.email} onChange={set('email')} required /></div>
            <div className="field"><label>Department</label><input className="input" value={form.department} onChange={set('department')} /></div>
            <div className="field"><label>Role</label><select className="select" value={form.role} onChange={set('role')}>{ROLE_LIST.map((r) => <option key={r.key} value={r.key}>{r.label}</option>)}</select></div>
            <div className="field"><label>Access Level</label><select className="select" value={form.accessLevel} onChange={set('accessLevel')}>{['Full', 'Executive', 'Operational', 'Standard', 'Project'].map((a) => <option key={a}>{a}</option>)}</select></div>
          </form>
        </Modal>
      )}
    </>
  )
}
