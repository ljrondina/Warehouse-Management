import { useEffect, useMemo, useState } from 'react'
import { Modal } from './ui'
import { useDropdown } from './Select'
import { useItemMaster, LookupField } from './ItemLookup'
import { TRADE_L1, l2For } from '../data/trades'
import { PROJECTS } from '../data/projects'
import { PACKING_TYPES, DIMENSIONED_PACKING, UOMS, peekNextSrn, nextSrn, uomForItemCode } from '../data/safekeeping'
import { DateField, TimeField } from './DateTimeField'
import { useSafekeepingRequests } from '../context/SafekeepingContext'
import { isoDate } from '../lib/format'
import Icon from '../lib/icons'

const MAX_MATCHES = 8

/* ------------------------------------------------------------------ Auto field --- */
// A value the form itself supplied rather than the user typing it: a system-issued
// number (pill "Auto"), or the signed-in requestor's own name (pill "You" — there is
// nothing to fill in, since the app already knows who is asking). Accent-tinted dashed
// plate, not a disabled input — a disabled field reads as "broken or forbidden" when
// the value is in fact already correct.
function AutoField({ label, value, span, icon, pill = 'Auto', mono = true }) {
  return (
    <div className={`field field-auto ${span || ''}`}>
      <label>{label}</label>
      <div className="auto-box">
        {icon && <Icon name={icon} size={13} className="dd-lead" />}
        <span className={`auto-val ${mono ? 'mono' : ''}`}>{value}</span>
        <span className="auto-pill">{pill}</span>
      </div>
    </div>
  )
}

/* --------------------------------------------------------------- Project search --- */
// Two search bars over the SAME project list — one keyed on code, one on name — so the
// requestor can start from whichever they know. Picking on either side fills both,
// because they are two views of one record, not two independent fields.
function ProjectSearch({ value, onChange }) {
  const picked = PROJECTS.find((p) => p.code === value) || null
  const [codeQ, setCodeQ] = useState(picked ? picked.code : '')
  const [nameQ, setNameQ] = useState(picked ? picked.name : '')

  // Keep both boxes in step when the selection changes from elsewhere (e.g. reset).
  useEffect(() => {
    const p = PROJECTS.find((x) => x.code === value)
    if (p) { setCodeQ(p.code); setNameQ(p.name) }
  }, [value])

  const commit = (p) => { onChange(p.code); setCodeQ(p.code); setNameQ(p.name) }

  return (
    <>
      {/* Both half-width and on the SAME row: .form-grid gives .span-2 dropdowns a
          readable minimum width, which a quarter-width code box would not get — and the
          panel has to show the project NAME beside the code to be worth opening. Code is
          on the left; alignRight on the name box keeps its panel growing back toward the
          code box instead of off the modal's right edge. */}
      <ProjectBox label="Project Code" icon="tag" mono field="code" query={codeQ} span="span-2"
        setQuery={setCodeQ} onPick={commit} selected={value} placeholder="e.g. BAU101" />
      <ProjectBox label="Project Name" icon="location" field="name" query={nameQ} span="span-2" alignRight
        setQuery={setNameQ} onPick={commit} selected={value} placeholder="Search project name…" />
    </>
  )
}

