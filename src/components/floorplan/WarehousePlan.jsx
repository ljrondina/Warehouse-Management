import {
  WH_VB, WH_BUILDING, WH_CANOPY, WH_AREAS, WH_ROOMS, WH_OPEN,
  RACKS, CANTILEVER, FLOOR_AREA, HV_SHELVING, areaCapacity,
} from '../../data/warehouseMap'
import PlanDefs from './planDefs'
import PlanText from './planText'

// Level 2 — WAREHOUSE PLAN, TOP VIEW (reference slide 9), kept in the drawing's own
// portrait orientation so it lines up with the shed on the site plan: rack runs
// standing vertical, entrance on the west wall, loading recess bottom-centre.
//
// The deck highlights each material area as one loose block. We draw the block AND the
// individual rack runs inside it, because a rack is the thing you actually walk to and
// the thing level 3 opens.

const HV_AREA = WH_AREAS.find((a) => a.id === 'highvalue')
const pts = (p) => p.map((q) => q.join(',')).join(' ')

function RackShape({ rack, active, dim, onOpen, onHover }) {
  const r = rack.rect
  // Bay divisions run along the rack's length — vertical in this orientation. They are
  // what makes a run read as racking rather than as a wall.
  const bayH = r.h / rack.bays
  return (
    <g
      className={`fp-rack fp-${rack.area}${active ? ' is-active' : ''}${dim ? ' is-dim' : ''}`}
      role="button" tabIndex={0} aria-label={`${rack.name}, ${rack.bays} bays`}
      onClick={(e) => { e.stopPropagation(); onOpen(rack.id) }}
      onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), onOpen(rack.id))}
      onMouseEnter={() => onHover(rack.area)}
      onMouseLeave={() => onHover(null)}
    >
      <title>{`${rack.name} — ${rack.bays} bays × ${rack.levels} levels`}</title>
      <rect x={r.x} y={r.y} width={r.w} height={r.h} rx="1.5" />
      {Array.from({ length: rack.bays - 1 }, (_, i) => (
        <line key={i} x1={r.x} y1={r.y + (i + 1) * bayH} x2={r.x + r.w} y2={r.y + (i + 1) * bayH} className="fp-bay-div" />
      ))}
      {/* The number sits at the run's head, not its middle: Structural and
          Architectural are each one rack deep, so their area label runs straight
          through the centre of the very rack it names. */}
      <text x={r.x + r.w / 2} y={r.y + 11} textAnchor="middle" dominantBaseline="middle" className="fp-rack-t">
        {rack.n}
      </text>
    </g>
  )
}

