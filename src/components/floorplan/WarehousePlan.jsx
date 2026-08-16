import {
  WH_VB, WH_BUILDING, WH_CANOPY, WH_AREAS, WH_ROOMS, WH_OPEN,
  RACKS, CANTILEVER, FLOOR_AREA, HV_SHELVING, areaCapacity,
} from '../../data/warehouseMap'
import PlanText from './planText'

// Level 2 — WAREHOUSE PLAN, TOP VIEW (reference slide 9), presented in the same
// rotation the deck uses: office end on the left, rack runs reading left to right.
//
// The deck highlights each material area as one loose block. We draw the block AND
// the individual rack runs inside it, because a rack is the thing you actually go to
// and the thing level 3 opens.

const HV_AREA = WH_AREAS.find((a) => a.id === 'highvalue')

function RackShape({ rack, active, dim, onOpen, onHover }) {
  const r = rack.rect
  // Bay divisions run along the rack's length, which after the 90° rotation is the
  // horizontal axis. They are what makes a run read as racking rather than a wall.
  const bayW = r.w / rack.bays
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
        <line key={i} x1={r.x + (i + 1) * bayW} y1={r.y} x2={r.x + (i + 1) * bayW} y2={r.y + r.h} className="fp-bay-div" />
      ))}
      {/* The number sits at the run's head, not its middle: Structural and
          Architectural are each one rack deep, so their area label runs straight
          through the centre of the very rack it names. */}
      <text x={r.x + 11} y={r.y + r.h / 2 + 0.5} textAnchor="middle" dominantBaseline="middle" className="fp-rack-t">
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
      <defs>
        <pattern id="fp-secure" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <line x1="0" y1="0" x2="0" y2="7" stroke="currentColor" strokeWidth="1.4" opacity="0.4" />
        </pattern>
      </defs>

      {/* canopy line and building envelope */}
      <rect className="fp-canopy" x={WH_CANOPY.x} y={WH_CANOPY.y} width={WH_CANOPY.w} height={WH_CANOPY.h} />
      <rect className="fp-shell" x={b.x} y={b.y} width={b.w} height={b.h} rx="3" />

      {/* open floor, with the areas the drawing states */}
      {WH_OPEN.map((o) => (
        <g key={o.id} className="fp-open">
          <rect x={o.rect.x} y={o.rect.y} width={o.rect.w} height={o.rect.h} />
          <PlanText
            x={o.rect.x + o.rect.w / 2} y={o.rect.y + o.rect.h / 2}
            text={o.name.toUpperCase()} maxW={o.rect.w - 10} size={11}
            cls="fp-open-t" extra={[`A = ${o.area}`]} extraCls="fp-open-s"
          />
        </g>
      ))}

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
            {a.hull.map((r, i) => <rect key={i} x={r.x} y={r.y} width={r.w} height={r.h} rx="4" />)}
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
          const step = CANTILEVER.rect.w / CANTILEVER.bays
          return <line key={i} x1={CANTILEVER.rect.x + (i + 1) * step} y1={CANTILEVER.rect.y} x2={CANTILEVER.rect.x + (i + 1) * step} y2={CANTILEVER.rect.y + CANTILEVER.rect.h} className="fp-bay-div" />
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
        const runW = (r.w - pad * 2) / HV_SHELVING.runs
        return (
          <g className="fp-hv-shelves" pointerEvents="none">
            {Array.from({ length: HV_SHELVING.runs }, (_, i) => (
              <rect key={i} x={r.x + pad + i * runW + runW * 0.18} y={r.y + pad} width={runW * 0.64} height={r.h - pad * 2} rx="1.5" />
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
            text={m.name} maxW={m.rect.w - 8} size={10} lh={11.5}
            cls="fp-room-t" extra={m.area ? [m.area] : []} extraCls="fp-room-s"
          />
        </g>
      ))}

      {/* area labels last, so a rack never covers one */}
      {WH_AREAS.map((a) => {
        const r = a.hull[0]
        const cap = areaCapacity(a.id)
        // A tall narrow hull (Structural and Architectural are one rack deep) reads
        // its label along its length, so those two turn with the run.
        const vertical = r.h > r.w * 1.4
        const cx = r.x + r.w / 2
        const cy = r.y + r.h / 2
        const along = vertical ? r.h : r.w
        return (
          <g key={a.id} transform={vertical ? `rotate(-90 ${cx} ${cy})` : undefined}>
            <PlanText
              x={cx} y={cy}
              text={a.name.toUpperCase()}
              maxW={along - 12} size={15} lh={17}
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

export function WarehouseLegend() {
  return (
    <div className="fp-legend">
      {WH_AREAS.map((a) => (
        <span key={a.id} className="fp-legend-i">
          <i className={`fp-swatch fp-sw-${a.role}`} />{a.name}
        </span>
      ))}
      <span className="fp-legend-i muted"><i className="fp-swatch fp-sw-room" />Rooms · bays · open floor</span>
    </div>
  )
}
