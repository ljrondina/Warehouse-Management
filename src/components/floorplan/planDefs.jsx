// Shared <defs> for the plan SVGs: one diagonal gradient per area role.
//
// The stops read the same `--fp-*` tokens the flat colours use, so a gradient tracks
// the theme without a second palette. Opacity lives in the stops rather than on the
// shape, which leaves `fill-opacity` free to carry hover and selection state on top.

export const ROLES = [
  'mepfs', 'structural', 'architectural', 'safekeeping', 'highvalue',
  'building', 'rebar', 'tiles', 'mrf',
]

export default function PlanDefs({ extra }) {
  return (
    <defs>
      {ROLES.map((r) => (
        <linearGradient key={r} id={`fpg-${r}`} x1="0" y1="0" x2="0.9" y2="1">
          <stop offset="0%" stopColor={`var(--fp-${r})`} stopOpacity="0.44" />
          <stop offset="55%" stopColor={`var(--fp-${r})`} stopOpacity="0.24" />
          <stop offset="100%" stopColor={`var(--fp-${r})`} stopOpacity="0.1" />
        </linearGradient>
      ))}
      {/* the open floor gets the same treatment in neutral, so it reads as surface
          rather than as a sixth material area */}
      <linearGradient id="fpg-floor" x1="0" y1="0" x2="0.6" y2="1">
        <stop offset="0%" stopColor="var(--fp-ink)" stopOpacity="0.1" />
        <stop offset="100%" stopColor="var(--fp-ink)" stopOpacity="0.03" />
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
