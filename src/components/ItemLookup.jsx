import { useEffect, useMemo, useState } from 'react'
import { useDropdown } from './Select'
import { fetchAll } from '../lib/hydrate'
import Icon from '../lib/icons'

// Shared item-master typeahead. Extracted from AddMaterialModal so the Safekeeping
// request form gets the SAME control rather than a lookalike — the two forms are both
// "identify a material from the master", and a divergent second implementation is how
// they would drift apart.
const MAX_SUGGESTIONS = 8

// The item master is 7,378 rows and lives in Postgres (public.item_master), not in
// the bundle — this repository is public. It is fetched the first time a form that
// needs it opens, then cached on the module for the rest of the session.
//
// Mapped back to the short keys the lookup fields index on (c = code,
// d = description, t = trade, g = item group, m = material type, u = UOM).
let masterCache = null
let masterPromise = null

function loadItemMaster() {
  masterPromise ??= fetchAll('item_master', 'code')
    .then((rows) => {
      masterCache = rows.map((r) => ({
        c: r.code, d: r.description, t: r.trade_l1,
        g: r.item_group, m: r.material_type, u: r.uom || '',
      }))
      return masterCache
    })
    .catch(() => {
      // Not signed in, offline, or the table is unseeded. Return an empty master so
      // the field degrades to plain typing rather than hanging on a spinner; allow a
      // later retry by clearing the memoised promise.
      masterPromise = null
      return []
    })
  return masterPromise
}

export function useItemMaster() {
  const [master, setMaster] = useState(masterCache)
  useEffect(() => {
    if (masterCache) return
    let alive = true
    loadItemMaster().then((m) => { if (alive) setMaster(m) })
    return () => { alive = false }
  }, [])
  return master
}

// A single lookup field with a suggestion dropdown. `field` selects which side of
// the record is being typed against — the code ('c') or the description ('d') — but
// either one resolves to the same master record and fills the whole form.
// `alignRight` is explicit and defaults to false — callers with more than two fields
// per grid row (this form's batch blocks have several) can't rely on a DOM-position
// parity guess to say which side of the row a field sits on; naming it here is what
// keeps the panel growing back into the row instead of off the container's edge.
export function LookupField({ label, icon, field, value, onType, onPick, master, mono, placeholder, span, alignRight }) {
  const suggestions = useMemo(() => {
    if (!master || !value.trim()) return []
    const q = value.trim().toLowerCase()
    const out = []
    for (const r of master) {
      const i = (field === 'c' ? r.c : r.d).toLowerCase().indexOf(q)
      if (i !== -1) {
        out.push({ r, score: i })
        if (out.length > 400) break
      }
    }
    return out.sort((a, b) => a.score - b.score).slice(0, MAX_SUGGESTIONS).map((o) => o.r)
  }, [master, value, field])

  const dd = useDropdown(suggestions.length)
  useEffect(() => { dd.setActive(0) }, [value])   // eslint-disable-line react-hooks/exhaustive-deps
  const commit = (rec) => { if (rec) { onPick(rec); dd.setOpen(false) } }

  return (
    <div className={`field lookup ${span || ''}`} ref={dd.ref}>
      <label>{label}</label>
      <div className="lookup-box">
        <Icon name={icon} size={14} className="lookup-ico" />
        <input
          className={`input lookup-input ${mono ? 'mono' : ''}`}
          value={value}
          placeholder={master ? placeholder : 'Loading item master…'}
          onChange={(e) => { onType(e.target.value); dd.setOpen(true) }}
          onFocus={() => dd.setOpen(true)}
          onKeyDown={(e) => dd.nav(e, () => commit(suggestions[dd.active] || suggestions[0]))}
          autoComplete="off"
        />
      </div>
      {dd.open && suggestions.length > 0 && (
        <div className={`dd-menu card ${alignRight ? 'align-right' : ''}`}>
          <div className="dd-head"><span>{suggestions.length} match{suggestions.length === 1 ? '' : 'es'}</span><span>↑↓ · Enter</span></div>
          {suggestions.map((r, i) => (
            <button key={r.c} type="button"
              className={`dd-opt ${i === dd.active ? 'active' : ''}`}
              onMouseEnter={() => dd.setActive(i)} onClick={() => commit(r)}>
              <span className="dd-code mono">{r.c}</span>
              <span className="dd-main">
                <span className="dd-label">{r.d}</span>
                <span className="dd-hint">{r.t} › {r.g}</span>
              </span>
              {r.u && <span className="dd-tag">{r.u}</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
