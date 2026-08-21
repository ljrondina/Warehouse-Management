import { SITE_VB, SITE_BOUNDARY, SITE_AREAS, SITE_YARD } from '../../data/warehouseMap'
import PlanDefs from './planDefs'
import PlanText from './planText'

// Level 1 — the stockyard: the property, the shed, and the outdoor material areas
// around it (reference slide 4, site development plan).
//
// Only what holds material is drawn, plus the entrance/exit signage. The deck also
// marks up car parking, the truck queue, canopies, guard posts and the ingress/egress
// arrows; all of that is vehicle logistics and it crowded out the four areas this
// level exists to show.

const pts = (p) => p.map((q) => q.join(',')).join(' ')

// Slide inches -> viewBox units, for the one area the plan draws at an angle (MRF).
const K = SITE_VB.w / 6.271
const toVB = (x, y) => ({ x: (x - 3.535) * K, y: (y - 1.292) * K })

// An icon drawn into the plan, centred on a point. A nested <svg> starts a new
// viewport at the group's origin, so the translate carries the placement.
export default function SitePlan({ selected, onSelect, onDrill, hovered, onHover }) {
  const { w, h } = SITE_VB

  const interact = (a) => ({
    role: 'button',
    tabIndex: 0,
    'aria-label': a.name,
    onClick: () => (a.drill ? onDrill() : onSelect(a.id)),
    onKeyDown: (e) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), a.drill ? onDrill() : onSelect(a.id)),
    onMouseEnter: () => onHover(a.id),
    onMouseLeave: () => onHover(null),
  })

  return (
    <svg className="fp-svg" viewBox={`0 0 ${w} ${h}`} role="img" aria-label="Central Warehouse Taytay stockyard">
      <PlanDefs />

      <polygon className="fp-property" points={pts(SITE_BOUNDARY)} />

      {/* the open yard the deformed-rebar and tile bays sit inside */}
      <g className="fp-yard">
        <rect x={SITE_YARD.rect.x} y={SITE_YARD.rect.y} width={SITE_YARD.rect.w} height={SITE_YARD.rect.h} rx="6" />
        <PlanText
          x={SITE_YARD.rect.x + SITE_YARD.rect.w / 2} y={SITE_YARD.rect.y + 15}
          text={SITE_YARD.name.toUpperCase()} maxW={SITE_YARD.rect.w - 16} size={11} cls="fp-yard-t"
        />
      </g>

      {/* material areas: fill, then the same shape again as a texture overlay */}
      {SITE_AREAS.map((a) => {
        const cls = `fp-area fp-${a.role}${selected === a.id ? ' is-active' : ''}${hovered === a.id ? ' is-hover' : ''}`
        const rot = a.rotRect
        return (
          <g key={a.id} className={cls} {...interact(a)}>
            <title>{a.name}</title>
            {a.poly && <>
              <polygon points={pts(a.poly)} />
              <polygon points={pts(a.poly)} className="fp-tex" fill={`url(#fpt-${a.role})`} />
            </>}
            {a.rects.map((r, i) => (
              <g key={i}>
                <rect x={r.x} y={r.y} width={r.w} height={r.h} rx="5" />
                <rect x={r.x} y={r.y} width={r.w} height={r.h} rx="5" className="fp-tex" fill={`url(#fpt-${a.role})`} />
              </g>
            ))}
            {rot && (() => {
              const c = toVB(rot.cx, rot.cy)
              const rw = rot.w * K
              const rh = rot.h * K
              // Neither icon nor wordmark — the legend beneath the plan names the
              // area, and the block itself is identified by its colour and its
              // position on the drawing.
              return (
                <g transform={`translate(${c.x} ${c.y}) rotate(${rot.rot})`}>
                  <rect x={-rw / 2} y={-rh / 2} width={rw} height={rh} rx="5" />
                  <rect x={-rw / 2} y={-rh / 2} width={rw} height={rh} rx="5" className="fp-tex" fill={`url(#fpt-${a.role})`} />
                </g>
              )
            })()}
          </g>
        )
      })}
    </svg>
  )
}
