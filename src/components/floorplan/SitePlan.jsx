import { SITE_VB, SITE_BOUNDARY, SITE_AREAS, SITE_YARD, SITE_GATES } from '../../data/warehouseMap'
import PlanDefs from './planDefs'
import PlanText from './planText'
import Icon from '../../lib/icons'

// Level 1 — the stockyard: the property, the shed, and the outdoor material areas
// around it (reference slide 4, site development plan).
//
// Only what holds material is drawn, plus the entrance/exit signage. The deck also
// marks up car parking, the truck queue, canopies, guard posts and the ingress/egress
// arrows; all of that is vehicle logistics and it crowded out the four areas this
// level exists to show.

const centreOf = (r) => ({ cx: r.x + r.w / 2, cy: r.y + r.h / 2 })
const pts = (p) => p.map((q) => q.join(',')).join(' ')

// Slide inches -> viewBox units, for the one area the plan draws at an angle (MRF).
const K = SITE_VB.w / 6.271
const toVB = (x, y) => ({ x: (x - 3.535) * K, y: (y - 1.292) * K })

// An icon drawn into the plan, centred on a point. A nested <svg> starts a new
// viewport at the group's origin, so the translate carries the placement.
function PlanIcon({ name, x, y, size = 26 }) {
  return (
    <g transform={`translate(${x - size / 2} ${y - size / 2})`} pointerEvents="none">
      <Icon name={name} size={size} />
    </g>
  )
}

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
              return (
                <g transform={`translate(${c.x} ${c.y}) rotate(${rot.rot})`}>
                  <rect x={-rw / 2} y={-rh / 2} width={rw} height={rh} rx="5" />
                  <rect x={-rw / 2} y={-rh / 2} width={rw} height={rh} rx="5" className="fp-tex" fill={`url(#fpt-${a.role})`} />
                  {/* wrapped and sized to the box, not to the phrase: at heading size
                      "MATERIAL RECOVERY" alone is wider than the bay it names. */}
                  <PlanIcon name={a.icon} x={0} y={-rh / 2 + 17} size={19} />
                  <PlanText x={0} y={5} text={a.name.toUpperCase()} maxW={rw - 20} size={9.5} lh={11} cls="fp-area-t fp-t-mrf" />
                </g>
              )
            })()}
          </g>
        )
      })}

      {/* entrance / exit signage */}
      {SITE_GATES.map((g) => (
        <g key={g.id} className="fp-gate" pointerEvents="none">
          <rect x={g.rect.x} y={g.rect.y} width={g.rect.w} height={g.rect.h} rx="2" />
          <text
            x={g.at[0]} y={g.at[1]} textAnchor="middle" dominantBaseline="middle" className="fp-gate-t"
            transform={g.vertical ? `rotate(-90 ${g.at[0]} ${g.at[1]})` : undefined}
          >{g.label}</text>
        </g>
      ))}

      {/* icons and labels last, so no fill ever lands on top of one */}
      {SITE_AREAS.filter((a) => !a.rotRect).map((a) => {
        const c = centreOf(a.label)
        const lines = a.name.length > 16 ? 2 : 1
        const iconY = c.cy - (lines === 2 ? 32 : 24)
        return (
          <g key={a.id} className={`fp-t-${a.role}`} pointerEvents="none">
            <PlanIcon name={a.icon} x={c.cx} y={iconY} size={a.id === 'warehouse' ? 30 : 24} />
            <PlanText
              x={c.cx} y={c.cy + 6}
              text={a.name.toUpperCase()}
              maxW={Math.min(a.label.w - 12, 175)}
              size={15} lh={18}
              cls={`fp-area-t fp-t-${a.role}`}
              extra={a.drill ? ['click to enter →'] : []}
              extraCls="fp-area-hint"
            />
          </g>
        )
      })}
    </svg>
  )
}
