// Shared label helper for the plan SVGs.
//
// A plan is dense: the label of a car park, a room or a rack has to sit inside a box
// that is often narrower than the words. Measuring text in SVG needs a live DOM node,
// so we estimate instead — Montserrat's uppercase advance is close enough to 0.62 em
// for a wrap decision, and every caller leaves a little slack. Getting this wrong
// pushes a label out past the drawing edge, which is what it is here to prevent.

const CH = 0.62

export function wrapLabel(text, maxW, size) {
  const words = String(text).split(' ')
  const lines = []
  let cur = ''
  for (const w of words) {
    const next = cur ? `${cur} ${w}` : w
    if (cur && next.length * CH * size > maxW) { lines.push(cur); cur = w } else cur = next
  }
  if (cur) lines.push(cur)
  return lines
}

export const fits = (text, maxW, size) => String(text).length * CH * size <= maxW

// Centred, wrapped label. `extra` lines (an area figure, a hint) are appended in a
// smaller class beneath the wrapped title.
export default function PlanText({ x, y, text, maxW, size = 11, lh, cls = '', extra = [], extraCls = '' }) {
  const lines = wrapLabel(text, maxW, size)
  const step = lh || size + 2
  const all = lines.length + extra.length
  const top = -((all - 1) * step) / 2
  return (
    <text x={x} y={y} textAnchor="middle" dominantBaseline="middle" className={cls} pointerEvents="none">
      {lines.map((l, i) => (
        <tspan key={i} x={x} dy={i === 0 ? top : step}>{l}</tspan>
      ))}
      {extra.map((e, i) => (
        <tspan key={`e${i}`} x={x} dy={step} className={extraCls}>{e}</tspan>
      ))}
    </text>
  )
}
