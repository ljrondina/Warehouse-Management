import { SITE_VB, SITE_BOUNDARY, SITE_AREAS, SITE_YARD } from '../../data/warehouseMap'
import PlanDefs from './planDefs'
import PlanText from './planText'

// Level 1 — the stockyard: the property, the shed, and the outdoor material areas
// around it (reference slide 4, site development plan).
//
// Only what holds material is drawn. The deck also marks up car parking, the truck
// queue, canopies, the gate, guard posts and the ingress/egress arrows; all of that is
// vehicle logistics and it crowded out the four areas this level exists to show.

const centreOf = (r) => ({ cx: r.x + r.w / 2, cy: r.y + r.h / 2 })
const pts = (p) => p.map((q) => q.join(',')).join(' ')

// Slide inches -> viewBox units, for the one area the plan draws at an angle (MRF).
const K = SITE_VB.w / 6.271
const toVB = (x, y) => ({ x: (x - 3.535) * K, y: (y - 1.292) * K })

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

      {/* the open yard the deformed-bar and tile bays sit inside */}
      <g className="fp-yard">
        <rect x={SITE_YARD.rect.x} y={SITE_YARD.rect.y} width={SITE_YARD.rect.w} height={SITE_YARD.rect.h} rx="6" />
        <PlanText
          x={SITE_YARD.rect.x + SITE_YARD.rect.w / 2} y={SITE_YARD.rect.y + 15}
          text={SITE_YARD.name.toUpperCase()} maxW={SITE_YARD.rect.w - 16} size={11} cls="fp-yard-t"
        />
      </g>

      {/* material areas */}
      {SITE_AREAS.map((a) => {
        const cls = `fp-area fp-${a.role}${selected === a.id ? ' is-active' : ''}${hovered === a.id ? ' is-hover' : ''}`
        const rot = a.rotRect
        return (
          <g key={a.id} className={cls} {...interact(a)}>
            <title>{a.name}</title>
            {a.poly && <polygon points={pts(a.poly)} />}
            {a.rects.map((r, i) => <rect key={i} x={r.x} y={r.y} width={r.w} height={r.h} rx="5" />)}
            {rot && (() => {
              const c = toVB(rot.cx, rot.cy)
              const rw = rot.w * K
              const rh = rot.h * K
              return (
                <g transform={`translate(${c.x} ${c.y}) rotate(${rot.rot})`}>
                  <rect x={-rw / 2} y={-rh / 2} width={rw} height={rh} rx="5" />
                  {/* wrapped and sized to the box, not to the phrase: at heading size
                      "MATERIAL RECOVERY" alone is wider than the bay it names. */}
                  <PlanText x={0} y={0} text={a.name.toUpperCase()} maxW={rw - 18} size={11} lh={13} cls="fp-area-t fp-t-mrf" />
                </g>
              )
            })()}
          </g>
        )
      })}

      {/* area labels last, so no fill ever lands on top of one */}
      {SITE_AREAS.filter((a) => !a.rotRect).map((a) => {
        const c = centreOf(a.label)
        return (
          <PlanText
            key={a.id}
            x={c.cx} y={c.cy}
            text={a.name.toUpperCase()}
            maxW={Math.min(a.label.w - 12, 175)}
            size={15} lh={18}
            cls={`fp-area-t fp-t-${a.role}`}
            extra={a.drill ? ['click to enter →'] : []}
            extraCls="fp-area-hint"
          />
        )
      })}
    </svg>
  )
}
