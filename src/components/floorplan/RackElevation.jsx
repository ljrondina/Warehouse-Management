import {
  RACKS, CANTILEVER, FLOOR_AREA, BEAM_HEIGHTS, LS600_LEVELS, slotItems,
} from '../../data/warehouseMap'

// Level 3 — RACKING (reference slide 15, "RACKING SYSTEM – FRONT VIEW").
//
// A front elevation of one rack: bays across, levels up. Each cell is a pallet
// position; click it for what the placement puts there. The height axis carries the
// drawing's real beam elevations, so the schematic never has to pretend to scale.

const BAY_W = 92
const PAD = { l: 62, r: 18, t: 26, b: 40 }

// Two states only: a position either holds something (occupied, red) or it does not
// (available, green). The finer low / out-of-stock shading was dropped — on the racking
// view the question is physical occupancy, not stock health.
const cellTone = (list) => (list.length ? 'occupied' : 'available')

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
      {/* level grid lines — the mm elevation labels are gone, so the axis just shows
          the beam levels as structure. */}
      {BEAM_HEIGHTS.map((mm, i) => (
        <g key={mm} className="fp-axis">
          <line x1={PAD.l - 6} y1={yOf(i)} x2={W - PAD.r} y2={yOf(i)} />
        </g>
      ))}

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

  // A 42-bay run scaled to fit the card lands at a third of natural size, where the
  // bay numbers are three pixels wide. Give it a floor of ~26 px per bay and let the
  // stage scroll instead — a long run is long, and shrinking it hides the detail the
  // elevation exists to show.
  const minPx = Math.max(620, bays * 26 + 110)

  return (
    <svg className="fp-elev" viewBox={`0 0 ${W} ${vbH}`} style={{ minWidth: minPx }} role="img" aria-label="Cantilever run front elevation">
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
      <text className="fp-bay-cap" x={PAD.l + (bays * BW) / 2} y={PAD.t + H + 34} textAnchor="middle">BAY</text>
    </svg>
  )
}

/* ------------------------------------------------------- LS600 shelving room */

// One shelving LINE, drawn like a pallet rack but on the LS600 shelf elevations. The
// high-value room holds eight of these — a single against each end wall and three
// back-to-back pairs between — and each is opened on its own, like Racks 1-11.
function ShelvingLine({ rack, selected, onSelect }) {
  const BW = 96
  const W = PAD.l + rack.bays * BW + PAD.r
  const H = 240
  const vbH = PAD.t + H + PAD.b
  const lvlH = H / rack.levels

  return (
    <svg className="fp-elev" viewBox={`0 0 ${W} ${vbH}`} role="img" aria-label={`${rack.name} front elevation`}>
      {LS600_LEVELS.map((mm, i) => (
        <g key={mm} className="fp-axis">
          <line x1={PAD.l - 6} y1={PAD.t + H - i * lvlH} x2={W - PAD.r} y2={PAD.t + H - i * lvlH} />
        </g>
      ))}

      {Array.from({ length: rack.bays }, (_, b) =>
        Array.from({ length: rack.levels }, (_, l) => {
          const bay = b + 1
          const lvl = l + 1
          const list = slotItems(rack.id, bay, lvl)
          const key = `${bay}|${lvl}`
          return (
            <g
              key={key}
              className={`fp-cell is-${cellTone(list)}${selected === key ? ' is-sel' : ''}`}
              role="button" tabIndex={0}
              aria-label={`Bay ${bay} level ${lvl}, ${list.length} material line${list.length === 1 ? '' : 's'}`}
              onClick={() => onSelect(selected === key ? null : key)}
              onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), onSelect(selected === key ? null : key))}
            >
              <title>{`Bay ${bay} · Level ${lvl} — ${list.length} line${list.length === 1 ? '' : 's'}`}</title>
              <rect x={PAD.l + b * BW + 3} y={PAD.t + H - lvl * lvlH} width={BW - 6} height={lvlH - 3} rx="2" />
              {list.length > 0 && (
                <text x={PAD.l + b * BW + BW / 2} y={PAD.t + H - lvl * lvlH + lvlH / 2} textAnchor="middle" dominantBaseline="middle">
                  {list.length}
                </text>
              )}
            </g>
          )
        })
      )}

      {Array.from({ length: rack.bays + 1 }, (_, i) => (
        <rect key={i} className="fp-upright" x={PAD.l + i * BW - 2.5} y={PAD.t - 4} width="5" height={H + 4} rx="1" />
      ))}
      <line className="fp-floorline" x1={PAD.l - 14} y1={PAD.t + H} x2={W - PAD.r + 6} y2={PAD.t + H} />
      {Array.from({ length: rack.bays }, (_, b) => (
        <text key={b} className="fp-bay-n" x={PAD.l + b * BW + BW / 2} y={PAD.t + H + 18} textAnchor="middle">{b + 1}</text>
      ))}
      <text className="fp-bay-cap" x={PAD.l + (rack.bays * BW) / 2} y={PAD.t + H + 34} textAnchor="middle">BAY</text>
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
  const rack = RACKS.find((r) => r.id === rackId)
  if (!rack) return null
  if (rack.kind === 'shelving') return <ShelvingLine rack={rack} selected={selectedCell} onSelect={onSelectCell} />
  return <PalletRack rack={rack} selected={selectedCell} onSelect={onSelectCell} />
}

export { FLOOR_AREA }
