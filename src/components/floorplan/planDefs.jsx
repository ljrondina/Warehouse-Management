// Shared <defs> for the plan SVGs.
//
// Two gradient sets per area role, which is what separates the two kinds of shape on
// the warehouse plan:
//   fpg-<role>       soft   — the section-area highlights the deck draws, a wash
//   fpg-solid-<role> strong — the racks and floor bays, the things you actually click
// Both read the same `--fp-*` tokens the flat colours use, so they track the theme
// without a second palette. Opacity lives in the stops, which leaves `fill-opacity`
// free to carry hover and selection on top.
//
// Plus one texture per role: a fine diagonal hatch, drawn over a clickable block at low
// opacity so it reads as a stocked surface rather than a flat swatch.

export const ROLES = [
  'mepfs', 'structural', 'architectural', 'safekeeping', 'highvalue',
  'building', 'rebar', 'tiles', 'mrf',
]

export default function PlanDefs({ extra }) {
  return (
    <defs>
      {ROLES.map((r) => (
        <linearGradient key={r} id={`fpg-${r}`} x1="0" y1="0" x2="0.9" y2="1">
          <stop offset="0%" stopColor={`var(--fp-${r})`} stopOpacity="0.3" />
          <stop offset="55%" stopColor={`var(--fp-${r})`} stopOpacity="0.16" />
          <stop offset="100%" stopColor={`var(--fp-${r})`} stopOpacity="0.06" />
        </linearGradient>
      ))}
      {ROLES.map((r) => (
        <linearGradient key={`s${r}`} id={`fpg-solid-${r}`} x1="0" y1="0" x2="0.6" y2="1">
          <stop offset="0%" stopColor={`var(--fp-${r})`} stopOpacity="0.95" />
          <stop offset="100%" stopColor={`var(--fp-${r})`} stopOpacity="0.62" />
        </linearGradient>
      ))}
      {ROLES.map((r) => (
        <pattern key={`t${r}`} id={`fpt-${r}`} width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <line x1="0" y1="0" x2="0" y2="6" stroke={`var(--fp-${r})`} strokeWidth="1.1" strokeOpacity="0.3" />
        </pattern>
      ))}
      {/* the open floor and yard get the same treatment in neutral, so they read as
          surface rather than as another material area */}
      <linearGradient id="fpg-floor" x1="0" y1="0" x2="0.6" y2="1">
        <stop offset="0%" stopColor="var(--fp-ink)" stopOpacity="0.09" />
        <stop offset="100%" stopColor="var(--fp-ink)" stopOpacity="0.02" />
      </linearGradient>
      <linearGradient id="fpg-yard" x1="0" y1="0" x2="0.5" y2="1">
        <stop offset="0%" stopColor="var(--fp-ink)" stopOpacity="0.13" />
        <stop offset="100%" stopColor="var(--fp-ink)" stopOpacity="0.04" />
      </linearGradient>
      <linearGradient id="fpg-shell" x1="0" y1="0" x2="0.4" y2="1">
        <stop offset="0%" stopColor="var(--fp-shell-a)" />
        <stop offset="100%" stopColor="var(--fp-shell-b)" />
      </linearGradient>
      {extra}
    </defs>
  )
}
