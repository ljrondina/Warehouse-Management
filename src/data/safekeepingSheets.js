// Safekeeping sheets — LOADED FROM POSTGRES AT RUNTIME (public.safekeeping_soh,
// public.safekeeping_incoming, public.safekeeping_outgoing).
// Master copy: /private-data/safekeepingSheets.js (untracked). Filled in place by
// src/lib/hydrate.js. See src/data/inventory.js for why this file is empty.
export const SOH_ROWS = [];
export const INCOMING_ROWS = [];
export const OUTGOING_ROWS = [];
