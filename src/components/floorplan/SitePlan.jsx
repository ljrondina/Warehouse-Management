import { SITE_VB, SITE_BOUNDARY, SITE_AREAS, SITE_FACILITIES, SITE_MARKERS, SITE_ROUTES } from '../../data/warehouseMap'
import PlanText from './planText'
import Icon from '../../lib/icons'

// Level 1 — SITE DEVELOPMENT PLAN (reference slide 4).
// The property boundary, the shed, and the outdoor material areas around it. Clicking
// the shed drills into the warehouse plan; clicking an outdoor area selects it.

const centreOf = (r) => ({ cx: r.x + r.w / 2, cy: r.y + r.h / 2 })

// Slide inches -> viewBox units, for the one area the plan draws at an angle (MRF).
const K = SITE_VB.w / 6.271
const toVB = (x, y) => ({ x: (x - 3.535) * K, y: (y - 1.292) * K })

export default function SitePlan({ selected, onSelect, onDrill, hovered, onHover }) {
  const { w, h } = SITE_VB

  return (
    <svg className="fp-svg" viewBox={`0 0 ${w} ${h}`} role="img" aria-label="Central Warehouse Taytay site development plan">
      <defs>
        <pattern id="fp-hatch" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <line x1="0" y1="0" x2="0" y2="8" stroke="currentColor" strokeWidth="1.6" opacity="0.35" />
        </pattern>
        <marker id="fp-arrow-in" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto">
          <path d="M0 0 L10 5 L0 10 z" className="fp-route-in" />
        </marker>
        <marker id="fp-arrow-out" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto">
          <path d="M0 0 L10 5 L0 10 z" className="fp-route-out" />
        </marker>
      </defs>

      {/* property boundary */}
      <polygon className="fp-property" points={SITE_BOUNDARY.map((p) => p.join(',')).join(' ')} />

      {/* yards, parking, canopies — context, not storage */}
      {SITE_FACILITIES.map((f) => (
        <g key={f.id} className={`fp-facility fp-kind-${f.kind}`}>
          <rect x={f.rect.x} y={f.rect.y} width={f.rect.w} height={f.rect.h} rx="3" />
          {f.rect.w > 70 && f.rect.h > 20 && (
            <PlanText
              x={f.rect.x + f.rect.w / 2}
              // The open stock yard's own label is pushed to the top of its box: the
              // rebar and tiles areas sit inside the yard, and a centred label lands
              // straight on top of the Tiles Area name.
              y={f.id === 'yard' ? f.rect.y + 16 : f.rect.y + f.rect.h / 2}
              text={f.name.toUpperCase()}
              maxW={f.rect.w - 8}
              size={11}
              cls="fp-facility-t"
              extra={[f.sub, f.area].filter(Boolean)}
              extraCls="fp-facility-s"
            />
          )}
        </g>
      ))}

      {/* vehicle routes along the south access road */}
      {SITE_ROUTES.map((r) => (
        <line
          key={r.id} x1={r.from[0]} y1={r.from[1]} x2={r.to[0]} y2={r.to[1]}
          className={r.dir === 'in' ? 'fp-route-in' : 'fp-route-out'}
          markerEnd={`url(#fp-arrow-${r.dir})`}
        />
      ))}

      {/* material areas */}
      {SITE_AREAS.map((a) => {
        const active = selected === a.id
        const hov = hovered === a.id
        const rot = a.rotRect
        return (
          <g
            key={a.id}
            className={`fp-area fp-${a.role}${active ? ' is-active' : ''}${hov ? ' is-hover' : ''}`}
            role="button" tabIndex={0} aria-label={a.name}
            onClick={() => (a.drill ? onDrill() : onSelect(a.id))}
            onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), a.drill ? onDrill() : onSelect(a.id))}
            onMouseEnter={() => onHover(a.id)}
            onMouseLeave={() => onHover(null)}
          >
            {a.rects.map((r, i) => <rect key={i} x={r.x} y={r.y} width={r.w} height={r.h} rx="4" />)}
            {rot && (() => {
              const c = toVB(rot.cx, rot.cy)
              const rw = rot.w * K
              const rh = rot.h * K
              return (
                <g transform={`translate(${c.x} ${c.y}) rotate(${rot.rot})`}>
                  <rect x={-rw / 2} y={-rh / 2} width={rw} height={rh} rx="4" />
                  <text x="0" y="0" textAnchor="middle" dominantBaseline="middle" className="fp-area-t">
                    <tspan x="0" dy="-6">MATERIAL RECOVERY</tspan>
                    <tspan x="0" dy="15">FACILITY</tspan>
                  </text>
                </g>
              )
            })()}
          </g>
        )
      })}

      {/* area labels, drawn above every fill so nothing sits on top of them */}
      {SITE_AREAS.filter((a) => !a.rotRect).map((a) => {
        const r = a.label || a.rects[0]
        const c = centreOf(r)
        return (
          <PlanText
            key={a.id}
            x={c.cx} y={c.cy}
            text={a.name.toUpperCase()}
            maxW={Math.min(r.w - 10, 170)}
            size={15} lh={18}
            cls={`fp-area-t fp-t-${a.role}`}
            extra={a.drill ? ['click to enter →'] : []}
            extraCls="fp-area-hint"
          />
        )
      })}

      {/* guard posts */}
      {SITE_MARKERS.map((m) => (
        <g key={m.id} className="fp-marker" transform={`translate(${m.at[0]} ${m.at[1]})`}>
          <circle r="10" />
          <text y="1" textAnchor="middle" dominantBaseline="middle" className="fp-marker-t">G</text>
        </g>
      ))}

      {/* north arrow */}
      <g className="fp-north" transform={`translate(${w - 42} 40)`}>
        <circle r="17" />
        <path d="M0 -11 L5 6 L0 2 L-5 6 Z" />
        <text y="-20" textAnchor="middle" className="fp-north-t">N</text>
      </g>
    </svg>
  )
}

export function SiteLegend() {
  return (
    <div className="fp-legend">
      {SITE_AREAS.map((a) => (
        <span key={a.id} className="fp-legend-i">
          <i className={`fp-swatch fp-sw-${a.role}`} />{a.name}
        </span>
      ))}
      <span className="fp-legend-i muted"><i className="fp-swatch fp-sw-park" />Parking / canopy / yard</span>
      <span className="fp-legend-i muted"><Icon name="location" size={13} /> Guard post</span>
    </div>
  )
}
