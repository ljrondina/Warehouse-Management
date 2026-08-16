import {
  ResponsiveContainer, ComposedChart, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Cell, LabelList,
  PieChart, Pie, AreaChart, Area, Line, ReferenceLine, ReferenceArea,
} from 'recharts'
import { useLayoutEffect, useRef, useState } from 'react'
import { num, peso, compact } from '../lib/format'
import { BRAND, barsFor, categoricalFor, movementFor, seriesFor } from '../lib/colors'
import { useTheme } from '../context/ThemeContext'

const axis = { fontSize: 11, fill: 'var(--text-muted)', fontWeight: 600 }
const gridColor = 'var(--border)'

const fmt = (metric) => (v) => (metric === 'value' ? `₱${compact(v)}` : compact(v))

// Recharts only renders elements it recognises among a chart's direct children —
// a custom component wrapper is silently dropped, taking its <defs> with it and
// leaving every `url(#…)` fill pointing at nothing (i.e. an invisible chart). So
// the gradient stops are built as a plain array and spread into a LITERAL <defs>
// at each call site rather than being wrapped in a component.
//
// The fade floor stays high on dark surfaces: a 0.5-opacity fill over #231F20 sinks
// into the card and was a large part of why slices read as "barely visible".
const paletteStops = (prefix, palette, dark) =>
  palette.map((c, i) => (
    <linearGradient key={`${prefix}-${i}`} id={`${prefix}-${i}`} x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stopColor={c} stopOpacity={1} />
      <stop offset="40%" stopColor={c} stopOpacity={dark ? 0.95 : 0.85} />
      <stop offset="100%" stopColor={c} stopOpacity={dark ? 0.82 : 0.5} />
    </linearGradient>
  ))

// Legend swatch shaped after how each series is actually drawn, so the legend can be
// read as "how do I find this on the chart" rather than just "which colour is which".
// Four shapes cover the chart's three geometries:
//   line   — Total: a solid stroke with a point marker, matching its solid Line.
//   dashed — Damaged: an unfilled, dash-bordered square — its Line is the only
//            dashed/no-fill stroke on the chart, so the swatch mirrors that exactly
//            rather than reusing the solid-fill square everything else gets.
//   area   — Available/Reserved: a filled square, matching their solid Area fill.
//   bar    — Incoming/Outgoing: a small bar-chart glyph, distinct from the plain
//            filled square so a Bar reads differently from an Area at a glance.
function LegendSwatch({ kind, color }) {
  if (kind === 'line') {
    return (
      <svg width="18" height="12" viewBox="0 0 18 12" className="cl-swatch" aria-hidden="true">
        <line x1="1" y1="6" x2="17" y2="6" stroke={color} strokeWidth="2.4" strokeLinecap="round" />
        <circle cx="9" cy="6" r="2.6" fill={color} />
      </svg>
    )
  }
  if (kind === 'dashed') {
    return (
      <svg width="18" height="12" viewBox="0 0 18 12" className="cl-swatch" aria-hidden="true">
        <rect x="2" y="1.5" width="14" height="9" rx="2" fill="none" stroke={color} strokeWidth="1.8" strokeDasharray="3 2.2" />
      </svg>
    )
  }
  if (kind === 'bar') {
    return (
      <svg width="18" height="12" viewBox="0 0 18 12" className="cl-swatch" aria-hidden="true">
        <rect x="1.5" y="6" width="3.4" height="5.5" rx="0.8" fill={color} />
        <rect x="7.3" y="2.5" width="3.4" height="9" rx="0.8" fill={color} />
        <rect x="13.1" y="4.5" width="3.4" height="7" rx="0.8" fill={color} />
      </svg>
    )
  }
  return (
    <svg width="18" height="12" viewBox="0 0 18 12" className="cl-swatch" aria-hidden="true">
      <rect x="2" y="1.5" width="14" height="9" rx="2" fill={color} />
    </svg>
  )
}

function Box({ children }) {
  return (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, padding: '10px 12px', boxShadow: 'var(--shadow-lg)', fontSize: 12 }}>
      {children}
    </div>
  )
}

// Truncated x-axis label with full text on hover (SVG <title>).
function BarTick({ x, y, payload }) {
  const full = String(payload.value)
  const short = full.length > 12 ? full.slice(0, 11) + '…' : full
  return (
    <g transform={`translate(${x},${y})`}>
      <title>{full}</title>
      <text dy={14} textAnchor="middle" fontSize={11} fontWeight={600} fill="var(--text-muted)">{short}</text>
    </g>
  )
}

