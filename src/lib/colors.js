// Single source of truth for every colour used outside CSS (charts, KPI accents,
// inline styles). Mirrors the tokens in styles/index.css.
//
// RESTRICTED PALETTE — the six approved brand colours, plus green (permitted),
// orange (permitted — carries the Incoming role) and yellow (minimal, warning role
// only). NO BLUE, no other hues. Variety comes from tints, shades and gradients of
// these.
//
// Every value below is defined per theme, not just per hue: a colour tuned to sit on
// a white card can vanish on the near-black dark one (and vice versa), which is
// exactly what made things "invisible" before. Each theme's set is chosen to clear
// contrast against that theme's own card background.

export const BRAND = {
  red: '#ee3124',
  redDark: '#c42127',
  redDarker: '#8f1a1c',
  redDeep: '#7a1417',
  redSoft: '#f4695d',
  redMid: '#e8574c',
  redBrick: '#c9524a',
  redWash: '#e8908a',
  redPale: '#f7bdb9',
  redFaint: '#fdeceb',
  grayDark: '#2b2c2b',
  graySoft: '#7d7c7c',
  grayMid: '#a8a7a7',
  gray: '#dcdbdb',
  black: '#231f20',
  white: '#ffffff',
  green: '#2f7d5a',
  greenSoft: '#4a9e78',
  orange: '#b85f13',
  orangeSoft: '#dd9950',
  orangeSofter: '#e8b47d',
  yellow: '#a8770f',
  yellowSoft: '#c9962a',
}

// ONE semantic map, consumed by the KPI cards, the composition gauge, the movement
// chart and the distribution legend — so a concept is the same colour everywhere.
//
// Six distinct roles now use four hue families rather than shades of red alone:
// Total/Value = red, Available = green, Reserved = neutral gray, Damaged = yellow
// (its warning role), Incoming = orange, Outgoing = deep red. Incoming and Outgoing
// stay a legible pair (warm orange vs. cool deep red) without either one reading as
// a warning colour.
const SERIES_LIGHT = {
  total: BRAND.red,
  available: BRAND.green,
  reserved: BRAND.graySoft,
  damaged: BRAND.yellow,
  incoming: BRAND.orange,
  outgoing: BRAND.redDeep,
  value: BRAND.grayDark,
  neutral: BRAND.graySoft,
}

const SERIES_DARK = {
  total: BRAND.redSoft,
  available: BRAND.greenSoft,
  reserved: BRAND.grayMid,
  damaged: BRAND.yellowSoft,
  incoming: BRAND.orangeSoft,
  outgoing: BRAND.redPale,
  value: BRAND.gray,
  neutral: BRAND.grayMid,
}

// ---------------------------------------------------------------------------
// Movement History's own take on the six series roles: SAME hue family per role, one
// step deeper. The chart carries far more ink than a KPI stripe does — two bar
// series, two filled areas and two lines in one frame — and at the lighter SERIES
// values that stack read washed out. Deepening it is what lets the areas hold their
// gradients and the lines stay legible on top of the bars behind them.
//
// Every value clears at least 3.5:1 against its own theme's card background, and
// the pairs that could be confused are kept apart: Total stays a mid red rather than
// following Outgoing all the way down, or the line and the bars behind it would read
// as one colour.
const MOVEMENT_LIGHT = {
  total: '#c42127',     // 5.8 on white
  available: '#1f5c40', // 7.9
  reserved: '#565555',  // 7.4
  damaged: '#7d5807',   // 6.4
  incoming: '#8c460b',  // 7.0
  outgoing: '#5c0f11',  // 13.7
}

// On the near-black card, "darker" cannot mean the same thing — past a point it
// erases the series. So the dark set deepens the over-bright values (Outgoing was a
// pale pink at 10:1, far brighter than anything around it) and leaves the rest close
// to where they were, which is what actually evens out the frame.
const MOVEMENT_DARK = {
  total: '#e8574c',     // 4.6 on #231f20
  available: '#3d8b68', // 4.0
  reserved: '#949393',  // 5.3
  damaged: '#b88621',   // 5.0
  incoming: '#c8813a',  // 5.2
  outgoing: '#cf8079',  // 5.5
}

// Movement-history bar fills. Both bars run the SAME direction — a lighter top edge
// settling into a deeper base — so the pair reads as one consistent material with a
// soft sheen rather than two competing ramps. Incoming is orange (matching
// MOVEMENT.incoming) and Outgoing deep red; the two families are what tells them
// apart, not gradient direction, and each ramp's own tonal range is kept narrow so
// neither looks like a garish rainbow bar. The ramps sit a shade deeper than the
// line colours of the same role, so a bar never competes with the line over it.
const BARS_LIGHT = {
  incoming: { from: '#b8701f', to: '#7a3c08' },
  outgoing: { from: '#8f1a1c', to: '#4f0d0f' },
}
const BARS_DARK = {
  incoming: { from: '#d99a52', to: '#a86520' },
  outgoing: { from: '#d68c85', to: '#b9534d' },
}

// Distribution ramp — red and neutral shades, plus ONE orange accent for variety
// (green stays reserved for the Available stock state and would read as a semantic
// signal here). The families alternate so neighbouring slices never share a tone,
// and every entry clears ~3:1 against its theme's card background.
//
// The dashboard's rollup() caps a donut at 8 named slices + "Others" = 9 rows, so
// index 9 of a 10-entry ramp is dead — it would NEVER actually render. The orange
// accent sits at index 6 instead: within the always-rendered 9 (Item Group view
// routinely has 9) and even within a Trade view's 7.
const CATEGORICAL_LIGHT = [
  BRAND.red,        // 3.0 on white
  BRAND.grayDark,   // 14.4
  BRAND.redDark,    // 6.7
  BRAND.graySoft,   // 3.9
  BRAND.redSoft,    // 3.7
  '#575656',        // 7.4
  BRAND.orange,     // 4.8 — the one accent slice
  BRAND.redDeep,    // 10.5
  '#d9564d',        // 4.8
  BRAND.black,      // 16.9
]

const CATEGORICAL_DARK = [
  BRAND.redSoft,    // 4.3 on #231f20
  BRAND.gray,       // 11.6
  BRAND.red,        // 3.6
  BRAND.grayMid,    // 6.8
  BRAND.redPale,    // 9.7
  BRAND.graySoft,   // 3.9
  BRAND.orangeSoft, // 5.6 — the one accent slice
  '#efeeee',        // 13.7
  BRAND.redWash,    // 6.7
  BRAND.redBrick,   // 3.0
]

export const seriesFor = (theme) => (theme === 'dark' ? SERIES_DARK : SERIES_LIGHT)
export const movementFor = (theme) => (theme === 'dark' ? MOVEMENT_DARK : MOVEMENT_LIGHT)
export const barsFor = (theme) => (theme === 'dark' ? BARS_DARK : BARS_LIGHT)
export const categoricalFor = (theme) => (theme === 'dark' ? CATEGORICAL_DARK : CATEGORICAL_LIGHT)

// Static fallbacks for the handful of non-themed call sites.
export const SERIES = SERIES_LIGHT
export const CATEGORICAL = CATEGORICAL_LIGHT
