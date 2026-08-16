import {
  RACKS, CANTILEVER, FLOOR_AREA, HV_SHELVING, BEAM_HEIGHTS, FRAME_HEIGHT,
  RACK_TYPES, LS600_LEVELS, slotItems, AREA_BY_ID,
} from '../../data/warehouseMap'
import { num } from '../../lib/format'

// Level 3 — RACKING (reference slide 15, "RACKING SYSTEM – FRONT VIEW").
//
// A front elevation of one rack: bays across, levels up. Each cell is a pallet
// position; click it for what the placement puts there. The height axis carries the
// drawing's real beam elevations, so the schematic never has to pretend to scale.

const BAY_W = 92
const PAD = { l: 62, r: 18, t: 26, b: 40 }

const cellTone = (list) => {
  if (!list.length) return 'empty'
  if (list.some((i) => i.stockStatus === 'Out of Stock')) return 'out'
  if (list.some((i) => i.stockStatus === 'Low')) return 'low'
  return 'full'
}

/* ------------------------------------------------------ selective pallet rack */

function PalletRack({ rack, selected, onSelect }) {
  // The four beam elevations are real; the top tier is drawn at the same clear height
  // as the one below it, because a pallet on the top beam stands above the frame and
  // the drawing gives no dimension for it.
  const gaps = BEAM_HEIGHTS.slice(1).map((v, i) => v - BEAM_HEIGHTS[i])
  const clear = [...gaps, gaps[gaps.length - 1]]
  const totalMm = clear.reduce((a, b) => a + b, 0)
  const H = 300
  const mm2px = H / totalMm

  const W = PAD.l + rack.bays * BAY_W + PAD.r
  const vbH = PAD.t + H + PAD.b

  // y of the bottom of level `lvl` (1-based), measured from the floor line.
  const yOf = (lvl) => PAD.t + H - clear.slice(0, lvl).reduce((a, b) => a + b, 0) * mm2px

  return (
    <svg className="fp-elev" viewBox={`0 0 ${W} ${vbH}`} role="img" aria-label={`${rack.name} front elevation`}>
      {/* height axis with the drawing's beam elevations */}
      {BEAM_HEIGHTS.map((mm, i) => (
        <g key={mm} className="fp-axis">
          <line x1={PAD.l - 6} y1={yOf(i)} x2={W - PAD.r} y2={yOf(i)} />
          <text x={PAD.l - 10} y={yOf(i) + 3} textAnchor="end">{mm === 0 ? 'FFL' : num(mm)}</text>
        </g>
      ))}
      <text className="fp-axis-cap" x={PAD.l - 10} y={PAD.t - 10} textAnchor="end">mm</text>

      {/* bays x levels */}
      {Array.from({ length: rack.bays }, (_, b) =>
        Array.from({ length: rack.levels }, (_, l) => {
          const bay = b + 1
          const lvl = l + 1
          const list = slotItems(rack.id, bay, lvl)
          const key = `${bay}|${lvl}`
          const y = yOf(lvl)
          const hgt = clear[l] * mm2px
          return (
            <g
              key={key}
              className={`fp-cell is-${cellTone(list)}${selected === key ? ' is-sel' : ''}`}
              role="button" tabIndex={0}
              aria-label={`Bay ${bay} level ${lvl}, ${list.length} material line${list.length===1?'':'s'}`}
              onClick={() => onSelect(selected === key ? null : key)}
              onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), onSelect(selected === key ? null : key))}
            >
              <title>{`Bay ${bay} · Level ${lvl} — ${list.length} line${list.length === 1 ? '' : 's'}`}</title>
              <rect x={PAD.l + b * BAY_W + 3} y={y} width={BAY_W - 6} height={hgt - 3} rx="2" />
              {list.length > 0 && (
                <text x={PAD.l + b * BAY_W + BAY_W / 2} y={y + hgt / 2} textAnchor="middle" dominantBaseline="middle">
                  {list.length}
                </text>
              )}
            </g>
          )
        })
      )}

      {/* uprights */}
      {Array.from({ length: rack.bays + 1 }, (_, i) => (
        <rect key={i} className="fp-upright" x={PAD.l + i * BAY_W - 2.5} y={PAD.t - 4} width="5" height={H + 4} rx="1" />
      ))}
      <line className="fp-floorline" x1={PAD.l - 14} y1={PAD.t + H} x2={W - PAD.r + 6} y2={PAD.t + H} />

      {/* bay numbers */}
      {Array.from({ length: rack.bays }, (_, b) => (
        <text key={b} className="fp-bay-n" x={PAD.l + b * BAY_W + BAY_W / 2} y={PAD.t + H + 18} textAnchor="middle">
          {b + 1}
        </text>
      ))}
      <text className="fp-bay-cap" x={PAD.l + (rack.bays * BAY_W) / 2} y={PAD.t + H + 34} textAnchor="middle">BAY</text>
    </svg>
  )
}

/* ------------------------------------------------------------- cantilever run */

