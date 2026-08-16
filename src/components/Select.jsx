import { useEffect, useState, useRef } from 'react'
import Icon from '../lib/icons'

// Shared open/close + keyboard plumbing for anything that drops a panel below a
// control. Used by the Add Material lookups and by this Select, so the two behave
// identically — which is the point of them looking identical.
export function useDropdown(itemCount) {
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(0)
  const ref = useRef(null)
  useEffect(() => {
    const h = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])
  const nav = (e, commit) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setOpen(true); setActive((a) => Math.min(a + 1, itemCount - 1)) }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive((a) => Math.max(a - 1, 0)) }
    else if (e.key === 'Enter') { e.preventDefault(); commit() }
    else if (e.key === 'Escape') setOpen(false)
  }
  return { open, setOpen, active, setActive, ref, nav }
}

// Replaces the native <select> with the same panel, rows and highlight used by the
// Add Material suggestion lists.
//
// `options` are plain strings. `placeholder` is the label for the empty value, which
// is how the filter bars express "no filter applied" without a magic sentinel.
// `align="right"` grows the panel leftward from the trigger's right edge instead of
// its left edge — for a control sitting near the right end of a tight row, where a
// left-grown panel would run off the container. The trigger's own width never
// changes either way; only the dropdown panel below it does.
export default function Select({ label, value, options, onChange, placeholder, size, align }) {
  const list = placeholder ? ['', ...options] : options
  const dd = useDropdown(list.length)
  const commit = (v) => { onChange(v); dd.setOpen(false) }
  useEffect(() => {
    if (dd.open) dd.setActive(Math.max(0, list.indexOf(value)))
  }, [dd.open])   // eslint-disable-line react-hooks/exhaustive-deps

  const shown = value || placeholder

  return (
    <div className="field lookup" ref={dd.ref}>
      {label && <label>{label}</label>}
      <button type="button" className={`dd-trigger ${size === 'sm' ? 'sm' : ''} ${dd.open ? 'open' : ''} ${value ? 'set' : ''}`}
        onClick={() => dd.setOpen((o) => !o)}
        onKeyDown={(e) => dd.nav(e, () => commit(list[dd.active]))}>
        <span className="dd-value">{shown}</span>
        <Icon name="chevronDown" size={13} />
      </button>
      {dd.open && (
        <div className={`dd-menu card ${align === 'right' ? 'align-right' : ''}`}>
          {list.map((o, i) => (
            <button key={o || '__all'} type="button"
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
