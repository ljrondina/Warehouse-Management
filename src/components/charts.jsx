import {
  ResponsiveContainer, ComposedChart, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Cell, LabelList,
  PieChart, Pie, AreaChart, Area, Line,
} from 'recharts'
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
export function DistributionDonut({
  data, metric = 'qty', wide = false, hideLegend = false, showValue = true, unit = 'units',
  height, innerRadius = 62, outerRadius = 94,
}) {
  const { theme } = useTheme()
  const PALETTE = categoricalFor(theme)
  const key = metric === 'value' ? 'value' : 'qty'
  const total = data.reduce((a, b) => a + b[key], 0)
  const h = height ?? (wide ? 300 : 250)
  return (
    <div className={wide ? 'donut-wrap wide' : 'donut-wrap'}>
      <div className="donut-chart">
        <ResponsiveContainer width="100%" height={h}>
          <PieChart>
            <defs>{paletteStops('pieGrad', PALETTE, theme === 'dark')}</defs>
            {/* isAnimationActive={false}: the mount animation starts every sector at a
                zero sweep, and Sector renders nothing when startAngle === endAngle. If
                the Pie mounts while its flex parent still measures 0px wide, that
                opening frame is the one that sticks and the donut never appears. */}
            <Pie data={data} dataKey={key} nameKey="name" innerRadius={innerRadius} outerRadius={outerRadius} paddingAngle={2} stroke="var(--surface)" strokeWidth={3} cornerRadius={4} isAnimationActive={false}>
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
      {!hideLegend && (
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