function ProjectBox({ label, icon, field, query, setQuery, onPick, selected, placeholder, mono, span, alignRight }) {
  const matches = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return PROJECTS.slice(0, MAX_MATCHES)
    const out = []
    for (const p of PROJECTS) {
      // Rank on the field being typed into, but still match the other one — typing a
      // code into the name box should not come back empty.
      const primary = (field === 'code' ? p.code : p.name).toLowerCase().indexOf(q)
      const other = (field === 'code' ? p.name : p.code).toLowerCase().indexOf(q)
      if (primary !== -1) out.push({ p, score: primary })
      else if (other !== -1) out.push({ p, score: other + 50 })
    }
    return out.sort((a, b) => a.score - b.score).slice(0, MAX_MATCHES).map((o) => o.p)
  }, [query, field])

  const dd = useDropdown(matches.length)
  useEffect(() => { dd.setActive(0) }, [query])   // eslint-disable-line react-hooks/exhaustive-deps
  const take = (p) => { if (p) { onPick(p); dd.setOpen(false) } }

  return (
    <div className={`field lookup ${span || ''}`} ref={dd.ref}>
      <label>{label}</label>
      <div className="lookup-box">
        <Icon name={icon} size={14} className="lookup-ico" />
        <input
          className={`input lookup-input ${mono ? 'mono' : ''}`}
          value={query} placeholder={placeholder} autoComplete="off"
          onChange={(e) => { setQuery(e.target.value); dd.setOpen(true) }}
          onFocus={() => dd.setOpen(true)}
          onKeyDown={(e) => dd.nav(e, () => take(matches[dd.active] || matches[0]))}
        />
      </div>
      {dd.open && matches.length > 0 && (
        <div className={`dd-menu card sk-project-menu ${alignRight ? 'align-right' : ''}`}>
          <div className="dd-head">
            <span>{matches.length} project{matches.length === 1 ? '' : 's'}</span>
            <span>↑↓ · Enter</span>
          </div>
          {matches.map((p, i) => (
            <button key={p.code} type="button"
              className={`dd-opt ${i === dd.active ? 'active' : ''} ${p.code === selected ? 'on' : ''}`}
              onMouseEnter={() => dd.setActive(i)} onClick={() => take(p)}>
              <span className="dd-code mono">{p.code}</span>
              <span className="dd-main"><span className="dd-label">{p.name}</span></span>
              {p.code === selected && <Icon name="check" size={13} />}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

/* ------------------------------------------------------------------ Batch picker --- */
// Which batches a delivery or pull-out covers. Batches are stored by their stable key,
// never by their displayed number: the number is derived from position, so deleting
// batch 2 renumbers 3 → 2, and a stored number would then point at the wrong item.
function BatchPicker({ label, batches, chosen, onChange }) {
  const dd = useDropdown(batches.length)
  const toggle = (key) => onChange(chosen.includes(key) ? chosen.filter((k) => k !== key) : [...chosen, key])
  const chosenBatches = batches.filter((b) => chosen.includes(b.key))

  return (
    <div className="field lookup span-4" ref={dd.ref}>
      <label>{label} <span className="faint">{chosen.length} of {batches.length}</span></label>
      <button type="button" className={`dd-trigger multi ${dd.open ? 'open' : ''}`} onClick={() => dd.setOpen((o) => !o)}>
        {chosenBatches.length === 0 ? (
          <span className="dd-value faint">Select batch…</span>
        ) : (
          chosenBatches.map((b) => <span key={b.key} className="bp-chip mono">{b.no}</span>)
        )}
        <Icon name="chevronDown" size={14} />
      </button>
      {dd.open && (
        <div className="dd-menu card">
          {batches.length === 0 && <div className="dd-head">Add an item first — batches come from Item Information.</div>}
          {batches.map((b, i) => {
            const on = chosen.includes(b.key)
            return (
              <button key={b.key} type="button"
                className={`dd-opt ${i === dd.active ? 'active' : ''}`}
                onMouseEnter={() => dd.setActive(i)} onClick={() => toggle(b.key)}>
                <span className={`fs-check ${on ? 'on' : ''}`}>{on && <Icon name="check" size={12} />}</span>
                <span className="dd-code mono">{b.no}</span>
                <span className="dd-main">
                  <span className="dd-label">{b.description || 'Unnamed item'}</span>
                  <span className="dd-hint">{b.qty ? `${b.qty} ${b.uom}` : 'no qty'} · {b.packingType}</span>
                </span>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

/* ------------------------------------------------------------------ Select field --- */
// `alignRight` is explicit, not inferred from DOM position — a field's actual left/right
// place in the grid depends on how many columns the fields before it consumed, which
// changes every time a field is added or reordered. A parity guess (nth-child even/odd)
// silently breaks the moment the layout shifts; naming the intent here does not.
function SelectField({ label, value, options, onChange, span, icon, placeholder, locked, onUnlock, alignRight }) {
  const list = placeholder ? ['', ...options] : options
  const dd = useDropdown(list.length)
  const commit = (v) => { onChange(v); dd.setOpen(false) }
  useEffect(() => {
    if (dd.open) dd.setActive(Math.max(0, list.indexOf(value)))
  }, [dd.open])   // eslint-disable-line react-hooks/exhaustive-deps

  if (locked)
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

  return (
    <div className={`field lookup ${span || ''}`} ref={dd.ref}>
      {label && <label>{label}</label>}
      <button type="button" className={`dd-trigger ${dd.open ? 'open' : ''}`}
        onClick={() => dd.setOpen((o) => !o)}
        onKeyDown={(e) => dd.nav(e, () => commit(list[dd.active]))}>
        {icon && <Icon name={icon} size={13} className="dd-lead" />}
        <span className="dd-value">{value || placeholder}</span>
        <Icon name="chevronDown" size={14} />
      </button>
      {dd.open && (
        <div className={`dd-menu card ${alignRight ? 'align-right' : ''}`}>
          {list.map((o, i) => (
            <button key={o || '__none'} type="button"
              className={`dd-opt compact ${i === dd.active ? 'active' : ''} ${o === value ? 'on' : ''}`}
              onMouseEnter={() => dd.setActive(i)} onClick={() => commit(o)}>
              <span className="dd-label">{o || placeholder}</span>
              {o === value && <Icon name="check" size={13} />}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// Header shared by every repeatable block: its identity on the left, duplicate and
// remove on the right. Duplication is the whole point of the pattern — a second batch
// from the same supplier, or a second delivery on the same truck, differs in one or two
// fields, so re-keying a dozen is wasted work.
function BlockHead({ tag, mono, badge, onDuplicate, onRemove, removeLabel }) {
  return (
    <div className="spread sk-block-head">
      <span className={`sk-block-tag ${mono ? 'mono' : ''}`}>{tag}</span>
      <div className="sk-block-acts">
        {badge}
        <button type="button" className="icon-btn" onClick={onDuplicate} title="Duplicate" aria-label={`Duplicate ${removeLabel}`}>
          <Icon name="copy" size={14} />
        </button>
        {onRemove && (
          <button type="button" className="icon-btn" onClick={onRemove} title="Remove" aria-label={`Remove ${removeLabel}`}>
            <Icon name="close" size={14} />
          </button>
        )}
      </div>
    </div>
  )
}

const newKey = () => Math.random().toString(36).slice(2)

// Supplier lives on the BATCH, not the request: one trip routinely carries material
// from several suppliers, and one request per supplier would mean three SRNs for a
// single delivery.
const blankBatch = () => ({
  key: newKey(),
  itemCode: '', description: '', detailedDescription: '',
  tradeL1: TRADE_L1[0], tradeL2: l2For(TRADE_L1[0])[0], uom: 'PC', qty: '',
  packingType: 'Box', dimensions: { length: '', width: '', height: '' },
  weight: '', shelfLife: '', supplier: '', remarks: '',
  locked: [], matched: false,
})

const blankDelivery = () => ({
  key: newKey(), batches: [],
  deliveryDate: '', deliveryTime: '',
  contactPerson: '', contactNumber: '',
  vehicle: { plateNumber: '', vehicleType: '', vehicleColor: '', otherDetails: '' },
  deliveryPersonnel: '', remarks: '',
})

const blankPullOut = () => ({
  key: newKey(), batches: [],
  pullOutDate: '', destination: '', pullOutType: 'Full', remarks: '',
})

export default function AddSafekeepingRequestModal({ onClose, requestor, defaultProject }) {
  const srn = useMemo(() => peekNextSrn(), [])
  const master = useItemMaster()
  const { addRequest } = useSafekeepingRequests()
  const [saved, setSaved] = useState(false)
  const [general, setGeneral] = useState({
    dateRequested: isoDate(),
    project: defaultProject || PROJECTS[0].code,
    requestor: requestor || '',
  })
  const [batches, setBatches] = useState([blankBatch()])
  const [deliveries, setDeliveries] = useState([blankDelivery()])
  const [pullOuts, setPullOuts] = useState([blankPullOut()])

  // The single source of truth for batch numbering: position in the list. Adding,
  // duplicating or removing a batch renumbers the rest for free, and nothing downstream
  // holds a number that can go stale.
  const batchRefs = useMemo(
    () => batches.map((b, i) => ({
      key: b.key, no: `${srn}-${i + 1}`,
      description: b.description, qty: b.qty, uom: b.uom, packingType: b.packingType,
    })),
    [batches, srn],
  )
  const noFor = (key) => batchRefs.find((b) => b.key === key)?.no || ''

  /* --- batches --- */
  const updBatch = (key, patch) => setBatches((l) => l.map((b) => (b.key === key ? { ...b, ...patch } : b)))
  const fieldB = (key, k) => (e) => updBatch(key, { [k]: e.target.value })
  const setB_L1 = (key) => (l1) => updBatch(key, { tradeL1: l1, tradeL2: l2For(l1)[0] })
  const setB_Packing = (key) => (type) =>
    updBatch(key, { packingType: type, dimensions: DIMENSIONED_PACKING.includes(type) ? { length: '', width: '', height: '' } : {} })
  const setB_Dim = (key, d) => (e) =>
    setBatches((l) => l.map((b) => (b.key === key ? { ...b, dimensions: { ...b.dimensions, [d]: e.target.value } } : b)))
  const addBatch = () => setBatches((l) => [...l, blankBatch()])
  const dupBatch = (key) => () =>
    setBatches((l) => {
      const i = l.findIndex((b) => b.key === key)
      return [...l.slice(0, i + 1), { ...l[i], key: newKey(), dimensions: { ...l[i].dimensions } }, ...l.slice(i + 1)]
    })
  // Removing a batch also drops it from every delivery and pull-out that referenced it,
  // so no movement is left pointing at material that is no longer on the request.
  const rmBatch = (key) => () => {
    setBatches((l) => (l.length > 1 ? l.filter((b) => b.key !== key) : l))
    if (batches.length > 1) {
      setDeliveries((l) => l.map((d) => ({ ...d, batches: d.batches.filter((k) => k !== key) })))
      setPullOuts((l) => l.map((p) => ({ ...p, batches: p.batches.filter((k) => k !== key) })))
    }
  }
  const unlockB = (key, f) => () =>
    setBatches((l) => l.map((b) => (b.key === key ? { ...b, locked: b.locked.filter((x) => x !== f) } : b)))
  // Typing clears the match, but an item code typed in full still resolves its unit: the
  // warehouse's own sheets know what unit this code has actually been received in, which
  // is better evidence than the master (which carries a UOM on a minority of rows).
  const typeB = (key, k) => (v) => {
    const patch = { [k]: v, matched: false, locked: [] }
    if (k === 'itemCode') {
      const u = uomForItemCode(v.trim())
      if (u) { patch.uom = u; patch.locked = ['uom'] }
    }
    updBatch(key, patch)
  }

  // UOM is resolved from the item code: the sheets first, then the master's own value.
  const resolveUom = (code, masterUom) => uomForItemCode(code) || masterUom || ''

  const pickMaster = (key) => (r) => {
    const locked = ['tradeL1', 'tradeL2']
    const u = resolveUom(r.c, r.u)
    if (u) locked.push('uom')
    updBatch(key, {
      itemCode: r.c, description: r.d, tradeL1: r.t, tradeL2: r.g,
      matched: true, locked, ...(u ? { uom: u } : {}),
    })
  }

  /* --- deliveries / pull-outs --- */
  const updD = (key, patch) => setDeliveries((l) => l.map((d) => (d.key === key ? { ...d, ...patch } : d)))
  const fieldD = (key, k) => (e) => updD(key, { [k]: e.target.value })
  const vehD = (key, k) => (e) =>
    setDeliveries((l) => l.map((d) => (d.key === key ? { ...d, vehicle: { ...d.vehicle, [k]: e.target.value } } : d)))
  const addD = () => setDeliveries((l) => [...l, blankDelivery()])
  const dupD = (key) => () => setDeliveries((l) => {
    const i = l.findIndex((d) => d.key === key)
    return [...l.slice(0, i + 1), { ...l[i], key: newKey(), vehicle: { ...l[i].vehicle }, batches: [...l[i].batches] }, ...l.slice(i + 1)]
  })
  const rmD = (key) => () => setDeliveries((l) => (l.length > 1 ? l.filter((d) => d.key !== key) : l))

  const updP = (key, patch) => setPullOuts((l) => l.map((p) => (p.key === key ? { ...p, ...patch } : p)))
  const fieldP = (key, k) => (e) => updP(key, { [k]: e.target.value })
  const addP = () => setPullOuts((l) => [...l, blankPullOut()])
  const dupP = (key) => () => setPullOuts((l) => {
    const i = l.findIndex((p) => p.key === key)
    return [...l.slice(0, i + 1), { ...l[i], key: newKey(), batches: [...l[i].batches] }, ...l.slice(i + 1)]
  })
  const rmP = (key) => () => setPullOuts((l) => (l.length > 1 ? l.filter((p) => p.key !== key) : l))

  const canSubmit =
    general.project && general.requestor &&
    batches.every((b) => b.itemCode && b.description && b.qty) &&
    deliveries.every((d) => d.deliveryDate && d.batches.length > 0) &&
    pullOuts.every((p) => p.pullOutDate && p.batches.length > 0)

  const submit = (e) => {
    e.preventDefault()
    if (!canSubmit) return
    // Consumes the number this modal only PEEKED at while the form was open, so a
    // cancelled request never burns an SRN — nextSrn() only advances the counter on
    // an actual submission.
    nextSrn()
    addRequest({
      id: `${srn}-${Date.now()}`, srn,
      dateRequested: general.dateRequested, project: general.project, requestor: general.requestor,
      batches, deliveries, pullOuts,
    })
    setSaved(true)
  }

  if (saved) {
    const suppliers = [...new Set(batches.map((b) => b.supplier).filter(Boolean))]
    return (
      <Modal title="Safekeeping Request Submitted" onClose={onClose} footer={<button className="btn btn-primary" onClick={onClose}>Done</button>}>
        <div className="add-done">
          <span className="badge badge-ok add-done-ico"><Icon name="check" size={26} /></span>
          <h3>{srn}</h3>
          <p className="muted">
            {batches.length} batch{batches.length === 1 ? '' : 'es'} · {deliveries.length} deliver{deliveries.length === 1 ? 'y' : 'ies'} · {pullOuts.length} pull-out{pullOuts.length === 1 ? '' : 's'} · {general.project}
            {suppliers.length > 1 && ` · ${suppliers.length} suppliers`}
          </p>
          <p className="faint" style={{ fontSize: 12 }}>Sent for warehouse review and approval. (Prototype — Phase 1)</p>
        </div>
      </Modal>
    )
  }

  return (
    <Modal
      xl title="New Safekeeping Request" onClose={onClose}
      footer={
        <>
          <button className="btn" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" type="submit" form="add-sk" disabled={!canSubmit}>
            <Icon name="check" size={15} /> Submit Request
          </button>
        </>
      }
    >
      <form id="add-sk" onSubmit={submit} className="add-form">
        {/* General spans the full width (it is one short row of request-level facts), then
            two columns below: the batch register on the left, and the two movement sections
            stacked on the right. */}
        <section className="form-section sk-general">
          <h4><Icon name="doc" size={12} /> General</h4>
          {/* Requestor leads the section: it isn't asked for, it's read off the signed-in
              account. Request No./Date follow on the same row, then Project Code and
              Project Name fill the row beneath them — aligned side by side, code first. */}
          <div className="form-grid">
            <AutoField label="Requestor" span="span-2" icon="users" pill="You" mono={false} value={general.requestor} />
            <AutoField label="Safekeeping Request No." value={srn} />
            <DateField label="Date Requested" value={general.dateRequested}
              onChange={(v) => setGeneral((g) => ({ ...g, dateRequested: v }))} required />
            <ProjectSearch value={general.project} onChange={(code) => setGeneral((g) => ({ ...g, project: code }))} />
          </div>
        </section>

        <div className="sk-form-cols">
          <div className="sk-col">
            {/* Item — the batch register. Every batch created here is what the Delivery and
                Pull-out pickers choose from. */}
            <section className="form-section">
              <h4><Icon name="box" size={12} /> Item <span className="sk-h4-note">— each item is a batch</span></h4>
              {batches.map((b, i) => (
                <div key={b.key} className="sk-item-block">
                  <BlockHead mono tag={`${srn}-${i + 1}`} removeLabel={`batch ${i + 1}`}
                    onDuplicate={dupBatch(b.key)} onRemove={batches.length > 1 ? rmBatch(b.key) : null}
                    badge={b.matched ? <span className="form-flag ok"><Icon name="check" size={12} /> Master</span> : null} />
                  <div className="form-grid">
                    <LookupField label="Item Code" icon="inventory" field="c" mono span="span-2"
                      value={b.itemCode} placeholder="e.g. 03-01-050" master={master}
                      onType={typeB(b.key, 'itemCode')} onPick={pickMaster(b.key)} />
                    <LookupField label="Item Description" icon="box" field="d" span="span-2" alignRight
                      value={b.description} placeholder="e.g. Jalousie Window" master={master}
                      onType={typeB(b.key, 'description')} onPick={pickMaster(b.key)} />
                    <div className="field span-4">
                      <label>Detailed Description</label>
                      <div className="lookup-box">
                        <Icon name="doc" size={14} className="lookup-ico" />
                        <input className="input lookup-input" value={b.detailedDescription}
                          onChange={fieldB(b.key, 'detailedDescription')} placeholder="e.g. Jalousie Window 1194 x 3225" />
                      </div>
                    </div>
                    <SelectField label="Trade" icon="layers" span="span-2" value={b.tradeL1} options={TRADE_L1}
                      onChange={setB_L1(b.key)} locked={b.locked.includes('tradeL1')} onUnlock={unlockB(b.key, 'tradeL1')} />
                    <SelectField label="Item Group" icon="folder" span="span-2" alignRight value={b.tradeL2}
                      options={l2For(b.tradeL1).includes(b.tradeL2) ? l2For(b.tradeL1) : [b.tradeL2, ...l2For(b.tradeL1)]}
                      onChange={(v) => updBatch(b.key, { tradeL2: v })}
                      locked={b.locked.includes('tradeL2')} onUnlock={unlockB(b.key, 'tradeL2')} />
                    <SelectField label="UOM" icon="box" span="span-2" value={b.uom}
                      options={UOMS.includes(b.uom) ? UOMS : [b.uom, ...UOMS].filter(Boolean)}
                      onChange={(v) => updBatch(b.key, { uom: v })}
                      locked={b.locked.includes('uom')} onUnlock={unlockB(b.key, 'uom')} />
                    <div className="field span-2"><label>Quantity</label>
                      <input className="input" type="number" min="1" value={b.qty} onChange={fieldB(b.key, 'qty')} placeholder="0" required /></div>
                    <SelectField label="Packing Type" icon="inventory" span="span-2" value={b.packingType}
                      options={PACKING_TYPES} onChange={setB_Packing(b.key)} />
                    <div className="field span-2"><label>Weight <span className="faint">kg</span></label>
                      <input className="input" type="number" min="0" value={b.weight} onChange={fieldB(b.key, 'weight')} placeholder="0" /></div>

                    {DIMENSIONED_PACKING.includes(b.packingType) ? (
                      <>
                        <div className="field"><label>Length (m)</label>
                          <input className="input" type="number" step="0.01" value={b.dimensions.length} onChange={setB_Dim(b.key, 'length')} /></div>
                        <div className="field"><label>Width (m)</label>
                          <input className="input" type="number" step="0.01" value={b.dimensions.width} onChange={setB_Dim(b.key, 'width')} /></div>
                        <div className="field"><label>Height (m)</label>
                          <input className="input" type="number" step="0.01" value={b.dimensions.height} onChange={setB_Dim(b.key, 'height')} /></div>
                        <DateField label="Shelf Life" hint="expiry" value={b.shelfLife} onChange={(v) => updBatch(b.key, { shelfLife: v })} />
                      </>
                    ) : (
                      <>
                        <DateField label="Shelf Life" hint="expiry" span="span-2" value={b.shelfLife} onChange={(v) => updBatch(b.key, { shelfLife: v })} />
                        <div className="field span-2 faint sk-dim-note">
                          {b.packingType} is counted, not crated — no L×W×H needed.
                        </div>
                      </>
                    )}

                    <div className="field span-2">
                      <label>Supplier</label>
                      <div className="lookup-box">
                        <Icon name="truck" size={14} className="lookup-ico" />
                        {/* No suggestion list: the source workbook carries no supplier
                            register, and the four names that were here were invented. */}
                        <input className="input lookup-input" value={b.supplier}
                          onChange={fieldB(b.key, 'supplier')} placeholder="e.g. ABC Trading Corp" />
                      </div>
                    </div>
                    <div className="field span-2">
                      <label>Remarks</label>
                      <div className="lookup-box">
                        <Icon name="edit" size={14} className="lookup-ico" />
                        <input className="input lookup-input" value={b.remarks} onChange={fieldB(b.key, 'remarks')}
                          placeholder="Storage or handling notes" />
                      </div>
                    </div>
                  </div>
                </div>
              ))}
              <button type="button" className="btn btn-sm mt-sm" onClick={addBatch}><Icon name="plus" size={14} /> Add Batch</button>
            </section>
          </div>

          <div className="sk-col">
            {/* Delivery — its own section, each block picking the batches it brings in. */}
            <section className="form-section">
              <h4><Icon name="incoming" size={12} /> Delivery</h4>
              {deliveries.map((d, i) => (
                <div key={d.key} className="sk-item-block">
                  <BlockHead tag={`Delivery ${i + 1}`} removeLabel={`delivery ${i + 1}`}
                    onDuplicate={dupD(d.key)} onRemove={deliveries.length > 1 ? rmD(d.key) : null} />
                  <div className="form-grid">
                    <BatchPicker label="Batches in this delivery" batches={batchRefs} chosen={d.batches}
                      onChange={(next) => updD(d.key, { batches: next })} />
                    <DateField label="Target Delivery Date to CW" span="span-2" required
                      value={d.deliveryDate} onChange={(v) => updD(d.key, { deliveryDate: v })} />
                    <TimeField label="Target Delivery Time to CW" span="span-2" alignRight
                      value={d.deliveryTime} onChange={(v) => updD(d.key, { deliveryTime: v })} />
                    <div className="field span-2"><label>Delivery Contact Person</label>
                      <input className="input" value={d.contactPerson} onChange={fieldD(d.key, 'contactPerson')} /></div>
                    <div className="field span-2"><label>Contact Number</label>
                      <input className="input" value={d.contactNumber} onChange={fieldD(d.key, 'contactNumber')} placeholder="09xxxxxxxxx" /></div>
                    <div className="field span-2"><label>Plate Number</label>
                      <input className="input mono" value={d.vehicle.plateNumber} onChange={vehD(d.key, 'plateNumber')} /></div>
                    <div className="field span-2"><label>Vehicle Type</label>
                      <input className="input" value={d.vehicle.vehicleType} onChange={vehD(d.key, 'vehicleType')} placeholder="e.g. 6-Wheeler Truck" /></div>
                    <div className="field span-2"><label>Vehicle Color</label>
                      <input className="input" value={d.vehicle.vehicleColor} onChange={vehD(d.key, 'vehicleColor')} /></div>
                    <div className="field span-2"><label>Other Vehicle Details</label>
                      <input className="input" value={d.vehicle.otherDetails} onChange={vehD(d.key, 'otherDetails')} /></div>
                    <div className="field span-4">
                      <label>Authorized Delivery Personnel <span className="faint">for gate access</span></label>
                      <input className="input" value={d.deliveryPersonnel} onChange={fieldD(d.key, 'deliveryPersonnel')} placeholder="Names, comma-separated" />
                    </div>
                  </div>
                </div>
              ))}
              <button type="button" className="btn btn-sm mt-sm" onClick={addD}><Icon name="plus" size={14} /> Add Delivery</button>
            </section>

            {/* Pull-out — a separate section from Delivery, never merged with it. */}
            <section className="form-section">
              <h4><Icon name="outgoing" size={12} /> Pull-out</h4>
              {pullOuts.map((p, i) => (
                <div key={p.key} className="sk-item-block">
                  <BlockHead tag={`Pull-out ${i + 1}`} removeLabel={`pull-out ${i + 1}`}
                    onDuplicate={dupP(p.key)} onRemove={pullOuts.length > 1 ? rmP(p.key) : null} />
                  <div className="form-grid">
                    <BatchPicker label="Batches in this pull-out" batches={batchRefs} chosen={p.batches}
                      onChange={(next) => updP(p.key, { batches: next })} />
                    <DateField label="Pull-out Date" span="span-2" required
                      value={p.pullOutDate} onChange={(v) => updP(p.key, { pullOutDate: v })} />
                    <SelectField label="Pull-out Type" icon="outgoing" span="span-2" alignRight value={p.pullOutType}
                      options={['Full', 'Partial']} onChange={(v) => updP(p.key, { pullOutType: v })} />
                    <div className="field span-4">
                      <label>Destination</label>
                      <div className="lookup-box">
                        <Icon name="location" size={14} className="lookup-ico" />
                        <input className="input lookup-input" list="sk-project-list" value={p.destination}
                          onChange={fieldP(p.key, 'destination')} placeholder="Project or site" />
                      </div>
                    </div>
                    <div className="field span-4"><label>Remarks</label>
                      <input className="input" value={p.remarks} onChange={fieldP(p.key, 'remarks')} /></div>
                  </div>
                </div>
              ))}
              <button type="button" className="btn btn-sm mt-sm" onClick={addP}><Icon name="plus" size={14} /> Add Pull-out</button>
            </section>
          </div>

        </div>

        <datalist id="sk-project-list">{PROJECTS.map((p) => <option key={p.code} value={p.code}>{p.name}</option>)}</datalist>
      </form>
    </Modal>
  )
}