function CantileverRack({ selected, onSelect }) {
  const bays = CANTILEVER.bays
  const arms = CANTILEVER.arms
  const BW = 54
  const W = PAD.l + bays * BW + PAD.r
  const H = 220
  const vbH = PAD.t + H + PAD.b
  const armH = H / arms

  return (
    <svg className="fp-elev" viewBox={`0 0 ${W} ${vbH}`} role="img" aria-label="Cantilever run front elevation">
      {Array.from({ length: arms }, (_, a) => (
        <g key={a} className="fp-axis">
          <line x1={PAD.l - 6} y1={PAD.t + H - a * armH} x2={W - PAD.r} y2={PAD.t + H - a * armH} />
          <text x={PAD.l - 10} y={PAD.t + H - a * armH + 3} textAnchor="end">{a === 0 ? 'FFL' : `Arm ${a}`}</text>
        </g>
      ))}
      {Array.from({ length: bays }, (_, b) =>
        Array.from({ length: arms }, (_, a) => {
          const bay = b + 1
          const arm = a + 1
          const list = slotItems('CANT', bay, arm)
          const key = `${bay}|${arm}`
          return (
            <g
              key={key}
              className={`fp-cell is-${cellTone(list)}${selected === key ? ' is-sel' : ''}`}
              role="button" tabIndex={0} aria-label={`Bay ${bay} arm ${arm}, ${list.length} line${list.length===1?'':'s'}`}
              onClick={() => onSelect(selected === key ? null : key)}
              onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), onSelect(selected === key ? null : key))}
            >
              <title>{`Bay ${bay} · Arm ${arm} — ${list.length} line${list.length === 1 ? '' : 's'}`}</title>
              <rect x={PAD.l + b * BW + 2} y={PAD.t + H - arm * armH} width={BW - 4} height={armH - 3} rx="2" />
              {list.length > 0 && (
                <text x={PAD.l + b * BW + BW / 2} y={PAD.t + H - arm * armH + armH / 2} textAnchor="middle" dominantBaseline="middle">
                  {list.length}
                </text>
              )}
            </g>
          )
        })
      )}
      {Array.from({ length: bays + 1 }, (_, i) => (
        <rect key={i} className="fp-upright" x={PAD.l + i * BW - 2} y={PAD.t - 4} width="4" height={H + 4} rx="1" />
      ))}
      <line className="fp-floorline" x1={PAD.l - 14} y1={PAD.t + H} x2={W - PAD.r + 6} y2={PAD.t + H} />
      {Array.from({ length: bays }, (_, b) => (
        <text key={b} className="fp-bay-n" x={PAD.l + b * BW + BW / 2} y={PAD.t + H + 18} textAnchor="middle">{b + 1}</text>
      ))}
      <text className="fp-bay-cap" x={PAD.l + (bays * BW) / 2} y={PAD.t + H + 34} textAnchor="middle">BAY · 900 mm CENTRES</text>
    </svg>
  )
}

/* ------------------------------------------------------- LS600 shelving room */

function ShelvingRoom({ selected, onSelect }) {
  const { runs, bays, levels } = HV_SHELVING
  const BW = 78
  const runGap = 26
  const runW = bays * BW
  const W = PAD.l + runs * runW + (runs - 1) * runGap + PAD.r
  const H = 190
  const vbH = PAD.t + H + PAD.b + 12
  const lvlH = H / levels

  return (
    <svg className="fp-elev" viewBox={`0 0 ${W} ${vbH}`} role="img" aria-label="LS600 shelving front elevation">
      {LS600_LEVELS.map((mm, i) => (
        <g key={mm} className="fp-axis">
          <line x1={PAD.l - 6} y1={PAD.t + H - i * lvlH} x2={W - PAD.r} y2={PAD.t + H - i * lvlH} />
          <text x={PAD.l - 10} y={PAD.t + H - i * lvlH + 3} textAnchor="end">{i === 0 ? 'FFL' : num(LS600_LEVELS[i - 1])}</text>
        </g>
      ))}
      {Array.from({ length: runs }, (_, r) => {
        const x0 = PAD.l + r * (runW + runGap)
        return (
          <g key={r}>
            {Array.from({ length: bays }, (_, b) =>
              Array.from({ length: levels }, (_, l) => {
                const bay = b + 1
                const lvl = l + 1
                const rid = `HV${r + 1}`
                const list = slotItems(rid, bay, lvl)
                const key = `${rid}:${bay}|${lvl}`
                return (
                  <g
                    key={key}
                    className={`fp-cell is-${cellTone(list)}${selected === key ? ' is-sel' : ''}`}
                    role="button" tabIndex={0} aria-label={`Run ${r + 1} bay ${bay} level ${lvl}, ${list.length} line${list.length===1?'':'s'}`}
                    onClick={() => onSelect(selected === key ? null : key)}
                    onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), onSelect(selected === key ? null : key))}
                  >
                    <title>{`Run ${r + 1} · Bay ${bay} · Level ${lvl} — ${list.length} line${list.length === 1 ? '' : 's'}`}</title>
                    <rect x={x0 + b * BW + 2} y={PAD.t + H - lvl * lvlH} width={BW - 4} height={lvlH - 3} rx="2" />
                    {list.length > 0 && (
                      <text x={x0 + b * BW + BW / 2} y={PAD.t + H - lvl * lvlH + lvlH / 2} textAnchor="middle" dominantBaseline="middle">
                        {list.length}
                      </text>
                    )}
                  </g>
                )
              })
            )}
            {Array.from({ length: bays + 1 }, (_, i) => (
              <rect key={i} className="fp-upright" x={x0 + i * BW - 2} y={PAD.t - 4} width="4" height={H + 4} rx="1" />
            ))}
            <text className="fp-bay-cap" x={x0 + runW / 2} y={PAD.t + H + 32} textAnchor="middle">RUN {r + 1}</text>
            {Array.from({ length: bays }, (_, b) => (
              <text key={b} className="fp-bay-n" x={x0 + b * BW + BW / 2} y={PAD.t + H + 17} textAnchor="middle">{b + 1}</text>
            ))}
          </g>
        )
      })}
      <line className="fp-floorline" x1={PAD.l - 14} y1={PAD.t + H} x2={W - PAD.r + 6} y2={PAD.t + H} />
    </svg>
  )
}