/* Trade bar chart with value labels ("values at a glance"). Used by Reports. */
export function CategoryChart({ data, metric = 'qty' }) {
  const { theme } = useTheme()
  const PALETTE = categoricalFor(theme)
  const key = metric === 'value' ? 'value' : 'qty'
  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={data} margin={{ top: 28, right: 20, bottom: 24, left: 12 }} barCategoryGap="26%">
        <defs>{paletteStops('barGrad', PALETTE, theme === 'dark')}</defs>
        <CartesianGrid vertical={false} stroke={gridColor} strokeDasharray="3 3" />
        <XAxis dataKey="name" tick={<BarTick />} tickLine={false} axisLine={{ stroke: gridColor }} interval={0} height={40} />
        <YAxis tick={axis} tickLine={false} axisLine={false} tickFormatter={fmt(metric)} width={54} />
        <Tooltip
          cursor={{ fill: 'var(--surface-2)', radius: 6 }}
          content={({ active, payload, label }) =>
            active && payload?.length ? (
              <Box>
                <div style={{ fontWeight: 700, marginBottom: 4 }}>{label}</div>
                <div>{num(payload[0].payload.qty)} units</div>
                <div className="muted">{peso(payload[0].payload.value)}</div>
                <div className="faint" style={{ fontSize: 11 }}>{payload[0].payload.count} SKUs · {(metric === 'value' ? payload[0].payload.valueShare : payload[0].payload.share).toFixed(1)}%</div>
              </Box>
            ) : null
          }
        />
        <Bar dataKey={key} radius={[8, 8, 0, 0]} maxBarSize={64} isAnimationActive={false}>
          {data.map((_, i) => <Cell key={i} fill={`url(#barGrad-${i % PALETTE.length})`} />)}
          <LabelList dataKey={key} position="top" formatter={fmt(metric)} style={{ fontSize: 11, fontWeight: 800, fill: 'var(--text)' }} />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}

// Tracks an element's rendered width. Only the leader-line donut needs it (its ring
// is sized to leave room for the labels), so `enabled` keeps every other chart from
// paying for an observer it will never read.
function useElementWidth(ref, enabled) {
  const [width, setWidth] = useState(0)
  useLayoutEffect(() => {
    if (!enabled || !ref.current) return
    const el = ref.current
    const ro = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width))
    ro.observe(el)
    setWidth(el.getBoundingClientRect().width)
    return () => ro.disconnect()
  }, [ref, enabled])
  return width
}

// ---------------------------------------------------------------------------
// Leader-line labels for the distribution donut.
//
// Recharts' own `label`/`labelLine` places each label independently, so on a 9-slice
// donut the thin slices stack their text on top of each other and the card becomes
// unreadable. This lays the labels out as a whole instead: every label is projected
// onto its slice's mid-angle, split into a left and a right column, then pushed apart
// to a minimum spacing and clamped inside the chart box.
//
// To do that the geometry has to be known BEFORE recharts renders, which means the
// pie's angles must be deterministic. Hence the fixed startAngle/endAngle (90 → -270,
// i.e. clockwise from twelve o'clock) and paddingAngle={0} at the call site: with a
// padding angle recharts redistributes the sweep and these mid-angles would drift off
// their slices. Slice separation comes from the stroke instead.
const RAD = Math.PI / 180

// Leader labels have to work on a 320px phone as well as a 780px card, so every
// dimension is picked from the measured chart width rather than fixed. Each tier
// trades ring size against the room the two text columns need: shrink the ring and
// the labels get their width back. `maxName` is generous at every tier because a
// truncated category name is the thing the reader most needs — it is only tightened
// where the alternative is text running off the card.
const LEADER_TIERS = [
  { minWidth: 620, ring: 126, elbow: 14, stub: 26, name: 10.5, figMin: 10, figMax: 22, gap: 32, maxName: 28 },
  { minWidth: 470, ring: 100, elbow: 12, stub: 20, name: 10, figMin: 10, figMax: 18, gap: 30, maxName: 20 },
  { minWidth: 380, ring: 78, elbow: 10, stub: 14, name: 9.5, figMin: 9.5, figMax: 15, gap: 29, maxName: 17 },
  // Phones. Below this a ring plus two readable text columns genuinely does not fit,
  // and the donut falls back to the legend rather than clipping its own labels.
  // The gap has to clear a two-line label (name + figure) or the columns collide —
  // it is the label's own height, not an arbitrary spacing.
  { minWidth: 296, ring: 62, elbow: 8, stub: 10, name: 9, figMin: 9, figMax: 13, gap: 28, maxName: 14 },
]
const tierFor = (width) => LEADER_TIERS.find((t) => width >= t.minWidth) || null

// Each label's figure is sized by how much of the ring its slice takes, so the chart
// can be read at a glance without comparing wedge angles: the biggest share carries
// the biggest number. Scaled against the LARGEST share present rather than against
// 100%, otherwise a well-balanced nine-slice donut would render every label at the
// minimum size and the emphasis would say nothing.
const figureSize = (frac, maxFrac, tier) => {
  if (!(maxFrac > 0)) return tier.figMin
  const t = Math.min(1, frac / maxFrac)
  // Eased slightly off linear (^0.75). Pure square root compressed the range so hard
  // that a 26% slice and an 8% one differed by three pixels and the emphasis said
  // nothing; pure linear drops the small slices below comfortable reading size.
  return Math.round(tier.figMin + (tier.figMax - tier.figMin) * Math.pow(t, 0.75))
}

