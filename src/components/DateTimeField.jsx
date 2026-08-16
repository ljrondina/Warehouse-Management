import { useEffect, useMemo, useRef, useState } from 'react'
import { TODAY } from '../lib/format'
import Icon from '../lib/icons'

// Native <input type="date"> renders the OS calendar, which ignores the app's palette
// and looks like a different product bolted on. These two fields keep the value format
// identical to the native inputs they replace ('YYYY-MM-DD' and 'HH:MM'), so nothing
// downstream changes — only the popover is ours.

const WEEKDAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa']
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

const pad2 = (n) => String(n).padStart(2, '0')
const toIso = (y, m, d) => `${y}-${pad2(m + 1)}-${pad2(d)}`
// Parsed as local parts, never `new Date(str)` — that reads a bare date as UTC and lands
// on the previous day in any negative-offset zone.
const parseIso = (s) => {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s || '')
  return m ? { y: +m[1], m: +m[2] - 1, d: +m[3] } : null
}

// Shared open/close plumbing. Not the `useDropdown` from Select.jsx: this popover has no
// linear option list to arrow through — a calendar is two-dimensional.
function usePopover() {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)
  useEffect(() => {
    if (!open) return
    const away = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    const esc = (e) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('mousedown', away)
    document.addEventListener('keydown', esc)
    return () => { document.removeEventListener('mousedown', away); document.removeEventListener('keydown', esc) }
  }, [open])
  return { open, setOpen, ref }
}

export function DateField({ label, value, onChange, span, required, hint, min, alignRight }) {
  const pop = usePopover()
  const sel = parseIso(value)
  const today = { y: TODAY.getFullYear(), m: TODAY.getMonth(), d: TODAY.getDate() }
  const [view, setView] = useState(() => (sel ? { y: sel.y, m: sel.m } : { y: today.y, m: today.m }))

  // Re-centre on the selected month whenever the popover opens, so reopening never
  // strands the user in whatever month they last browsed to.
  useEffect(() => {
    if (pop.open) setView(sel ? { y: sel.y, m: sel.m } : { y: today.y, m: today.m })
  }, [pop.open])   // eslint-disable-line react-hooks/exhaustive-deps

  const grid = useMemo(() => {
    const first = new Date(view.y, view.m, 1).getDay()
    const days = new Date(view.y, view.m + 1, 0).getDate()
    const cells = Array.from({ length: first }, () => null)
    for (let d = 1; d <= days; d++) cells.push(d)
    return cells
  }, [view])

  const minIso = min || null
  const shift = (by) => setView((v) => {
    const m = v.m + by
    return { y: v.y + Math.floor(m / 12), m: ((m % 12) + 12) % 12 }
  })
  const commit = (d) => { onChange(toIso(view.y, view.m, d)); pop.setOpen(false) }

  const display = sel
    ? new Date(sel.y, sel.m, sel.d).toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: 'numeric' })
    : ''

  return (
    <div className={`field lookup ${span || ''}`} ref={pop.ref}>
      {label && <label>{label} {hint && <span className="faint">{hint}</span>}</label>}
      <button type="button" className={`dd-trigger dt-trigger ${pop.open ? 'open' : ''} ${sel ? 'set' : ''}`}
        onClick={() => pop.setOpen((o) => !o)}>
        <Icon name="calendar" size={13} className="dd-lead" />
        <span className={`dd-value ${sel ? '' : 'faint'}`}>{display || 'Select date'}</span>
        {sel && !required && (
          <span className="dt-clear" role="button" tabIndex={-1}
            onClick={(e) => { e.stopPropagation(); onChange('') }} title="Clear">
            <Icon name="close" size={12} />
          </span>
        )}
      </button>

      {pop.open && (
        <div className={`dt-pop card ${alignRight ? 'align-right' : ''}`}>
          <div className="dt-head">
            <button type="button" className="dt-nav" onClick={() => shift(-1)} aria-label="Previous month">
              <Icon name="chevronDown" size={15} style={{ transform: 'rotate(90deg)' }} />
            </button>
            <span className="dt-title">{MONTHS[view.m]} {view.y}</span>
            <button type="button" className="dt-nav" onClick={() => shift(1)} aria-label="Next month">
              <Icon name="chevronDown" size={15} style={{ transform: 'rotate(-90deg)' }} />
            </button>
          </div>
          <div className="dt-grid">
            {WEEKDAYS.map((w) => <span key={w} className="dt-wd">{w}</span>)}
            {grid.map((d, i) => {
              if (d === null) return <span key={`b${i}`} className="dt-cell blank" />
              const iso = toIso(view.y, view.m, d)
              const isSel = sel && sel.y === view.y && sel.m === view.m && sel.d === d
              const isToday = today.y === view.y && today.m === view.m && today.d === d
              const disabled = minIso && iso < minIso
              return (
                <button key={iso} type="button" disabled={disabled}
                  className={`dt-cell ${isSel ? 'sel' : ''} ${isToday ? 'today' : ''}`}
                  onClick={() => commit(d)}>{d}</button>
              )
            })}
          </div>
          <div className="dt-foot">
            <button type="button" className="btn btn-sm"
              onClick={() => { onChange(toIso(today.y, today.m, today.d)); pop.setOpen(false) }}>Today</button>
            {!required && <button type="button" className="btn btn-sm" onClick={() => { onChange(''); pop.setOpen(false) }}>Clear</button>}
          </div>
        </div>
      )}
    </div>
  )
}