/* ---------------------------------------------------------------- floor area */

function FloorStack({ count }) {
  // Block-stacked goods have no bay grid to draw. A row of stacks with the line count
  // says what there is to say without inventing positions the drawing does not have.
  const blocks = Math.min(count, 28)
  return (
    <svg className="fp-elev fp-floorplanview" viewBox="0 0 560 180" role="img" aria-label="Floor area block stacking">
      <line className="fp-floorline" x1="20" y1="140" x2="540" y2="140" />
      {Array.from({ length: blocks }, (_, i) => {
        const col = i % 14
        const row = Math.floor(i / 14)
        const w = 32
        const hgt = 26 + ((i * 7) % 18)
        return (
          <rect key={i} className="fp-stack" x={26 + col * 36} y={140 - hgt - row * 46} width={w} height={hgt} rx="2" />
        )
      })}
      <text className="fp-bay-cap" x="280" y="166" textAnchor="middle">BLOCK-STACKED ON THE OPEN FLOOR — NO FIXED BAYS</text>
    </svg>
  )
}

/* -------------------------------------------------------------------- shell */

export default function RackElevation({ rackId, selectedCell, onSelectCell, floorCount }) {
  if (rackId === 'FLOOR') return <FloorStack count={floorCount} />
  if (rackId === 'CANT') return <CantileverRack selected={selectedCell} onSelect={onSelectCell} />
  if (rackId === 'HV') return <ShelvingRoom selected={selectedCell} onSelect={onSelectCell} />
  const rack = RACKS.find((r) => r.id === rackId)
  if (!rack) return null
  return <PalletRack rack={rack} selected={selectedCell} onSelect={onSelectCell} />
}

// Specification strip under the elevation — every figure is off the reference drawing.
export function RackSpec({ rackId }) {
  if (rackId === 'FLOOR') {
    return (
      <div className="fp-spec">
        <span><b>Storage</b> Block stacked</span>
        <span><b>Area</b> Safekeeping open floor</span>
        <span><b>Handling</b> Forklift / pallet truck</span>
      </div>
    )
  }
  if (rackId === 'CANT') {
    return (
      <div className="fp-spec">
        <span><b>System</b> Cantilever</span>
        <span><b>Upright</b> {num(CANTILEVER.upright)} mm</span>
        <span><b>Bay centre</b> {num(CANTILEVER.bayCentre)} mm</span>
        <span><b>Arm length</b> {num(CANTILEVER.armLength)} mm</span>
        <span><b>Arm load</b> {num(CANTILEVER.armLoad)} kg</span>
        <span><b>Positions</b> {num(CANTILEVER.positions)}</span>
      </div>
    )
  }
  if (rackId === 'HV') {
    return (
      <div className="fp-spec">
        <span><b>System</b> LS600 boltless shelving</span>
        <span><b>Frame</b> {num(HV_SHELVING.frameHeight)} mm</span>
        <span><b>Bay</b> {num(HV_SHELVING.bayWidth)} mm</span>
        <span><b>Layout</b> {HV_SHELVING.runs} runs × {HV_SHELVING.bays} bays × {HV_SHELVING.levels} levels</span>
        <span><b>Positions</b> {num(HV_SHELVING.positions)}</span>
      </div>
    )
  }
  const rack = RACKS.find((r) => r.id === rackId)
  if (!rack) return null
  const t = RACK_TYPES[rack.type]
  return (
    <div className="fp-spec">
      <span><b>System</b> Interlock 600 selective</span>
      <span><b>Rack type</b> {t.label} · {num(t.bayCentre)} mm centres</span>
      <span><b>Frame</b> {num(FRAME_HEIGHT)} mm</span>
      <span><b>Bay load</b> {num(t.bayLoad)} kg</span>
      <span><b>Layout</b> {rack.bays} bays × {rack.levels} levels</span>
      <span><b>Positions</b> {num(rack.positions)}</span>
      <span><b>Area</b> {AREA_BY_ID[rack.area].short}</span>
    </div>
  )
}

export { FLOOR_AREA }
