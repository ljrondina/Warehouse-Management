// Shared label helper for the plan SVGs.
//
// A plan is dense: the label of a room, a bay or a rack has to fit inside a box that is
// often narrower than the words. Measuring text in SVG needs a live DOM node, so we
// estimate instead — Montserrat's uppercase advance is close to 0.62 em, plus the
// 0.6 px of letter-spacing the area labels carry.
//
// `size` is authoritative: it drives BOTH the wrap calculation and the rendered
// font-size. It used to drive only the wrap, while the CSS class set the actual size —
// so a label asked to wrap at 9.5 px rendered at 15 px and ran outside its own block.

const CH = 0.62
const TRACK = 0.6 // letter-spacing, in px, on the plan's label classes

export function textWidth(text, size) {
  return String(text).length * (CH * size + TRACK)
}

export function wrapLabel(text, maxW, size) {
  const words = String(text).split(' ')
  const lines = []
  let cur = ''
  for (const w of words) {
    const next = cur ? `${cur} ${w}` : w
    if (cur && textWidth(next, size) > maxW) { lines.push(cur); cur = w } else cur = next
  }
  if (cur) lines.push(cur)
  return lines
}

// Largest size at or below `max` whose longest word still fits `maxW`. Keeps a long
// single word (MATERIAL, ARCHITECTURAL) from hanging out of a narrow block.
export function fitSize(text, maxW, max, min = 6.5) {
  const longest = String(text).split(' ').reduce((a, b) => (b.length > a.length ? b : a), '')
  let s = max
  while (s > min && textWidth(longest, s) > maxW) s -= 0.5
  return s
}

// Icon above a wrapped label, centred as ONE stack.
//
// Both plans used to place the icon and the text independently, each guessing an offset
// from the block's centre — which left the pair sitting high or low depending on how
// many lines the label wrapped to. Measuring the whole stack and centring that is the
// only way the gap between glyph and word stays constant.
export function PlanStack({ x, y, text, maxW, size, icon, iconSize = 0, gap, lh, cls = '', iconCls = '', Icon }) {
  const s = fitSize(text, maxW, size)
  const lines = wrapLabel(text, maxW, s)
  const step = lh || s + 2
  const g = gap ?? Math.max(3, s * 0.45)
  const textH = lines.length * step
  const total = (iconSize > 0 ? iconSize + g : 0) + textH
  const top = y - total / 2
  const textTop = top + (iconSize > 0 ? iconSize + g : 0)
  return (
    <>
      {iconSize > 0 && Icon && (
        <g className={iconCls} transform={`translate(${x - iconSize / 2} ${top})`} pointerEvents="none">
          <Icon name={icon} size={iconSize} />
        </g>
      )}
      <text
        x={x} y={textTop + step / 2} textAnchor="middle" dominantBaseline="middle"
        className={cls} style={{ fontSize: s }} pointerEvents="none"
      >
        {lines.map((l, i) => <tspan key={i} x={x} dy={i === 0 ? 0 : step}>{l}</tspan>)}
      </text>
    </>
  )
}

// Centred, wrapped label. `extra` lines are appended a step smaller beneath it.
export default function PlanText({ x, y, text, maxW, size = 11, lh, cls = '', extra = [], extraCls = '' }) {
  const s = fitSize(text, maxW, size)
  const lines = wrapLabel(text, maxW, s)
  const step = lh || s + 2
  const all = lines.length + extra.length
  const top = -((all - 1) * step) / 2
  return (
    <text
      x={x} y={y} textAnchor="middle" dominantBaseline="middle"
      className={cls} style={{ fontSize: s }} pointerEvents="none"
    >
      {lines.map((l, i) => (
        <tspan key={i} x={x} dy={i === 0 ? top : step}>{l}</tspan>
      ))}
      {extra.map((e, i) => (
        <tspan key={`e${i}`} x={x} dy={step} className={extraCls}>{e}</tspan>
      ))}
    </text>
  )
}