// Push a column of labels apart in place: spread downwards, then, if the column
// overruns the bottom of the box, pin the last one and spread back upwards.
function spreadColumn(list, top, bottom, gap) {
  list.sort((a, b) => a.y - b.y)
  for (let i = 1; i < list.length; i++) list[i].y = Math.max(list[i].y, list[i - 1].y + gap)
  const last = list[list.length - 1]
  if (last && last.y > bottom) {
    last.y = bottom
    for (let i = list.length - 2; i >= 0; i--) list[i].y = Math.min(list[i].y, list[i + 1].y - gap)
  }
  if (list[0] && list[0].y < top) {
    list[0].y = top
    for (let i = 1; i < list.length; i++) list[i].y = Math.max(list[i].y, list[i - 1].y + gap)
  }
  return list
}

// Builds the renderer recharts calls per slice. The full layout is computed once for
// a given cx/cy/radius and cached, so the per-slice callback is a lookup.
function makeLeaderLabel({ data, key, palette, height, minPct, metric, tier }) {
  const total = data.reduce((a, b) => a + (b[key] || 0), 0)
  const maxFrac = total > 0 ? Math.max(...data.map((d) => (d[key] || 0) / total)) : 0
  const cache = new Map()

  const layout = (cx, cy, r) => {
    const ck = `${cx}|${cy}|${r}`
    if (cache.has(ck)) return cache.get(ck)
    let cum = 0
    const all = data.map((d, i) => {
      const frac = total > 0 ? (d[key] || 0) / total : 0
      const mid = 90 - 360 * (cum + frac / 2)
      cum += frac
      const rad = -mid * RAD // screen y grows downward, so the angle is negated
      return { i, frac, cos: Math.cos(rad), sin: Math.sin(rad) }
    })
    // Slices too thin to label would collide no matter how they are spread. They keep
    // their colour and their tooltip; the card prints a note saying how many are
    // unlabelled, so a missing label never reads as missing data.
    const shown = all.filter((p) => p.frac * 100 >= minPct)
    const placed = new Map()
    for (const side of ['r', 'l']) {
      const col = shown
        .filter((p) => (side === 'r' ? p.cos >= 0 : p.cos < 0))
        .map((p) => ({ ...p, side, y: cy + (r + tier.elbow) * p.sin }))
      for (const p of spreadColumn(col, 10, height - 10, tier.gap)) placed.set(p.i, p)
    }
    const res = { placed, hidden: all.length - shown.length }
    cache.set(ck, res)
    return res
  }

  const render = ({ cx, cy, outerRadius, index }) => {
    const { placed } = layout(cx, cy, outerRadius)
    const p = placed.get(index)
    if (!p) return null
    const d = data[index]
    const color = palette[index % palette.length]
    const dir = p.side === 'r' ? 1 : -1
    const x0 = cx + outerRadius * p.cos
    const y0 = cy + outerRadius * p.sin
    const x1 = cx + (outerRadius + tier.elbow) * dir * Math.abs(p.cos || 0.2)
    const x2 = cx + dir * (outerRadius + tier.elbow + tier.stub)
    const name = d.name.length > tier.maxName ? `${d.name.slice(0, tier.maxName - 1)}…` : d.name
    const anchor = p.side === 'r' ? 'start' : 'end'
    const tx = x2 + dir * 5
    const size = figureSize(p.frac, maxFrac, tier)
    // Two lines: the name in a constant small size on top, the quantity (or value)
    // beneath it sized by share. Keeping the NAME constant is deliberate — scaling it
    // too would make small categories hard to read for no extra information, since
    // the figure already carries the emphasis.
    return (
      <g key={`lead-${index}`}>
        <polyline
          points={`${x0},${y0} ${x1},${p.y} ${x2},${p.y}`}
          fill="none" stroke={color} strokeWidth={1.2} strokeOpacity={0.75}
        />
        <circle cx={x0} cy={y0} r={2.5} fill={color} />
        <text x={tx} y={p.y - size / 2 - 2} textAnchor={anchor} dominantBaseline="middle"
          fontSize={tier.name} fontWeight={600} fill="var(--text-muted)">
          {name}
        </text>
        <text x={tx} y={p.y + size / 2 - 1} textAnchor={anchor} dominantBaseline="middle"
          fontSize={size} fontWeight={800} fill="var(--text)">
          {metric === 'value' ? `₱${compact(d.value)}` : compact(d[key] || 0)}
          <tspan fontSize={Math.max(9.5, size - 4)} fontWeight={700} fill={color}>
            {'  '}{(p.frac * 100).toFixed(0)}%
          </tspan>
        </text>
      </g>
    )
  }

  // The hidden count needs the same layout, but the card wants it before any slice is
  // drawn. Recomputed against a nominal geometry — `minPct` does not depend on cx/cy.
  render.hiddenCount = data.filter((d) => (total > 0 ? ((d[key] || 0) / total) * 100 : 0) < minPct).length
  return render
}

