import { useEffect, useLayoutEffect, useState, useCallback } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useTour } from '../context/TourContext'
import Icon from '../lib/icons'

const PAD = 8

export default function Tour() {
  const { active, step, steps, next, prev, stop, isLast } = useTour()
  const navigate = useNavigate()
  const location = useLocation()
  const [rect, setRect] = useState(null)
  const current = steps[step]

  // Read the target's position only (no scrolling — safe to call on scroll/resize).
  const measure = useCallback(() => {
    if (!current) return
    const el = document.querySelector(`[data-tour="${current.key}"]`)
    if (el) {
      const r = el.getBoundingClientRect()
      setRect({ top: r.top, left: r.left, width: r.width, height: r.height })
    } else {
      setRect(null) // fall back to centered card
    }
  }, [current])

  // On step change: navigate, scroll the target into view once, then measure.
  useEffect(() => {
    if (!active || !current) return
    // Compared against pathname + search, not pathname alone: two steps can share a
    // route and differ only by ?view=, and comparing paths would leave the second one
    // pointing at a card the previous view never mounted.
    const want = current.route ? `${current.route}${current.search || ''}` : null
    if (want && `${location.pathname}${location.search}` !== want) navigate(want, { replace: true })
    const t = setTimeout(() => {
      const el = document.querySelector(`[data-tour="${current.key}"]`)
      if (el) el.scrollIntoView({ block: 'center', behavior: 'smooth' })
      setTimeout(measure, 260)
    }, 380)
    return () => clearTimeout(t)
  }, [active, step, current, location.pathname, location.search, navigate, measure])

  useLayoutEffect(() => {
    if (!active) return
    const h = () => measure()
    window.addEventListener('resize', h)
    window.addEventListener('scroll', h, true)
    return () => { window.removeEventListener('resize', h); window.removeEventListener('scroll', h, true) }
  }, [active, measure])

  if (!active || !current) return null

  const vh = window.innerHeight
  const vw = window.innerWidth
  // Tooltip placement: below the target if room, else above; fall back to center.
  let tipStyle
  if (rect) {
    const below = rect.top + rect.height + 190 < vh
    const left = Math.min(Math.max(rect.left, 16), vw - 360)
    tipStyle = below
      ? { top: rect.top + rect.height + PAD + 6, left }
      : { top: Math.max(rect.top - 190, 16), left }
  } else {
    tipStyle = { top: '50%', left: '50%', transform: 'translate(-50%,-50%)' }
  }

  return (
    <div className="tour-root">
      {/* Spotlight: a transparent hole with a huge shadow dims everything else */}
      {rect ? (
        <div
          className="tour-hole"
          style={{ top: rect.top - PAD, left: rect.left - PAD, width: rect.width + PAD * 2, height: rect.height + PAD * 2 }}
        />
      ) : (
        <div className="tour-dim" />
      )}

      <div className="tour-card" style={tipStyle}>
        <div className="spread" style={{ marginBottom: 8 }}>
          <span className="chip" style={{ background: 'var(--accent-weak)', color: 'var(--brand-red)', border: 'none' }}>Step {step + 1} / {steps.length}</span>
          <button className="icon-btn" onClick={stop} style={{ width: 30, height: 30 }}><Icon name="close" size={15} /></button>
        </div>
        <h3 style={{ fontSize: 17, marginBottom: 6 }}>{current.title}</h3>
        <p className="muted" style={{ margin: 0, fontSize: 13.5, lineHeight: 1.5 }}>{current.body}</p>
        <div className="tour-dots">
          {steps.map((_, i) => <span key={i} className={i === step ? 'on' : ''} />)}
        </div>
        <div className="spread mt-sm">
          <button className="btn btn-sm btn-ghost" onClick={stop}>Skip tour</button>
          <div className="wrap-gap">
            {step > 0 && <button className="btn btn-sm" onClick={prev}>Back</button>}
            <button className="btn btn-sm btn-primary" onClick={isLast ? stop : next}>{isLast ? 'Finish' : 'Next'}</button>
          </div>
        </div>
      </div>
    </div>
  )
}