// 15-minute slots. A warehouse gate slot is never booked to the minute, and a scrollable
// list of real times is faster to hit than three spinners.
const SLOTS = Array.from({ length: 24 * 4 }, (_, i) => `${pad2(Math.floor(i / 4))}:${pad2((i % 4) * 15)}`)
const pretty = (t) => {
  const m = /^(\d{2}):(\d{2})$/.exec(t || '')
  if (!m) return ''
  const h = +m[1]
  return `${((h + 11) % 12) + 1}:${m[2]} ${h < 12 ? 'AM' : 'PM'}`
}

export function TimeField({ label, value, onChange, span, hint, alignRight }) {
  const pop = usePopover()
  const listRef = useRef(null)

  // Scroll the current (or a sensible default) slot into view on open — otherwise the
  // list always opens at midnight and every delivery time is a scroll away.
  useEffect(() => {
    if (!pop.open || !listRef.current) return
    const target = listRef.current.querySelector('.dt-slot.sel') || listRef.current.querySelector('[data-t="08:00"]')
    if (target) listRef.current.scrollTop = target.offsetTop - 60
  }, [pop.open])

  return (
    <div className={`field lookup ${span || ''}`} ref={pop.ref}>
      {label && <label>{label} {hint && <span className="faint">{hint}</span>}</label>}
      <button type="button" className={`dd-trigger dt-trigger ${pop.open ? 'open' : ''} ${value ? 'set' : ''}`}
        onClick={() => pop.setOpen((o) => !o)}>
        <Icon name="clock" size={13} className="dd-lead" />
        <span className={`dd-value ${value ? '' : 'faint'}`}>{pretty(value) || 'Select time'}</span>
        {value && (
          <span className="dt-clear" role="button" tabIndex={-1}
            onClick={(e) => { e.stopPropagation(); onChange('') }} title="Clear">
            <Icon name="close" size={12} />
          </span>
        )}
      </button>
      {pop.open && (
        <div className={`dt-pop card dt-pop-time ${alignRight ? 'align-right' : ''}`}>
          <div className="dt-slots" ref={listRef}>
            {SLOTS.map((t) => (
              <button key={t} type="button" data-t={t}
                className={`dt-slot ${t === value ? 'sel' : ''}`}
                onClick={() => { onChange(t); pop.setOpen(false) }}>
                <span>{pretty(t)}</span>
                {t === value && <Icon name="check" size={13} />}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