export default function WarehousePlan({ selected, onSelect, onOpenRack, hovered, onHover }) {
  const { w, h } = WH_VB
  const b = WH_BUILDING

  return (
    <svg className="fp-svg" viewBox={`0 0 ${w} ${h}`} role="img" aria-label="Central Warehouse Taytay warehouse plan, top view">
      <PlanDefs
        extra={
          <pattern id="fp-secure" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <line x1="0" y1="0" x2="0" y2="7" stroke="currentColor" strokeWidth="1.4" opacity="0.4" />
          </pattern>
        }
      />

      {/* canopy line and building envelope */}
      <rect className="fp-canopy" x={WH_CANOPY.x} y={WH_CANOPY.y} width={WH_CANOPY.w} height={WH_CANOPY.h} />
      <rect className="fp-shell" x={b.x} y={b.y} width={b.w} height={b.h} rx="3" />

      {/* the open floor, as one continuous shape */}
      <g className="fp-open">
        <polygon points={pts(WH_OPEN.poly)} />
        <PlanText
          x={WH_OPEN.label.x + WH_OPEN.label.w / 2} y={WH_OPEN.label.y + WH_OPEN.label.h / 2}
          text={WH_OPEN.name.toUpperCase()} maxW={WH_OPEN.label.w - 16} size={11} cls="fp-open-t"
        />
      </g>

      {/* area hulls — the deck's own highlight blocks, drawn behind the racks */}
      {WH_AREAS.map((a) => {
        const active = selected === a.id
        const hov = hovered === a.id
        return (
          <g
            key={a.id}
            className={`fp-hull fp-${a.role}${active ? ' is-active' : ''}${hov ? ' is-hover' : ''}`}
            role="button" tabIndex={0} aria-label={a.name}
            onClick={() => onSelect(a.id)}
            onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), onSelect(a.id))}
            onMouseEnter={() => onHover(a.id)}
            onMouseLeave={() => onHover(null)}
          >
            <title>{a.name}</title>
            {a.poly
              ? <polygon points={pts(a.poly)} />
              : a.hull.map((r, i) => <rect key={i} x={r.x} y={r.y} width={r.w} height={r.h} rx="4" />)}
            {a.secure && a.hull.map((r, i) => (
              <rect key={`s${i}`} x={r.x} y={r.y} width={r.w} height={r.h} rx="4" fill="url(#fp-secure)" className="fp-secure-fill" />
            ))}
          </g>
        )
      })}

      {/* the safekeeping area's two non-pallet storage forms */}
      <g
        className={`fp-rack fp-safekeeping fp-cant${selected === 'safekeeping' ? ' is-active' : ''}`}
        role="button" tabIndex={0} aria-label="Cantilever run"
        onClick={(e) => { e.stopPropagation(); onOpenRack('CANT') }}
        onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), onOpenRack('CANT'))}
      >
        <title>Cantilever — long goods, {CANTILEVER.bays} bays × {CANTILEVER.arms} arm levels</title>
        <rect x={CANTILEVER.rect.x} y={CANTILEVER.rect.y} width={CANTILEVER.rect.w} height={CANTILEVER.rect.h} rx="1.5" />
        {Array.from({ length: CANTILEVER.bays - 1 }, (_, i) => {
          const step = CANTILEVER.rect.h / CANTILEVER.bays
          return <line key={i} x1={CANTILEVER.rect.x} y1={CANTILEVER.rect.y + (i + 1) * step} x2={CANTILEVER.rect.x + CANTILEVER.rect.w} y2={CANTILEVER.rect.y + (i + 1) * step} className="fp-bay-div" />
        })}
      </g>
      <g
        className={`fp-floorarea${selected === 'safekeeping' ? ' is-active' : ''}`}
        role="button" tabIndex={0} aria-label="Floor Area"
        onClick={(e) => { e.stopPropagation(); onOpenRack('FLOOR') }}
        onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), onOpenRack('FLOOR'))}
      >
        <title>Floor Area — block-stacked goods</title>
        <rect x={FLOOR_AREA.rect.x} y={FLOOR_AREA.rect.y} width={FLOOR_AREA.rect.w} height={FLOOR_AREA.rect.h} rx="3" />
        <text
          x={FLOOR_AREA.rect.x + FLOOR_AREA.rect.w / 2}
          y={FLOOR_AREA.rect.y + FLOOR_AREA.rect.h / 2}
          textAnchor="middle" dominantBaseline="middle" className="fp-floor-t"
          transform={`rotate(-90 ${FLOOR_AREA.rect.x + FLOOR_AREA.rect.w / 2} ${FLOOR_AREA.rect.y + FLOOR_AREA.rect.h / 2})`}
        >FLOOR AREA</text>
      </g>

      {/* rack runs */}
      {RACKS.map((r) => (
        <RackShape
          key={r.id} rack={r}
          active={selected === r.area}
          dim={!!selected && selected !== r.area}
          onOpen={onOpenRack}
          onHover={onHover}
        />
      ))}

      {/* the high-value room's shelving runs */}
      {(() => {
        const r = HV_AREA.hull[0]
        const pad = 10
        const runH = (r.h - pad * 2) / HV_SHELVING.runs
        return (
          <g className="fp-hv-shelves" pointerEvents="none">
            {Array.from({ length: HV_SHELVING.runs }, (_, i) => (
              <rect key={i} x={r.x + pad} y={r.y + pad + i * runH + runH * 0.18} width={r.w - pad * 2} height={runH * 0.64} rx="1.5" />
            ))}
          </g>
        )
      })()}

      {/* rooms and working areas */}
      {WH_ROOMS.map((m) => (
        <g key={m.id} className={`fp-room${m.accent ? ' is-accent' : ''}`}>
          <rect x={m.rect.x} y={m.rect.y} width={m.rect.w} height={m.rect.h} rx="3" />
          <PlanText
            x={m.rect.x + m.rect.w / 2} y={m.rect.y + m.rect.h / 2}
            text={m.name} maxW={m.rect.w - 8} size={10} lh={11.5} cls="fp-room-t"
          />
        </g>
      ))}

      {/* area labels last, so a rack never covers one */}
      {WH_AREAS.map((a) => {
        const r = a.hull[0]
        const cap = areaCapacity(a.id)
        // A tall narrow hull reads its label along its length. The threshold is 2.2
        // rather than 1.4 so the high-value room — 119 x 175, barely oblong — keeps a
        // horizontal label; turning text in a near-square block just looks wrong.
        const vertical = r.h > r.w * 2.2
        const cx = r.x + r.w / 2
        const cy = r.y + r.h / 2
        const along = vertical ? r.h : r.w
        const across = vertical ? r.w : r.h
        // A hull one rack deep (Structural, Architectural) has ~21 units across, so its
        // label has to be small enough to sit on one line inside the run. A hull that
        // stays horizontal is a compact one and wraps to several lines, so it comes
        // down a little too.
        const size = across < 40 ? 12 : vertical ? 15 : 13
        return (
          <g key={a.id} transform={vertical ? `rotate(-90 ${cx} ${cy})` : undefined}>
            <PlanText
              x={cx} y={cy}
              text={a.name.toUpperCase()}
              maxW={along - 14} size={size} lh={size + 2}
              cls={`fp-area-t fp-t-${a.role}`}
              extra={a.id === 'highvalue' ? [`🔒 ${cap.positions} shelf positions`] : []}
              extraCls="fp-area-hint"
            />
          </g>
        )
      })}
    </svg>
  )
}
