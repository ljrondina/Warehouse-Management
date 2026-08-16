import { useEffect, useMemo, useState } from 'react'
import { items, distinct } from '../data/insights'
import { TRADE_L1, l2For } from '../data/trades'
import { Modal } from './ui'
import { useDropdown } from './Select'
import { useItemMaster, LookupField } from './ItemLookup'
import { num, peso, TODAY, isoDate } from '../lib/format'
import Icon from '../lib/icons'

const CONDITIONS = [
  'Class A - Excellent Condition',
  'Class B - Good Condition',
  'Class C - Requires Repair',
  'Class D - Disposal',
]
const UOMS = ['PC', 'SET', 'M', 'KG', 'GAL', 'LTR', 'BOX', 'RL', 'UN', 'PAIL', 'CAN']
const TYPES = ['Consumable', 'Reusable', 'Asset', 'Chemical', 'Equipment']
// SAP item-code format from the reference sheet: DD-DD-DDD (e.g. 03-01-043).
const CODE_RE = /^\d{2}-\d{2}-\d{3}$/

// Replaces the native <select>. Same panel, rows and highlight as the lookup
// suggestions above, so every dropdown in the form reads as one component.
//
// `locked` marks a value that came from the item master. It is highlighted and
// non-editable, but the padlock is a button rather than a dead end — the master is
// reference data, not gospel, and a receiving clerk occasionally has to override it.
function SelectField({ label, value, options, onChange, span, locked, onUnlock, icon }) {
  const dd = useDropdown(options.length)
  const commit = (v) => { onChange(v); dd.setOpen(false) }
  useEffect(() => {
    if (dd.open) dd.setActive(Math.max(0, options.indexOf(value)))
  }, [dd.open])   // eslint-disable-line react-hooks/exhaustive-deps

  if (locked) {
    return (
      <div className={`field lookup ${span || ''}`}>
        <label>{label}</label>
        <div className="dd-trigger locked" title="Filled from the item master — click the lock to edit">
          {icon && <Icon name={icon} size={13} className="dd-lead" />}
          <span className="dd-value">{value}</span>
          <button type="button" className="lock-btn" onClick={onUnlock} aria-label={`Unlock ${label}`}>
            <Icon name="lock" size={13} />
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className={`field lookup ${span || ''}`} ref={dd.ref}>
      <label>{label}</label>
      <button type="button" className={`dd-trigger ${dd.open ? 'open' : ''}`}
        onClick={() => dd.setOpen((o) => !o)}
        onKeyDown={(e) => dd.nav(e, () => commit(options[dd.active]))}>
        {icon && <Icon name={icon} size={13} className="dd-lead" />}
        <span className="dd-value">{value}</span>
        <Icon name="chevronDown" size={14} />
      </button>
      {dd.open && (
        <div className="dd-menu card">
          {options.map((o, i) => (
            <button key={o} type="button"
              className={`dd-opt compact ${i === dd.active ? 'active' : ''} ${o === value ? 'on' : ''}`}
              onMouseEnter={() => dd.setActive(i)} onClick={() => commit(o)}>
              <span className="dd-label">{o}</span>
              {o === value && <Icon name="check" size={13} />}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export default function AddMaterialModal({ onClose, defaultCode }) {
  const master = useItemMaster()
  const warehouseCodes = useMemo(() => new Set(items.map((i) => i.itemCode)), [])
  const brands = useMemo(() => distinct('brand'), [])
  const [saved, setSaved] = useState(false)
  const [matched, setMatched] = useState(null)
  // Which fields the item master filled in and therefore owns. Cleared field-by-field
  // when the user deliberately unlocks one, and wholesale when they retype the code
  // or description (at which point the match no longer stands).
  const [locked, setLocked] = useState(() => new Set())
  const [form, setForm] = useState({
    code: defaultCode || '', description: '', detailed: '',
    tradeL1: TRADE_L1[0], tradeL2: l2For(TRADE_L1[0])[0],
    brand: '', model: '', uom: 'PC', materialType: 'Consumable',
    condition: CONDITIONS[1], qty: '', date: isoDate(), price: '',
  })

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))
  const put = (k) => (v) => setForm((f) => ({ ...f, [k]: v }))
  const setL1 = (l1) => setForm((f) => ({ ...f, tradeL1: l1, tradeL2: l2For(l1)[0] }))
  const unlock = (k) => () => setLocked((s) => { const n = new Set(s); n.delete(k); return n })
  const clearMatch = () => { setMatched(null); setLocked(new Set()) }

  // Picking a master record fills both search fields plus every attribute the
  // master actually knows. UOM is only present on ~13% of master rows, so it is
  // left at its current value when the record does not carry one — and an absent
  // value is never locked, since nothing authoritative was supplied for it.
  const applyMaster = (r) => {
    setMatched(r)
    setForm((f) => ({
      ...f, code: r.c, description: r.d, tradeL1: r.t, tradeL2: r.g,
      materialType: r.m || f.materialType, uom: r.u || f.uom,
    }))
    const owned = ['tradeL1', 'tradeL2']
    if (r.m) owned.push('materialType')
    if (r.u) owned.push('uom')
    setLocked(new Set(owned))
  }

  const codeValid = CODE_RE.test(form.code)
  const isExisting = warehouseCodes.has(form.code)
  // The master's item group may sit outside this trade's canonical list; keep it as
  // an option rather than silently snapping the selection to something else.
  const l2Options = useMemo(() => {
    const base = l2For(form.tradeL1)
    return base.includes(form.tradeL2) ? base : [form.tradeL2, ...base]
  }, [form.tradeL1, form.tradeL2])
  const uomOptions = UOMS.includes(form.uom) ? UOMS : [form.uom, ...UOMS]

  const submit = (e) => {
    e.preventDefault()
    if (!codeValid) return
    setSaved(true)
  }

  if (saved)
    return (
      <Modal title="Material Added" onClose={onClose} footer={<button className="btn btn-primary" onClick={onClose}>Done</button>}>
        <div className="add-done">
          <span className="badge badge-ok add-done-ico"><Icon name="check" size={26} /></span>
          <h3>{form.description || form.code}</h3>
          <p className="muted">
            <span className="mono">{form.code}</span> · {num(Number(form.qty) || 0)} {form.uom} · {form.tradeL1} / {form.tradeL2}
            {form.price ? ` · ${peso(Number(form.price), { decimals: 2 })}` : ''}
          </p>
          <p className="faint" style={{ fontSize: 12 }}>
            {isExisting ? 'Stock added to existing material record.' : 'New material master record created.'} (Prototype — Phase 1)
          </p>
        </div>
      </Modal>
    )

  return (
    <Modal
      large title="Add Material" onClose={onClose}
      footer={
        <>
          <button className="btn" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" type="submit" form="add-mat" disabled={!codeValid || !form.qty}>
            <Icon name="check" size={15} /> Save Material
          </button>
        </>
      }
    >
      <form id="add-mat" onSubmit={submit} className="add-form">
        <section className="form-section">
          <h4><Icon name="search" size={12} /> Identify</h4>
          {/* The two lookups share one line. Their suggestion panels are absolutely
              positioned and free to overflow the field, so a half-width field still
              gets a readable dropdown — the panel is widened in CSS instead. */}
          <div className="form-grid">
            <LookupField
              label="Item Code" icon="inventory" field="c" mono span="span-2"
              value={form.code} placeholder="e.g. 23-10-121" master={master}
              onType={(v) => { clearMatch(); setForm((f) => ({ ...f, code: v })) }}
              onPick={applyMaster}
            />
            <LookupField
              label="Material Description" icon="box" field="d" span="span-2"
              value={form.description} placeholder="e.g. PVC Spacer" master={master}
              onType={(v) => { clearMatch(); setForm((f) => ({ ...f, description: v })) }}
              onPick={applyMaster}
            />
            <div className="field span-4">
              <label>Detailed Description</label>
              <div className="lookup-box">
                <Icon name="doc" size={14} className="lookup-ico" />
                <input className="input lookup-input" value={form.detailed} onChange={set('detailed')} placeholder="e.g. PVC Spacer 25mm x 30mm x 25mm" />
              </div>
            </div>
          </div>
          {/* Always rendered (CSS reserves its height) rather than conditionally
              mounted — a status line popping in and out of the DOM as you type was
              what shifted the whole modal's height on every keystroke. Reserving the
              space keeps the modal still even when nothing is showing here. */}
          <div className="form-status">
            {form.code && !codeValid && (
              <span className="form-flag err"><Icon name="alert" size={12} /> Item code must look like 03-01-043.</span>
            )}
            {matched && (
              <span className="form-flag ok">
                <Icon name="check" size={12} /> Matched the item master — highlighted fields below are locked to the master record.
              </span>
            )}
            {isExisting && (
              <span className="form-flag info"><Icon name="box" size={12} /> Already stocked here — quantity will be added.</span>
            )}
          </div>
        </section>

        <section className="form-section">
          <h4><Icon name="layers" size={12} /> Classification and Details</h4>
          <div className="form-grid">
            <SelectField label="Trade" icon="layers" value={form.tradeL1} options={TRADE_L1} onChange={setL1} span="span-2"
              locked={locked.has('tradeL1')} onUnlock={unlock('tradeL1')} />
            <SelectField label="Item Group" icon="folder" value={form.tradeL2} options={l2Options} onChange={put('tradeL2')} span="span-2"
              locked={locked.has('tradeL2')} onUnlock={unlock('tradeL2')} />
            <SelectField label="UOM" icon="box" value={form.uom} options={uomOptions} onChange={put('uom')}
              locked={locked.has('uom')} onUnlock={unlock('uom')} />
            <SelectField label="Material Type" icon="filter" value={form.materialType} options={TYPES} onChange={put('materialType')}
              locked={locked.has('materialType')} onUnlock={unlock('materialType')} />
            <SelectField label="Condition" icon="approve" value={form.condition} options={CONDITIONS} onChange={put('condition')} span="span-2" />
            <div className="field span-2">
              <label>Brand</label>
              <div className="lookup-box">
                <Icon name="tag" size={14} className="lookup-ico" />
                <input className="input lookup-input" list="brand-list" value={form.brand} onChange={set('brand')} placeholder="e.g. Hilti" />
              </div>
              <datalist id="brand-list">{brands.map((b) => <option key={b} value={b} />)}</datalist>
            </div>
            <div className="field span-2">
              <label>Model</label>
              <div className="lookup-box">
                <Icon name="settings" size={14} className="lookup-ico" />
                <input className="input lookup-input" value={form.model} onChange={set('model')} />
              </div>
            </div>
          </div>
        </section>

        <section className="form-section">
          <h4><Icon name="incoming" size={12} /> Receipt</h4>
          <div className="form-grid">
            <div className="field">
              <label>Quantity</label>
              <input className="input" type="number" min="1" value={form.qty} onChange={set('qty')} placeholder="0" required />
            </div>
            <div className="field">
              <label>Date Received</label>
              <input className="input" type="date" value={form.date} onChange={set('date')} />
            </div>
            <div className="field span-2">
              <label>Purchase Price <span className="faint">₱ per {form.uom}</span></label>
              <input className="input" type="number" step="0.01" min="0" value={form.price} onChange={set('price')} placeholder="0.00" />
            </div>
          </div>
        </section>
      </form>
    </Modal>
  )
}
