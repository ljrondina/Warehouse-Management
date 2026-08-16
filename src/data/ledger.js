// CW Incoming / CW Outgoing movement ledger — LOADED FROM POSTGRES AT RUNTIME
// (public.ledger). Master copy: /private-data/ledger.js (untracked).
// See src/data/inventory.js for why this file carries no data.
//
// `LEDGER` is filled IN PLACE by src/lib/hydrate.js; rebuildLedgerSpan() then
// recomputes the window below.
export const LEDGER = [];

// Oldest and newest day offsets the ledger actually covers. Anything outside this
// window has no recorded history and must be projected, not invented silently.
//
// Held on a mutable object rather than as two number exports so they stay correct
// after hydration — a number export would be frozen at whatever was loaded first.
export const LEDGER_SPAN = { oldest: 0, newest: 0 };

export function rebuildLedgerSpan() {
  const offsets = LEDGER.map((r) => r.off);
  LEDGER_SPAN.oldest = offsets.length ? Math.max(...offsets) : 0;
  LEDGER_SPAN.newest = offsets.length ? Math.min(...offsets) : 0;
}

rebuildLedgerSpan();