/* Distribution donut with center total; metric + scope driven by parent. */
// `wide` lays the donut and its legend side by side (used when the card spans the
// full page width); otherwise the legend sits centred beneath the donut.
//
// `hideLegend` drops the built-in legend for callers that already render the same
// breakdown as a ranked list beside the donut — the Safekeeping tab pairs the two, and
// showing both would print every label twice. `showValue={false}` drops the peso line
// from the tooltip for datasets with no reliable unit price (safekept material), where
// a "₱0" would read as a real zero rather than as missing data.
// `height`/`innerRadius`/`outerRadius` let a caller grow the ring to fill a taller card
// instead of leaving a band of empty space around a fixed 250px chart.
// `leaderLines` labels each slice in place with a leader line instead of printing a
// legend beside the donut — the reader's eye goes straight from the wedge to its name
// rather than bouncing between the ring and a colour key.
export function DistributionDonut({
  data, metric = 'qty', wide = false, hideLegend = false, showValue = true, unit = 'units',
  height, innerRadius = 62, outerRadius = 94, leaderLines = false, minLabelPct = 2,
}) {
  const { theme } = useTheme()
  const PALETTE = categoricalFor(theme)
  const key = metric === 'value' ? 'value' : 'qty'
  const total = data.reduce((a, b) => a + b[key], 0)
  const boxRef = useRef(null)
  // Measured on the OUTER wrapper, never on .donut-chart: the `leader` class changes
  // .donut-chart's own max-width, so deciding the mode from that element's width
  // would latch — once it fell back to the legend the narrower box would keep the
  // condition false even on a wide screen, and it could never return.
  const boxWidth = useElementWidth(boxRef, leaderLines)
  // Mirrors the .donut-wrap.leader .donut-chart cap in the stylesheet.
  const chartWidth = Math.min(boxWidth, 780)
  // boxWidth is 0 only on the very first layout pass, before paint (see
  // useElementWidth), so defaulting to the widest tier never flashes between modes.
  const tier = leaderLines ? tierFor(boxWidth === 0 ? 780 : chartWidth) : null
  const useLeaders = Boolean(tier)
  const h = height ?? (useLeaders ? (chartWidth < 420 ? 300 : wide ? 360 : 330) : wide ? 300 : 250)
  const rOuter = useLeaders ? tier.ring : outerRadius
  const rInner = useLeaders ? Math.max(24, rOuter - Math.min(42, rOuter * 0.36)) : innerRadius
  const label = useLeaders
    ? makeLeaderLabel({ data, key, palette: PALETTE, height: h, minPct: minLabelPct, metric, tier })
    : null
  return (
    <div className={`${wide ? 'donut-wrap wide' : 'donut-wrap'}${useLeaders ? ' leader' : ''}`} ref={boxRef}>
      <div className="donut-chart">
        <ResponsiveContainer width="100%" height={h}>
          <PieChart>
            <defs>
              {paletteStops('pieGrad', PALETTE, theme === 'dark')}
              {/* Soft drop shadow so the ring reads as a raised object rather than a
                  flat cut-out. Kept subtle and offset downward only; on the near-black
                  dark card a heavier shadow just muddies the slice edges, so the dark
                  variant leans on opacity rather than spread. */}
              <filter id="donutShadow" x="-20%" y="-20%" width="140%" height="140%">
                <feDropShadow dx="0" dy={theme === 'dark' ? 2 : 3} stdDeviation={theme === 'dark' ? 3 : 4}
                  floodColor={theme === 'dark' ? '#000' : '#231f20'} floodOpacity={theme === 'dark' ? 0.5 : 0.22} />
              </filter>
            </defs>
            {/* isAnimationActive={false}: the mount animation starts every sector at a
                zero sweep, and Sector renders nothing when startAngle === endAngle. If
                the Pie mounts while its flex parent still measures 0px wide, that
                opening frame is the one that sticks and the donut never appears. */}
            <Pie
              data={data} dataKey={key} nameKey="name" innerRadius={rInner} outerRadius={rOuter}
              /* Fixed angles + no padding angle in leader mode: makeLeaderLabel derives
                 each slice's mid-angle itself, and a padding angle would shift every
                 sector out from under its own label. */
              startAngle={useLeaders ? 90 : 0} endAngle={useLeaders ? -270 : 360}
              paddingAngle={useLeaders ? 0 : 2}
              stroke="var(--surface)" strokeWidth={useLeaders ? 2 : 3}
              cornerRadius={useLeaders ? 0 : 4}
              label={label || undefined} labelLine={false}
              /* The filter goes on the Pie, not on each Cell: applied per sector it
                 would cast a shadow from every slice onto its neighbours and the ring
                 would look striped. */
              filter="url(#donutShadow)"
              isAnimationActive={false}
            >
              {data.map((_, i) => <Cell key={i} fill={`url(#pieGrad-${i % PALETTE.length})`} />)}
            </Pie>
            <Tooltip
              content={({ active, payload }) =>
                active && payload?.length ? (
                  <Box>
                    <div style={{ fontWeight: 700 }}>{payload[0].payload.label || payload[0].name}</div>
                    <div>
                      {num(payload[0].payload.qty)} {payload[0].payload.uom || unit}
                      {showValue && ` · ${peso(payload[0].payload.value)}`}
                    </div>
                  </Box>
                ) : null
              }
            />
          </PieChart>
        </ResponsiveContainer>
        <div className="donut-center">
          <span className="donut-center-lbl">Total</span>
          <span className="donut-center-val tabular">{metric === 'value' ? `₱${compact(total)}` : compact(total)}</span>
        </div>
      </div>
      {/* In leader mode the labels ARE the legend, so the colour key is dropped. The
          only thing still worth printing is how many slices were too thin to label —
          otherwise their absence reads as data that failed to load. */}
      {useLeaders && label?.hiddenCount > 0 && (
        <div className="donut-note faint">
          {label.hiddenCount} slice{label.hiddenCount === 1 ? '' : 's'} under {minLabelPct}% left unlabelled — hover the ring to read them
        </div>
      )}
      {!useLeaders && !hideLegend && (
        <div className="chart-legend legend-list donut-legend">
          {data.map((d, i) => (
            <div key={d.name} className="cl-item" title={d.name}>
              <span className="cl-dot" style={{ background: PALETTE[i % PALETTE.length] }} />
              <span className="cl-label">{d.name}</span>
              <span className="cl-val tabular">{metric === 'value' ? `₱${compact(d.value)}` : compact(d.qty)}</span>
              <span className="cl-pct tabular">{(metric === 'value' ? d.valueShare : d.share).toFixed(0)}%</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export function TrendArea({ data, dataKey = 'value', color = BRAND.red, money }) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <AreaChart data={data} margin={{ top: 12, right: 16, bottom: 4, left: 8 }}>
        <defs>
          <linearGradient id={`g-${dataKey}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.4} />
            <stop offset="50%" stopColor={color} stopOpacity={0.15} />
            <stop offset="100%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid vertical={false} stroke={gridColor} strokeDasharray="3 3" />
        <XAxis dataKey="label" tick={axis} tickLine={false} axisLine={{ stroke: gridColor }} />
        <YAxis tick={axis} tickLine={false} axisLine={false} tickFormatter={compact} width={48} />
        <Tooltip content={({ active, payload, label }) => (active && payload?.length ? <Box><div style={{ fontWeight: 700 }}>{label}</div><div>{money ? peso(payload[0].value) : num(payload[0].value)}</div></Box> : null)} />
        <Area type="monotone" dataKey={dataKey} stroke={color} strokeWidth={2.5} fill={`url(#g-${dataKey})`} dot={{ r: 3, fill: color }} activeDot={{ r: 5 }} isAnimationActive={false} />
      </AreaChart>
    </ResponsiveContainer>
  )
}

// Combined Movement History chart: Incoming/Outgoing bars (right-hand scale) sit
// behind the stock composition (left-hand scale).
//
// Available and Reserved are drawn as STACKED areas, so the top edge of the stack
// *is* Total — the identity Total = Available + Reserved is enforced by the
// geometry rather than left to chance. The Total line is then drawn along that
// same edge, which is why it can never fall below the series it sums.
// `wide` is set when the card has been expanded to the full page width. The legend
// then moves to a single column beside the chart (there is horizontal room for it);
// otherwise it sits underneath in a 3-column grid, which fills the space that a
// single wrapping row used to leave empty.
export function MovementComposed({ data, wide = false }) {
  const { theme } = useTheme()
  const dark = theme === 'dark'
  // The deeper movement-specific take on the shared series roles — see colors.js for
  // why this chart runs darker than the KPI cards that name the same six concepts.
  const M = movementFor(theme)
  const BARS = barsFor(theme)
  const LINE_COLORS = { total: M.total, available: M.available, reserved: M.reserved, damaged: M.damaged }
  const BAR_COLORS = { incoming: M.incoming, outgoing: M.outgoing }

  const legend = (
    <div className={`chart-legend ${wide ? 'legend-side' : 'legend-grid2'}`}>
      {[
        ['Total', LINE_COLORS.total, 'line'], ['Available', LINE_COLORS.available, 'area'], ['Reserved', LINE_COLORS.reserved, 'area'],
        ['Damaged', LINE_COLORS.damaged, 'dashed'], ['Incoming', BAR_COLORS.incoming, 'bar'], ['Outgoing', BAR_COLORS.outgoing, 'bar'],
      ].map(([label, color, kind]) => (
        <span key={label} className="cl-item">
          <LegendSwatch kind={kind} color={color} />
          <span className="cl-label">{label}</span>
        </span>
      ))}
    </div>
  )

  // `wide` is now the only layout Movement History uses on desktop (the card always
  // spans the page). It puts the legend in a column BESIDE the chart; the stylesheet
  // orders it to the left, and drops it back underneath below the tablet breakpoint
  // where there is no horizontal room to spare.
  return (
    <div className={wide ? 'movement-wrap wide' : 'movement-wrap'}>
      <div className="movement-chart">
      <ResponsiveContainer width="100%" height={wide ? 380 : 340}>
        <ComposedChart data={data} margin={{ top: 8, right: 12, bottom: 4, left: 4 }} barGap={2} barCategoryGap="18%">
          <defs>
            {/* A soft top-lit sheen: light edge settling into the solid series colour.
                Both bars run the same direction with a narrow tonal range, which is
                what keeps them reading as one clean material. */}
            <linearGradient id="gradIncoming" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={BARS.incoming.from} />
              <stop offset="100%" stopColor={BARS.incoming.to} />
            </linearGradient>
            <linearGradient id="gradOutgoing" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={BARS.outgoing.from} />
              <stop offset="100%" stopColor={BARS.outgoing.to} />
            </linearGradient>
            {/* Opacities run a little higher than the lighter palette needed. A deep
                green at 0.34 over white loses its hue and reads as flat gray; the
                extra weight is what keeps the fill green all the way down. */}
            <linearGradient id="gradAvailArea" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={LINE_COLORS.available} stopOpacity={dark ? 0.5 : 0.4} />
              <stop offset="100%" stopColor={LINE_COLORS.available} stopOpacity={dark ? 0.14 : 0.09} />
            </linearGradient>
            {/* The Reserved band is the gap between the Available and Total lines —
                Total = Available + Reserved, so this stacked slice IS that gap. It
                carries the heavier gradient because the Reserved line itself lies
                exactly under Total and would otherwise read as invisible. */}
            <linearGradient id="gradResArea" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={LINE_COLORS.reserved} stopOpacity={dark ? 0.72 : 0.66} />
              <stop offset="100%" stopColor={LINE_COLORS.reserved} stopOpacity={dark ? 0.4 : 0.34} />
            </linearGradient>
          </defs>
          <CartesianGrid vertical={false} stroke={gridColor} strokeDasharray="3 3" />
          <XAxis dataKey="label" tick={axis} tickLine={false} axisLine={{ stroke: gridColor }} />
          <YAxis yAxisId="left" tick={axis} tickLine={false} axisLine={false} tickFormatter={compact} width={48} domain={[0, 'auto']} />
          <YAxis yAxisId="right" orientation="right" tick={axis} tickLine={false} axisLine={false} tickFormatter={compact} width={44} domain={[0, 'auto']} />
          <Tooltip
            cursor={{ fill: 'var(--surface-2)' }}
            content={({ active, payload, label }) => {
              if (!active || !payload?.length) return null
              const d = payload[0].payload
              return (
                <Box>
                  <div style={{ fontWeight: 700, marginBottom: 4 }}>{label}</div>
                  <div style={{ color: LINE_COLORS.total, fontWeight: 700 }}>Total: {num(d.total)}</div>
                  <div style={{ color: LINE_COLORS.available }}>Available: {num(d.available)}</div>
                  <div style={{ color: LINE_COLORS.reserved }}>Reserved: {num(d.reserved)}</div>
                  <div style={{ color: LINE_COLORS.damaged }}>Damaged: {num(d.damaged)}</div>
                  <div style={{ color: BAR_COLORS.incoming, marginTop: 4 }}>Incoming: {num(d.incoming)}</div>
                  <div style={{ color: BAR_COLORS.outgoing }}>Outgoing: {num(d.outgoing)}</div>
                </Box>
              )
            }}
          />
          {/* Bars first — they render behind the areas and lines drawn after them. */}
          <Bar yAxisId="right" dataKey="incoming" fill="url(#gradIncoming)" radius={[5, 5, 0, 0]} maxBarSize={42} isAnimationActive={false} />
          <Bar yAxisId="right" dataKey="outgoing" fill="url(#gradOutgoing)" radius={[5, 5, 0, 0]} maxBarSize={42} isAnimationActive={false} />
          <Area yAxisId="left" type="monotone" dataKey="available" stackId="stock" stroke={LINE_COLORS.available} strokeWidth={2} fill="url(#gradAvailArea)" isAnimationActive={false} />
          <Area yAxisId="left" type="monotone" dataKey="reserved" stackId="stock" stroke={LINE_COLORS.reserved} strokeWidth={2} fill="url(#gradResArea)" isAnimationActive={false} />
          <Line yAxisId="left" type="monotone" dataKey="total" stroke={LINE_COLORS.total} strokeWidth={3} dot={{ r: 3, fill: LINE_COLORS.total }} activeDot={{ r: 5 }} isAnimationActive={false} />
          <Line yAxisId="left" type="monotone" dataKey="damaged" stroke={LINE_COLORS.damaged} strokeWidth={2} strokeDasharray="5 4" dot={false} activeDot={{ r: 4 }} isAnimationActive={false} />
        </ComposedChart>
      </ResponsiveContainer>
      </div>
      {legend}
    </div>
  )
}

export function HBar({ data, color = BRAND.graySoft, money }) {
  return (
    <ResponsiveContainer width="100%" height={Math.max(200, data.length * 36)}>
      <BarChart data={data} layout="vertical" margin={{ top: 4, right: 48, bottom: 4, left: 8 }}>
        <defs>
          <linearGradient id="gradHBar" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor={color} stopOpacity={0.6} />
            <stop offset="60%" stopColor={color} stopOpacity={0.85} />
            <stop offset="100%" stopColor={color} stopOpacity={1} />
          </linearGradient>
        </defs>
        <CartesianGrid horizontal={false} stroke={gridColor} strokeDasharray="3 3" />
        <XAxis type="number" tick={axis} tickLine={false} axisLine={false} tickFormatter={money ? (v) => `₱${compact(v)}` : compact} />
        <YAxis type="category" dataKey="name" tick={axis} tickLine={false} axisLine={false} width={150} />
        <Tooltip cursor={{ fill: 'var(--surface-2)' }} content={({ active, payload }) => (active && payload?.length ? <Box>{money ? peso(payload[0].value) : num(payload[0].value)}</Box> : null)} />
        <Bar dataKey="value" radius={[0, 6, 6, 0]} maxBarSize={24} fill="url(#gradHBar)" isAnimationActive={false}>
          <LabelList dataKey="value" position="right" formatter={money ? (v) => `₱${compact(v)}` : compact} style={{ fontSize: 11, fontWeight: 700, fill: 'var(--text-muted)' }} />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}
// ---------------------------------------------------------------------------
// Aging bars — value (or line count) held in each days-since-last-movement band.
// The ramp runs deliberately from the "available" green through the warning yellow
// to brand red, so age reads as escalating risk without needing the legend.
export function AgingBars({ bands, metric = 'value', height = 280, onPick }) {
  const { theme } = useTheme()
  const S = seriesFor(theme)
  const RAMP = [S.available, S.available, S.damaged, S.damaged, S.outgoing, S.total]
  const key = metric === 'value' ? 'value' : 'count'
  const fmtV = metric === 'value' ? (v) => `₱${compact(v)}` : compact

  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={bands} margin={{ top: 24, right: 16, bottom: 16, left: 8 }} barCategoryGap="22%">
        <defs>{paletteStops('ageGrad', RAMP, theme === 'dark')}</defs>
        <CartesianGrid vertical={false} stroke={gridColor} strokeDasharray="3 3" />
        <XAxis dataKey="label" tick={<BarTick />} tickLine={false} axisLine={{ stroke: gridColor }} interval={0} height={34} />
        <YAxis tick={axis} tickLine={false} axisLine={false} tickFormatter={fmtV} width={56} />
        <Tooltip
          cursor={{ fill: 'var(--surface-2)', radius: 6 }}
          content={({ active, payload }) => {
            if (!active || !payload?.length) return null
            const d = payload[0].payload
            return (
              <Box>
                <div style={{ fontWeight: 700, marginBottom: 4 }}>{d.label}</div>
                <div>{num(d.count)} line{d.count === 1 ? '' : 's'} · {num(d.qty)} units</div>
                <div className="muted">{peso(d.value)} · {d.valueShare.toFixed(1)}% of value</div>
                <div className="faint" style={{ fontSize: 11, marginTop: 3 }}>{d.note}</div>
              </Box>
            )
          }}
        />
        <Bar dataKey={key} radius={[8, 8, 0, 0]} maxBarSize={72} isAnimationActive={false}
          cursor={onPick ? 'pointer' : undefined} onClick={onPick ? (d) => onPick(d.payload) : undefined}>
          {bands.map((_, i) => <Cell key={i} fill={`url(#ageGrad-${i % RAMP.length})`} />)}
          <LabelList dataKey={key} position="top" formatter={fmtV} style={{ fontSize: 11, fontWeight: 800, fill: 'var(--text)' }} />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}

// ---------------------------------------------------------------------------
// Net inventory change — recorded receipts less recorded issues, per period, with
// the running total across the window on the right-hand scale.
//
// Bars are signed: a period that received more than it released sits above the zero
// rule in the Incoming colour, one that released more sits below it in the Outgoing
// colour. Periods the ledger does not cover are drawn hollow rather than as a
// confident zero — "we have no record" and "nothing moved" are different statements.
export function NetChangeChart({ data, metric = 'qty', height = 320 }) {
  const { theme } = useTheme()
  const M = movementFor(theme)
  const S = seriesFor(theme)
  const key = metric === 'value' ? 'netValue' : 'net'
  const cumKey = metric === 'value' ? 'cumulativeValue' : 'cumulative'
  const fmtV = metric === 'value' ? (v) => `₱${compact(v)}` : compact

  // An uncovered bucket has a net of zero, and a zero-height bar draws nothing — so
  // "we hold no record of this period" and "this period was perfectly balanced" would
  // look identical. The uncovered stretches are shaded instead, which is visible
  // regardless of bar height. Runs rather than one span: the ledger window is
  // contiguous, so what falls outside it is a leading and/or trailing stretch, and a
  // single span across both would wrongly grey out the covered middle.
  const uncoveredRuns = []
  data.forEach((d, i) => {
    if (d.covered) return
    const last = uncoveredRuns[uncoveredRuns.length - 1]
    if (last && last.endIdx === i - 1) { last.endIdx = i; last.to = d.label }
    else uncoveredRuns.push({ from: d.label, to: d.label, endIdx: i })
  })
  const anyUncovered = uncoveredRuns.length > 0

  return (
    <div className="movement-wrap">
      <div className="movement-chart">
        <ResponsiveContainer width="100%" height={height}>
          <ComposedChart data={data} margin={{ top: 12, right: 12, bottom: 4, left: 4 }}>
            <CartesianGrid vertical={false} stroke={gridColor} strokeDasharray="3 3" />
            <XAxis dataKey="label" tick={axis} tickLine={false} axisLine={{ stroke: gridColor }} />
            <YAxis yAxisId="left" tick={axis} tickLine={false} axisLine={false} tickFormatter={fmtV} width={56} />
            <YAxis yAxisId="right" orientation="right" tick={axis} tickLine={false} axisLine={false} tickFormatter={fmtV} width={56} />
            {uncoveredRuns.map((r) => (
              <ReferenceArea key={r.from} yAxisId="left" x1={r.from} x2={r.to}
                fill="var(--text-faint)" fillOpacity={0.1} stroke="var(--border-strong)" strokeDasharray="4 3"
                label={{ value: 'no ledger record', position: 'insideTop', fontSize: 10, fontWeight: 700, fill: 'var(--text-faint)' }} />
            ))}
            <ReferenceLine yAxisId="left" y={0} stroke="var(--border-strong)" strokeWidth={1.4} />
            <Tooltip
              cursor={{ fill: 'var(--surface-2)' }}
              content={({ active, payload, label }) => {
                if (!active || !payload?.length) return null
                const d = payload[0].payload
                if (!d.covered) {
                  return <Box><div style={{ fontWeight: 700 }}>{label}</div><div className="muted">Outside the recorded ledger window — no data</div></Box>
                }
                const net = metric === 'value' ? d.netValue : d.net
                return (
                  <Box>
                    <div style={{ fontWeight: 700, marginBottom: 4 }}>{label}</div>
                    <div style={{ color: M.incoming }}>Received: {metric === 'value' ? peso(d.incomingValue) : num(d.incoming)}</div>
                    <div style={{ color: M.outgoing }}>Issued: {metric === 'value' ? peso(d.outgoingValue) : num(d.outgoing)}</div>
                    <div style={{ fontWeight: 700, marginTop: 3 }}>Net: {net >= 0 ? '+' : ''}{metric === 'value' ? peso(net) : num(net)}</div>
                    <div className="faint" style={{ fontSize: 11 }}>Running: {metric === 'value' ? peso(d.cumulativeValue) : num(d.cumulative)}</div>
                  </Box>
                )
              }}
            />
            <Bar yAxisId="left" dataKey={key} radius={[5, 5, 0, 0]} maxBarSize={54} isAnimationActive={false}>
              {data.map((d, i) => (
                <Cell key={i}
                  fill={!d.covered ? 'transparent' : (d[key] >= 0 ? M.incoming : M.outgoing)}
                  stroke={!d.covered ? 'var(--border-strong)' : 'none'}
                  strokeDasharray={!d.covered ? '4 3' : undefined} />
              ))}
            </Bar>
            <Line yAxisId="right" type="monotone" dataKey={cumKey} stroke={S.total} strokeWidth={2.5}
              dot={{ r: 3, fill: S.total }} activeDot={{ r: 5 }} isAnimationActive={false} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
      <div className="chart-legend legend-grid2">
        <span className="cl-item"><LegendSwatch kind="bar" color={M.incoming} /><span className="cl-label">Net gain (received &gt; issued)</span></span>
        <span className="cl-item"><LegendSwatch kind="bar" color={M.outgoing} /><span className="cl-label">Net draw (issued &gt; received)</span></span>
        <span className="cl-item"><LegendSwatch kind="line" color={S.total} /><span className="cl-label">Running total</span></span>
        {anyUncovered && (
          <span className="cl-item"><LegendSwatch kind="dashed" color="var(--border-strong)" /><span className="cl-label">No ledger coverage</span></span>
        )}
      </div>
    </div>
  )
}
