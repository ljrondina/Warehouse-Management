# CLAUDE.md — Megawide WMS (PRC-WH APP)

Working notes for Claude Code sessions on this repo. Keep this file current: every
prompt that changes something should add a changelog entry below and be committed.

## Project

Warehouse Management System for Megawide Construction (Central Warehouse Taytay).
Vite + React 18 + React Router + Recharts + Supabase JS. Brand: Megawide Red `#ee3124`,
Montserrat / Barlow Condensed, light + dark mode.

## Standing workflow (agreed 2026-08-13)

1. Every prompt that changes anything → update the **Changelog** below.
2. Commit after every prompt (`git add -A && git commit`), then push to `origin`.
3. Never commit `.env` (gitignored). Only `.env.example` holds placeholder/public values.

## Current state

- **Data**: **Postgres (Supabase) only.** Loaded before first render by `src/lib/hydrate.js`.
  There is NO bundled fallback any more — `src/data/*.js` are empty shells since the repo
  went public (2026-08-16). If the load fails the app has no data and says so:
  `hydrationStatus.source === 'empty'` with a reason, surfaced on Settings → *Data source*.
  Master copies of the dataset live in `/private-data/` (gitignored).
- **Auth**: `src/context/AuthContext.jsx` uses Supabase `signInWithPassword`, then reads
  `public.profiles` for the role. The `DEMO_USERS` / `DEMO_PASSWORD` fallback in
  `src/data/roles.js` is `import.meta.env.DEV`-only — production accepts real accounts only.
- **Backend**: `supabase/schema.sql` (all tables, RLS, `is_admin()`, role-escalation guard,
  signup trigger) + `supabase/seed/NN_seed.sql` (**generated** — never edit by hand,
  gitignored, run in order).

## Data architecture (Phase 2, 2026-08-16)

**Seeded reference tables** — `trades`, `projects`, `inventory` (779), `ledger` (184),
`safekeeping_soh` (132), `safekeeping_incoming` (271), `safekeeping_outgoing` (160),
`delivery_tracker` (27). Read by all signed-in users; **only admins write**.

**Empty transactional tables** — `movements`, `reservations`, `purchase_requests`,
`material_requests`, `approvals`, `safekeeping_requests`, `audit_log`. Any signed-in user
reads and inserts; only admins update/delete. `audit_log` has no update/delete policy at
all. Every row carries `created_by` (uuid) and `created_by_email`.

**Why the loader looks the way it does.** `src/data/*.js` compute their view models
eagerly at import and ~20 pages import them directly. Rather than rewrite every page to
await a query, `src/lib/hydrate.js` fetches all tables and fills the exported arrays
**in place** (never reassigns them), then calls each module's `rebuild*()` to recompute
derived exports. It runs once in `src/main.jsx` *before* `ReactDOM.render`, so no page
needs a loading state. `AuthContext.signIn` re-runs it after login, because the tables
are RLS-gated and the pre-render pass returns nothing without a session.

Consequence: **arrays in `src/data/` must be mutated, never reassigned.** A
`export const x = [...]` that gets replaced instead of refilled silently breaks hydration.

**Seed generation**: `npm run seed` → regenerates `supabase/seed/NN_seed.sql` from the
modules in `/private-data/`. Run it whenever a source module there changes, then paste
the parts into the Supabase SQL Editor IN ORDER. (The old hand-written
`seed_inventory.sql` had drifted to a different snapshot and was missing five columns;
generating removes that failure mode.)
- **Git**: branch `main`, single clean root commit (history reset 2026-08-16).
- **Deploy**: GitHub Pages project site at `https://prcdepartment.github.io/prc-wh/`,
  built by `.github/workflows/deploy.yml` on every push to `main`.

## Deployment (GitHub Pages)

- **Repo**: `prcdepartment/prc-wh` · **Branch**: `main` · **Pages source**: GitHub Actions.
  (Moved 2026-08-16 from `ljrondina/Warehouse-Management`.)
- **Base path**: `vite.config.js` sets `base = '/prc-wh/'` for production. **It must equal
  the repository name.** Rename the repo and this must change in the same commit, or every
  asset 404s and the page loads blank.
  (`BASE_PATH=/ npm run build` to build for a root-level host instead).
  `BrowserRouter basename={import.meta.env.BASE_URL}` in `src/main.jsx` matches it, and
  `src/components/Logo.jsx` prefixes `public/` assets with `import.meta.env.BASE_URL`.
- **SPA routing**: Pages has no rewrites, so `public/404.html` encodes the requested path into
  a query string and `index.html` restores it with `history.replaceState` before React Router
  boots (rafgraph/spa-github-pages technique).
- **Secrets**: repo → Settings → Secrets and variables → Actions → `VITE_SUPABASE_URL`,
  `VITE_SUPABASE_ANON_KEY`. Vite inlines these at build time; the anon/publishable key is
  public by design — RLS is the actual protection.
- **Caveat**: a Pages site on a free account is publicly reachable. Access control rests
  entirely on Supabase auth + RLS.

## Known blockers for a real production deployment

| # | Issue | Why it matters |
|---|-------|----------------|
| ~~1~~ | ~~Demo-password fallback in `AuthContext.signIn`~~ | **Fixed 2026-08-16** — gated behind `import.meta.env.DEV`. Production builds accept only real Supabase credentials. |
| ~~2~~ | ~~`switchRole()` lets any user change their own role client-side~~ | **Fixed 2026-08-16** — no-op in production, and the Switch Role button is hidden. |
| ~~3~~ | ~~All business data lives in JS files~~ | **Fixed 2026-08-16** — all data in Postgres. The JS modules are empty shells; no data ships in the bundle. |
| ~~4~~ | ~~Role permissions enforced only in the UI~~ | **Fixed 2026-08-16** — RLS on every table, plus a trigger that blocks self-escalation to admin. |
| 5 | No CI, no tests, no error boundary | |
| 6 | Writes still go nowhere | Add Material and movement entry are read-only UI; only Safekeeping Requests persist. Phase 3. |

## Commands

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # -> dist/
npm run preview
```

## Changelog

### 2026-08-13 — Session: push & deploy planning
- Created this `CLAUDE.md`; recorded standing workflow and the production-readiness gaps.
- Committed pending working-tree changes (DataSheet, DeliveryTracker, ui, format,
  SafekeepingTab, styles) from the date-format / dashboard work.
- Next: create GitHub remote, decide host, harden auth, migrate data to Supabase.

### 2026-08-16 — Session: GitHub Pages deploy + auth hardening
Decisions: host on **GitHub Pages** as `ljrondina/Warehouse-Management`; remove the demo-password
fallback now; keep the existing Supabase project `ahwfkdgvkmhnrlmhumgn`.

- `vite.config.js` — production `base` of `/Warehouse-Management/` (override via `BASE_PATH`).
- `src/main.jsx` — `BrowserRouter basename={import.meta.env.BASE_URL}`.
- `src/components/Logo.jsx` — `public/` image paths prefixed with the base path (they were
  hard-coded to `/`, which 404s under a Pages sub-path).
- `public/404.html` + `index.html` — SPA deep-link redirect shim for GitHub Pages.
- `.github/workflows/deploy.yml` — build on push to `main`, publish `dist/` to Pages; reads
  `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` from repo Actions secrets.
- `src/context/AuthContext.jsx` — demo-password fallback and the "no Supabase configured"
  sign-in path are now `import.meta.env.DEV`-only; `switchRole()` is a no-op in production and
  exposes `canSwitchRole` on the context.
- `src/components/Layout.jsx` — Switch Role control hidden in production builds.
- `src/pages/Login.jsx` — no credential prefill and no demo quick-sign-in panel in production.
- Verified `npm run build` succeeds and emits the correct `/Warehouse-Management/` asset paths.
- Next: run `supabase/schema.sql`, create the real user accounts, then Phase 2 (move
  `src/data/` into Postgres tables with RLS).

### 2026-08-16 — Session: Phase 2, data into Postgres
Decisions: transactional tables **start empty** (no synthesized rows carried over);
scope = schema + seeds + read path; **admin-only writes** on reference data.

- `supabase/schema.sql` — rewritten: 15 tables, RLS on all of them, an `is_admin()`
  helper, and a `guard_role_change()` trigger. That trigger closes a real hole: the
  existing "a user may update their own profile" policy let anyone set their own role
  to admin, because a USING clause cannot see which column changed.
- `scripts/generate-seeds.mjs` + `npm run seed` — generates `supabase/seed_data.sql`
  (1,622 rows) from the JS modules. Deleted the stale hand-written `seed_inventory.sql`,
  which had drifted to a different snapshot and was missing five columns.
- `src/lib/hydrate.js` — new. Pages through PostgREST's 1000-row cap, maps snake_case →
  camelCase, fills the data arrays in place, falls back to the bundled snapshot on any
  failure, and records the outcome in `hydrationStatus`.
- `src/data/{insights,safekeeping,deliveryTracker,projects,ledger}.js` — derived exports
  are now built by `rebuild*()` into arrays filled in place. `LEDGER_OLDEST`/`LEDGER_NEWEST`
  became `LEDGER_SPAN`: number exports cannot be re-derived after hydration.
- `src/data/transactions.js` — synthesized movements/reservations/PRs/approvals/audit
  replaced by empty arrays fed from `setTransactions()`.
- `src/context/SafekeepingContext.jsx` — requests persist to `safekeeping_requests`
  (optimistic insert, rolled back if the insert fails) instead of dying on refresh.
- `src/main.jsx` — hydrate before render, via `.then()` rather than top-level await
  (TLA would force the build target up to es2022 and drop older browsers).
- `src/pages/Settings.jsx` — "Data source" card: Postgres vs bundled snapshot, with counts.
- Verified: build passes; all 14 routes render with zero console errors against empty
  transactional tables; the emptied pages show empty states rather than crashing.
- Next (Phase 3): wire writes — Add Material, movement entry, approvals — with audit
  logging; then CI and an error boundary.

### 2026-08-16 — Session: first deploy attempt, hosting decision
- Pushed to `origin` (https://github.com/ljrondina/Warehouse-Management), branch `main`.
  The Pages workflow ran and failed at `actions/configure-pages` with "Get Pages site
  failed … Not Found". **Cause: the repo is private, and GitHub Pages does not serve
  private repositories on a free account.** Not a misconfiguration — retrying won't help.
- Bumped `actions/checkout` → v5, `actions/setup-node` → v5, build Node → 22, clearing
  the Node 20 deprecation warning.
- **Hosting decision: make the repository public.** Vercel (free, private repo, optional
  site password) was recommended and declined.
- **Blocker found while planning that:** going public exposes the entire commit history,
  not just the current tree. Commits 3fceb5c..dd741e2 contain `src/data/inventory.js`
  (unit prices, valuations) and `supabase/seed_data.sql`. Deleting the files now would
  not help — they stay readable in history.
- **Agreed sequence** (user chose to sequence it this way, deliberately):
  1. Run `schema.sql` + `seed_data.sql` in Supabase and confirm the data is really there.
  2. Only then: strip the bundled dataset from `src/data/*`, so the published bundle
     ships empty and fills from Postgres after login; move `seed_data.sql` and the
     source data modules out of the repo (gitignored, kept locally); replace the git
     history with a single clean root commit.
  3. Then make the repo public and re-run the Pages workflow.
- **Bug fixed same session:** `guard_role_change()` rejected role changes made from the
  SQL Editor (`auth.uid()` is null there), which made the first admin impossible to
  create — the guard was unbootstrappable. It now exempts null-uid callers (SQL Editor,
  migrations, service_role); anonymous browser clients are still stopped earlier by the
  `profiles_self_update` policy, so the guard is unchanged for real user sessions.
### 2026-08-16 — Session: strip confidential data for a public repository

Database confirmed working first: `schema.sql` + `seed_data.sql` loaded, a real
Supabase account signs in, Settings reports Postgres live.

**Found while auditing what would become public:** `sample/` contained two tracked
real company documents — an 8 MB engineering drawing (`EPC. ENG. BIM. TCW101 FCD EE
Rev00`) and a real packing list (`DN015490_3641_1855`). Removed from tracking, kept
on disk, and `sample/` plus `*.pdf` / `*.xls*` / `*.csv` are now gitignored.

- **`/private-data/` (gitignored)** now holds the master copies of the real dataset:
  `inventory.js`, `ledger.js`, `safekeepingSheets.js`, `deliveryTrackerSheet.js`,
  `itemMaster.js`, `projects.js`. This is what `npm run seed` reads.
- **`src/data/*` are now empty shells** — same exports, no rows, with a comment saying
  where the data went. `trades.js` stays populated: generic construction taxonomy,
  nothing confidential. `supabase/seed_data.sql` is gitignored (it *is* the dataset).
- **`item_master` is now a table** (7,378 rows). It was an 849 KB bundled module;
  `src/components/ItemLookup.jsx` fetches it from Postgres on first use instead, and
  degrades to plain typing if the fetch fails.
- **No more fallback.** `hydrate.js` fills unconditionally and reports
  `source: 'empty'` with a reason when it cannot load. Settings shows "No data loaded"
  in red rather than a reassuring "Offline copy". The Login hero stats are hidden when
  there are no items — three confident zeroes read as an empty warehouse.
- Bundle dropped 1,546 KB → 903 KB. Verified `dist/` contains no project name, item
  code, brand or price; the only hits were form placeholders, and the one real project
  name used as an example was genericised.

**Remaining step — history reset, not yet done.** Commits carrying the dataset and the
two PDFs are still in the history, so the repo cannot go public until it is replaced
with a single clean root commit. Full backup taken first at
`private-data/history-backup-before-public.bundle` (12.9 MB, gitignored) — restore with
`git clone history-backup-before-public.bundle`. The commands were blocked by the
tooling's destructive-action guard and need to be run by the user.

Order after that: make the repo public → Settings → Pages → Source: GitHub Actions →
re-run the workflow.

### 2026-08-16 — Session: history reset landed; seed split for the SQL Editor

- History reset done by the user and **verified from outside**: the repo is public,
  has exactly one commit, and `sample/*.pdf` and `seed_data.sql` both 404 on
  raw.githubusercontent.com. `src/data/inventory.js` serves the empty shell.
- **Pages 404 diagnosis**: both workflow runs failed. Run #2 was the force-push of the
  clean commit and failed *before* Pages was enabled; enabling the source afterwards
  does not retrigger a build, so nothing has ever been published. Fix is to re-run the
  workflow manually (`workflow_dispatch` is already in the file).
- **Seed no longer fits the SQL Editor.** Adding `item_master` took the file to 1.09 MB,
  over Supabase's ~1 MB submission cap. `generate-seeds.mjs` now emits statement-aligned
  parts into `supabase/seed/NN_seed.sql`, capped at 400 KB each (currently 3 files), to
  be pasted in order. `truncate public.ledger` sits before the ledger inserts and the
  parts are ordered, so a full in-order run stays idempotent.
- `supabase/seed/` is gitignored — verified with `git check-ignore`. **Nothing in that
  folder may ever be committed: it is the dataset.**

### 2026-08-16 — Session: Inventory module — blank insight cards, mock-data audit

**Symptom:** on the live site the Inventory dashboard showed real KPIs, real charts and
a real trade distribution, but *High Stock*, *High Value*, *Low Stock*, *Fast Moving*
and *Dead Stock* were all empty. The data was not "reset" — it was never read.

**Cause:** `src/pages/dashboard/InventoryTab.jsx` built `INSIGHT_ROWS` at **module
scope**. `App.jsx` imports `Dashboard` eagerly and `Dashboard` imports `InventoryTab`
eagerly, so that top-level code ran during the import graph — i.e. while `items` was
still the empty shell, *before* `hydrate()` resolved and again ahead of the post-sign-in
re-hydration. The five lists were therefore frozen at zero rows for the life of the tab.
Everything else on the tab (`KPIS(pool)`, `movementCombinedSeries`, `byTradeL1`) is
called **during render**, which is why only these five cards were blank. Pages that call
the same helpers inside a component (`LowStock`, `Reports`, `Analytics`) were unaffected
— they are also lazy-loaded, so they mount well after hydration.

**Fix:** `INSIGHT_ROWS` is now `useMemo(buildInsightRows, [items.length])` inside the
component. Same memoisation (the lists still ignore the filter bar), but it recomputes
after every hydration pass. `items` is now imported from `../../data/insights`.

**Mock-data audit requested this session.** Confirmed genuinely from Postgres: all six
quantity KPIs, the three value KPIs, the composition battery, the trade/item-group
donut, the five insight lists, Low Stock, Reports and the Inventory table. Confirmed
**not** real, and left in place for now:
- `Analytics.jsx` — `Stock Turnover 2.4x` and `Warehouse Utilization 78%` are hard-coded
  literals, and all four trend arrows (`3.2`, `5.1`, `1.4`, `-2.3`) are invented.
- `insights.js` `TRENDS` — hard-coded percentages. Currently unused by the dashboard.
- Movement History: incoming/outgoing bars are the real ledger, and the stock curve is
  back-cast from it, but the **available/reserved split** is modelled (the sheets carry
  no reservation history) and buckets older than the ledger window are **projected** at
  the recorded daily average, not measured.
- The high-value "secure cage" (Zone HV / rack CAGE, top 36 by line value) is assigned
  in code, not a real warehouse location.

Verified `npm run build` passes.

### 2026-08-16 — Session: Analytics page — every figure now derived

Removed the last fabricated numbers in the app. Previously `Analytics.jsx` showed
`Stock Turnover 2.4x` and `Warehouse Utilization 78%` as string literals, four
hard-coded trend arrows (`3.2`, `5.1`, `1.4`, `-2.3`), and two "Last 6 months"
charts fed by a `trend(base, seed)` helper that shaped a fake curve out of the
current total. None of it touched the ledger.

**New `analytics(pool)` in `src/data/insights.js`.** One function, computed per
hydration, returning `null` (never zero) for anything the data cannot support:
- `avgCostByCode(pool)` — weighted average unit cost per item code. The ledger
  records only a code, while inventory carries several priced lines per code, so
  flows are priced at the code's blended cost to stay consistent with the valuation
  they are wound back from.
- `valueAt(t)` — valuation at day-offset `t`: today's value undone by every recorded
  flow since. Same back-cast technique as the Movement History stock curve.
- **Stock Turnover** = cost issued over the ledger window ÷ average of opening and
  closing valuation, annualised by `365 / windowDays`. Trend compares the recent half
  of the window against the earlier half.
- **Inventory Value trend** compares `valueAt(newest)` with `valueAt(newest + 30)` —
  anchored to the ledger's newest recorded day, **not to today**. Anchoring to today
  would compare the current value against itself whenever the sheets lag, and report
  a confident 0%.
- **Warehouse Utilization is gone.** Nothing in the system records rack capacity —
  zones, racks and bins are derived from the item rows in `rebuildItems()` and
  `StorageMap.jsx` — so utilisation is not computable at any accuracy. That tile now
  shows **Stock Availability** (`available / total`), which is real. It carries no
  trend arrow: there is no reservation history to compare against.
- **Non-Moving Value** was reading `overstock()` (`totalQty > minLevel * 6`), which is
  overstock, not non-movement. Now reads `issueFrequency <= 1`, matching its label and
  the Dead Stock card.
- Both trend charts now plot `valueSeries(6)` and the real monthly totals from
  `movementCombinedSeries`. Buckets predating the ledger repeat the opening valuation
  rather than sloping; the card subtitles say "back-cast from the ledger".
- The page header now states the ledger's coverage and how stale the newest movement
  is, so no reader assumes the comparison reaches the present.
- Deleted the unused hard-coded `TRENDS` export from `insights.js`.

**Verified** by bundling `insights.js` with esbuild and running it under Node against a
synthetic two-item, three-row fixture: turnover, the back-cast series, the anchored
value trend, availability and non-moving value all matched hand-computed expectations.
`npm run build` passes.

**Mock data remaining in the app after this session:** the Available/Reserved split in
Movement History (modelled — no reservation history exists) and the high-value secure
cage assignment (top 36 by line value, assigned in code, not a real location).

### 2026-08-16 — Session: Inventory module UI revamp (sub-views, composition, donut)

Three changes to the Inventory dashboard, plus the data functions they needed.

**1. The six quantity KPI cards are gone; their figures live in the composition card.**
`src/components/InventoryComposition.jsx` (new) replaces `StockBattery.jsx` (deleted —
it had no other caller). The gauge still shows the Available/Reserved split of stock on
hand; beside it sit six tiles — Total, Available, Reserved, Incoming, Outgoing, Damaged
— each with its role colour and icon, a hover description, and a click that opens the
existing `KpiListModal` drawer filtered to that column. `COMPOSITION_STATS` in that file
is the single definition of the six (field, role, icon, tooltip); `InventoryTab` no
longer carries its own `QTY_CARDS`.

**2. The distribution donut labels its slices in place.** `DistributionDonut` takes
`leaderLines`; the legend is dropped and each slice gets a leader line to its name and
percentage. Recharts' own `label`/`labelLine` places labels independently and they
collide on a 9-slice donut, so `makeLeaderLabel` lays them out as a whole: mid-angles
computed up front, split into left/right columns, spread to a 15px minimum and clamped
to the chart box. That requires deterministic geometry, hence the fixed
`startAngle={90} endAngle={-270}` and `paddingAngle={0}` in leader mode — a padding
angle makes recharts redistribute the sweep and every label drifts off its slice.
Slices under 2% are left unlabelled with a note saying how many (an unlabelled slice
must not read as missing data).

Two layout traps found while verifying and fixed:
- The ring is sized from the measured container (`useElementWidth`), not a constant: a
  126px radius that fits a desktop card pushes its labels off a phone screen. Below
  460px the donut falls back to the legend entirely.
- That measurement reads the OUTER `.donut-wrap`, never `.donut-chart`. The `leader`
  class changes `.donut-chart`'s max-width, so measuring it latched: once it fell back
  to the legend the narrower box kept the condition false and it could never return.
- `.donut-wrap.wide` now stacks under 900px. The Inventory donut asks for `wide` at
  every size, and the old rigid `flex: 0 0 360px` overflowed its own card on a phone.

**3. The tab is split into Overview / Insights / Activity**, held in `?view=` so each is
linkable and Back works between them. `Dashboard.selectTab` clears `?view` when leaving
Inventory. Order within each view puts visualisations before lists.
- *Overview* — the three value KPIs, then Inventory Composition, then Distribution.
- *Insights* — ABC analysis and Aging analysis (both follow the filter bar), then the
  five ranked lists (whole warehouse, unfiltered — labelled as such, since mixing the
  two behaviours silently was the confusing part).
- *Activity* — a totals strip, Movement History, Net Inventory Change, then Top
  Incoming / Top Outgoing.

**New in `src/data/insights.js`, all derived from Postgres rows:**
- `abcAnalysis(pool)` — Pareto by line value. Class boundaries use the cumulative share
  *before* the line is added, so the line straddling 80% lands in A and class A is
  guaranteed to cover ≥80% of value. Lines with no price are excluded, not dumped in C:
  a zero there means "no price recorded", not "cheap". Returns the per-line curve.
- `agingAnalysis(pool)` — six bands over `lastMovementOffset`, a real column, so aging
  works for lines the ledger window never reaches. Surfaces the over-90-day value.
- `ledgerActivity(pool, granularity)` — RECORDED movement only, deliberately unlike
  `movementCombinedSeries`, which projects pre-ledger buckets so its stock curve does
  not draw a cliff. Buckets outside the recorded window report zero and carry
  `covered: false`.

**New charts** in `charts.jsx`: `ParetoCurve`, `AgingBars`, `NetChangeChart`.
`NetChangeChart` shades uncovered stretches and prints "no ledger record" over them —
an uncovered bucket has a net of zero, and a zero-height hollow bar draws nothing, so
"we have no record" and "nothing moved" would have looked identical. The shading is
computed as contiguous runs rather than one span: the ledger window is contiguous, so
what falls outside it is a leading and/or trailing stretch, and one span across both
would have wrongly greyed out the covered middle.

**Supporting changes:** `Card` now forwards unrecognised props to its root element, so
`data-tour` anchors attach without a wrapper div that would break grid row sizing.
`NoData` (in `InventoryTab`) is used wherever a source is genuinely absent, instead of
an empty chart that reads as "all zeroes". The guided tour gained `search` on a step,
`Tour.jsx` compares pathname+search rather than pathname alone, and the steps were
rewritten for the new structure (two new steps: the sub-views, and Activity).

**Verified in a browser against a temporary local fixture** (240 lines, 700 ledger rows;
the fixture and its `main.jsx` hook were deleted afterwards — the dev machine has no
Supabase session, so the dashboard would otherwise render empty):
- ABC returned A 80.14% / B 14.98% / C 4.88% of value with all 240 lines classified —
  the ≥80% guarantee holds. Aging bucketed all 240 with none missing.
- Donut: 9 slices, 9 labels, minimum column gap 42.5px, nothing clipped at 1440px;
  clean fallback to the legend at 478px; no horizontal scroll at 375px.
- Clicking the Reserved tile opened the drawer with 232 materials.
- Year granularity marked 2022–2025 uncovered and shaded them; month granularity
  correctly treated a partially-overlapping February as covered.
- `abcAnalysis([])`, `agingAnalysis([])`, an unpriced-only pool and a pool with no
  movement dates all return `null`; `ledgerActivity([])` reports `hasLedger: false` —
  these are what drive the NoData panels.
- Dark mode renders all three new charts; Analytics and the Safekeeping donut (legend
  mode) are unaffected.

`npm run build` passes.

**Mock data remaining in the app after this session:** unchanged — the Available/Reserved
split inside Movement History (modelled; no reservation history exists) and the
high-value secure cage assignment on the floor plan.

### 2026-08-16 — Session: move to prcdepartment/prc-wh

Site address changes from `ljrondina.github.io/Warehouse-Management` to
`prcdepartment.github.io/prc-wh`. Code side done and committed (NOT pushed until the
repo is actually renamed — pushing first would 404 every asset on the live site):

- `vite.config.js` — production base `/prc-wh/`.
- `public/404.html`, `src/components/Logo.jsx`, `README.md` — path references updated.
- Verified `npm run build` emits `/prc-wh/` asset URLs and the SPA shim keeps
  `pathSegmentsToKeep = 1` (still exactly one repo segment).

User side: create the `prcdepartment` org, rename repo → `prc-wh`, transfer, then
`git remote set-url`, push, re-enable Pages, **re-add the two Actions secrets**
(they do not reliably survive a transfer), re-run the workflow.

**Move completed and verified 2026-08-16.** `prcdepartment/prc-wh` exists, the old repo
returns 301, run #9 on `ecd3827` succeeded, and `https://prcdepartment.github.io/prc-wh/`
returns 200 and routes to `/login`. The two Actions secrets ARE now present — the
deployed bundle contains the Supabase URL and publishable key. The deployed bundle
contains no project name, item code, brand or price. Production build confirmed: no demo
quick-sign-in panel, no credential prefill.

**Note for future confusion:** the **Actions** tab is on the REPOSITORY page, not the
organisation page. An organisation has Settings → Actions (policy only) and no run list.

Remaining before the system is usable end to end: paste `supabase/seed/01..03_seed.sql`
into the SQL Editor in order (the live database still lacks `item_master`, so the Add
Material / Safekeeping lookups will find nothing).

### 2026-08-16 — Session: Overview layout, donut figures, overlay sidebar, mobile pass

**1. Donut labels carry the figure, sized by share.** Each leader label is now two
lines: the category name at a constant 10.5px, and beneath it the quantity (or peso
value) plus the percentage, sized between 10px and 22px by the slice's share of the
ring. Scaled against the LARGEST share present, not against 100% — on a balanced
nine-slice donut every label would otherwise render at the minimum and the emphasis
would say nothing. The ramp is eased off linear (`^0.75`): pure square root compressed
26% and 8% to three pixels apart, pure linear pushed the small slices under a
comfortable reading size. `LABEL_GAP` went 15 → 30 for the second line.

**2. Overview is two cards side by side; the value KPI cards are gone.**
`.overview-grid` puts Composition beside Distribution above 1200px and stacks below it
(under that, two columns push the donut below its leader-label minimum and bounce it
into legend mode). The three value cards were removed: Total Inventory Value and
Reserved Value are the same two figures the composition tiles now show in Value mode,
and Average Value / SKU went with them, as agreed.

**3. The composition card has its own Quantity/Value toggle** — the same control the
donut has. `KPIS()` gained `totalValue`, `availableValue`, `incomingValue`,
`outgoingValue` and `damagedValue`, each the quantity column times unit price, so the
identity total = available + reserved holds for the pesos exactly as it does for the
units. The gauge's split is computed from whichever metric is showing: reserved stock
is not worth the same per unit as available stock, so the value split is genuinely a
different percentage, and drawing one while labelling it as the other would be a quiet
lie. `value` (the recorded `inventoryValue` column) is untouched and still what
Analytics reports.

**4. The available-of-SOH readout is now the card's headline** — `.comp-headline`, the
largest type on the card at 30px, with the total in a smaller weight beside it, a
caption, and Available/Reserved percentage chips underneath.

**5. Sidebar: closed by default, and it overlays instead of resizing the page.** One
piece of state (`open`), starting false. Closed on desktop is the 60px icon rail;
closed on mobile is fully off-canvas. Open is the 240px labelled panel, and on BOTH
breakpoints it now lies over the page — `.main`'s margin is pinned to the rail width
and never changes, so the dashboard underneath does not reflow and its charts do not
re-measure and redraw. A scrim appears at every width (it is a dismissible layer now,
so it also takes the click-outside and Escape closes it).

**Icon alignment** is the reason the two states read as one object: `.nav` and
`.nav-item` carry IDENTICAL horizontal padding in both, and the icon is the first
child in both, so its centre sits at 10 + 10 + 10 = 30px either way — which is also
the centre of the 60px rail. The old rules that centred the collapsed item and shrank
its icon to 17px were removed; each would move the icons on open. There is a comment
in the stylesheet saying so, because it is easy to "tidy" back in.

**6. Movement History always spans the page, legend on the left.** The expand toggle is
gone and `wide` is passed unconditionally. `.movement-wrap.wide .legend-side` is
ordered before the chart, so the reader learns what the six series are before meeting
them stacked on one frame; below 900px it drops beneath the chart as a two-column
strip.

**7. Mobile pass.** Card heads put the title on its own line and give the controls the
full width beneath. Sub-tabs scroll horizontally rather than wrapping. The composition
card stacks the gauge beside the headline at tablet width and above it on a phone; the
tiles go 3-up → 2-up → 1-up, since a peso figure plus its label will not share a
half-width tile without one of them truncating. The tile tooltip pins to the card
below 560px instead of centring on a tile it is wider than. Activity's summary strip
and the aging/ABC band rows narrow the same way.

**Bug found and fixed while verifying:** making `.card-pad` a flex row to centre the
two Overview cards collapsed the donut to zero width and it rendered NOTHING — a
recharts `ResponsiveContainer` has no intrinsic width, so as a bare flex item it
shrinks to nothing, and with `isAnimationActive={false}` that opening zero-sweep frame
is the one that sticks. Both pads now set `width: 100%; min-width: 0` on their child.

Also added: a soft `feDropShadow` on the donut ring (on the Pie, not per Cell — per
Cell each slice casts onto its neighbours and the ring looks striped), tuned separately
for light and dark.

**Verified in a browser** against the temporary local fixture (deleted afterwards,
along with its `main.jsx` hook):
- Overview at 1440px: two cards side by side, no value KPI cards, donut labels at
  22/21/20/17/16/15px following share, nothing clipped.
- Item Group view: 9 slices, 9 two-line labels, zero vertical overlaps, none clipped.
- Sidebar closed → open: width 60 → 240, icon centres 31 → 31 (unchanged), `.main`
  left edge 60 → 60 and content width 1370 → 1370 (page does not move).
- Value toggle: all six tiles and the headline switch to pesos, Available ₱408.9M +
  Reserved ₱73.4M = Total ₱482.4M.
- Movement History: card 1314px wide, legend left of the chart on desktop, below it at
  375px, expand button absent.
- 375px across all three sub-views: no page-level horizontal scroll, nothing truncated.
  (The only element exceeding the viewport is the locked Excess tab inside
  `.dash-tabs`, which is a scroll container by design.)
- No console errors.

**Measurement caveat:** the browser pane was hidden during this session, so CSS
transitions do not advance and screenshots are unavailable. Sidebar widths were
therefore measured with transitions disabled; the end states are correct, but the
open/close animation itself was not observed.

`npm run build` passes.

### 2026-08-16 — Session: strip card sub-headers, fix the Overview desktop layout

**1. Descriptive card sub-headers removed app-wide.** Every `sub=` that restated what a
card showed or explained how to use it is gone — the seven on the Inventory tab, the
Delivery Tracker's, and MaterialProfile's "Repository". Card heads now carry a title,
an icon and their controls, nothing else.

Two of them were not descriptions but data caveats, so those moved under their chart as
a `.card-note` footnote rather than being deleted: Movement History's "available/reserved
split is modelled" and Analytics' "back-cast from the ledger" on both trend charts. The
`sub` props that survive are counts, not prose — MaterialProfile's "12 transactions",
Settings' "7 trades" — which are data the header is the right place for.

**2. Analytics' Trade Distribution now uses leader lines.** It was the last donut still
drawing the old colour-key legend, which is what "the distribution chart still uses the
old legend style" was pointing at — the Inventory Overview donut was already in leader
mode at every desktop width I could measure (verified again this session at 1280, 1440
and 1920). The Safekeeping donut deliberately keeps `hideLegend` and no leader lines: it
is paired with a ranked list of the same breakdown, so labelling the ring too would
print every category twice.

**3. The Overview desktop layout was genuinely broken, and this was the mess.** In the
two-column grid the composition card is ~490px wide, and `.comp-wrap` was a plain flex
row with the tile grid at `flex-basis: 420px`. Gauge (230px) plus tiles (420px) does not
fit 490px, so the tiles wrapped BELOW the gauge — leaving the gauge stranded in a 230px
column with a third of the card empty beside it, and the card 80px taller than the donut
it sits next to (531px vs 448px).

Above 1200px the card now lays out top-to-bottom instead: a horizontal gauge band (tube
beside the headline, which is where the headline reads best anyway) with the six tiles
in a full-width row underneath. Card heights are now 395 vs 448 at 1440px and 461 vs 448
at 1280px.

The tile grid uses `repeat(auto-fit, minmax(150px, 1fr))` rather than a fixed three
columns: the composition column is three tiles wide at 1440 and two at 1280, and forcing
three truncated the longest label on the narrower screen.

**4. The per-tile unit chip is gone.** Printing "units" six times down the card cost the
figures the width they needed — at three-across every tile truncated both its value and
its label. The headline beside the gauge already names the unit once, the card's own
Quantity/Value toggle says which metric is showing, and each tile's title attribute
still carries the exact figure with its unit. "Total Inventory" was also renamed **Total
on Hand** — more accurate for what it counts, and the one label short enough to fit a
third-width tile.

**Verified** against the temporary fixture (deleted afterwards with its `main.jsx` hook):
zero `.card-sub` elements on all three Inventory views and on Analytics; both caveat
footnotes present; Analytics' donut renders 6 leader labels with quantities and nothing
clipped; at 1280/1440 nothing truncates in either Quantity or Value mode (Value tiles
run ₱482.4M / ₱408.9M / ₱73.4M / ₱70.7M / ₱51.7M / ₱6.8M); card-head height is a uniform
59px across every card on Insights and Activity; no horizontal scroll at 375px and the
mobile stacking is unchanged. `npm run build` passes.

### 2026-08-16 — Session: topbar restructure, sidebar simplification, mobile leader lines

**Sidebar — the icon rail is gone.** One state, two positions: the burger either shows
the 240px labelled panel over the page or hides it off-canvas, at every width. `.main`
reserves no width for it at all, so content keeps the same width in both states and the
dashboard never reflows when the nav opens. All the `.app-shell.nav-collapsed` rules and
the `collapsedRail` logic were deleted along with the alignment machinery that existed
only to keep the two states' icons in the same place.

**Topbar — page title left, warehouse right, account behind the avatar.** `pageTitle()`
in `Layout.jsx` derives the title from the route (the dashboard's three tabs are the one
path that carries two names). The warehouse name moved to the right as fixed context and
drops below 1100px. The user's name, department and the separate sign-out button — the
widest thing in the bar — are now inside an avatar dropdown holding the name, department,
role, Account settings and Sign out.

**Consequence, handled: every page carried its own heading that now duplicated the
topbar.** Removed from thirteen pages. Two kept theirs for cause: MaterialProfile's is
the material's description, not a page title, and StorageMap's carried the guided tour's
`floor` anchor, which moved onto the note beneath it. Three pages lost their last `<Icon>`
with the heading, so those imports went too.

**Filter bar** — placeholder copy and the "779 materials" count both removed. The
`resultCount`/`noun` props stay so no caller needed editing.

**Insights — ABC analysis removed**, and Aging takes the slot beside Dead Stock: six
cards in three uniform two-across rows, all 681px wide and within 31px of the same
height. Both cards answer "what is not moving", so they belong together. `abcAnalysis()`
and the `ParetoCurve` chart were deleted rather than left as dead exports. Aging is the
only card on the view that follows the filter bar, so it carries a "current filter" chip
— the lists beside it read the whole warehouse.

**Overview desktop — uniform and scroll-free.** Both cards stretch to the same height
and centre their contents; measured identical at 1440×900 and 1366×768, with no vertical
scrolling at either. Inside the composition card the headline now takes `flex: 1` beside
the tube, which closed a ~150px dead gap at the band's right edge — the gauge band's
edges now line up exactly with the tile row beneath it.

**Donut — leader lines everywhere, full names.** The fixed geometry constants were
replaced by `LEDGER_TIERS`, four width tiers that trade ring size against the room the
two text columns need. Phones get leader lines now (they fell back to the legend before):
at a 324px chart the ring drops to 62px and all six trade names render in full with their
quantities, or all nine item groups with four ellipsised. `maxName` went from a flat 16
to 28 at desktop, so nothing ellipsises there at all. Each tier's `gap` is the label's
own two-line height rather than an arbitrary number — at 25px the bottom two labels in a
column still touched.

**Mobile card heads — the real bug.** `.card-head` inherits `flex-wrap: wrap`, and last
session's mobile rule switched it to `flex-direction: column`. Wrapping in a column
container happens along the COLUMN axis, so the segmented toggles did not drop under the
title: they wrapped into a second column beside it and ran clear off the right edge of
the card (measured right edge 575px against a card ending at 362px). That is what "the
option buttons are a mess" was. `flex-wrap: nowrap` plus `flex: 0 0 auto` on the first
child fixes it; controls now stack under the title, left-aligned to the same edge, inside
the card.

**Mobile page head** — the title moved to the topbar, so this row is just the greeting
and two actions. Both buttons collapse to 36×36 icons below 760px, and the role drops off
the greeting below 520px rather than ellipsising mid-word.

**Verified** against the temporary fixture (deleted afterwards with its `main.jsx` hook):
no vertical scroll at 1440×900 or 1366×768; composition and distribution identical height
and top edge; donut leader labels present at 1440 (6 trades, 9 item groups, none clipped,
none overlapping, none ellipsised) and at a 324px chart (same counts, no clipping, no
overlaps); sidebar closed x=-240 → open x=0 with content width unchanged at 1440 in both;
account menu opens in-viewport with name, department, role and both options; zero
`.card-sub` and zero `.fs-count` anywhere; eight routes checked for the correct topbar
title and no duplicated heading. `npm run build` passes.

### 2026-08-16 — Session: Floor Plan module rebuilt from the CW Taytay warehouse plan

The floor plan was a fiction: five invented zones A–E, racks R01–R30, shelves S1–S6 and
bins B01–B35, none of which describe the building. It is now drawn from
`sample/EPC. FIN. WM. CW Taytay Warehouse Plan.pptx` and has three levels.

**How the reference was read.** The deck was unpacked and its slides rendered through
PowerPoint COM (`$app.Presentations.Open(...).Export(...)`); LibreOffice and Python are
not on this machine. The zone overlays are native PowerPoint shapes over CAD rasters, so
the geometry was pulled straight out of the slide XML — including group transforms and
the 90° rotation slide 9 applies to its base image — rather than eyeballed. The rack runs
were located by scanning the CAD raster for its magenta wall lines and grey rack frames.

**What the drawing actually says, once decoded.** The plan has SIX rack runs, but the deck
names ELEVEN racks. Run 1 stands alone against the west wall (13 bays, `1159 R-W`); runs
2–6 are back-to-back pairs (10 bays a side, `3950 R-R`). 1 + 5×2 = 11. That reading was
then confirmed against the highlight geometry: mapping slide 9's Structural strip back
into raster pixels lands on ix 208.6–225.3, exactly the left half of run 3, and
Architectural on 224.2–241.7, exactly its right half. So **Rack 4 and Rack 5 are the two
faces of one run**, and MEPFS = runs 1–2, Safekeeping = runs 4–6. Bay pitch cross-checks:
Rack 1 is 449 units for 13 bays, the others 345 for 10 — 34.5 either way.

**`src/data/warehouseMap.js` (new).** Geometry and placement in one place, holding the RAW
drawing coordinates (slide inches for the site, CAD raster pixels for the warehouse) with
the conversion applied by `sr()` / `pl()`, so any shape can be checked against its source.
1 raster px ≈ 76 mm, derived from the drawing's own 3950 mm clear aisle measuring 52 px.

- **Site** — property boundary (the slide's own freeform path), the shed as three rects
  (main shed plus two wings either side of the loading recess — one box would swallow the
  recess), Deformed Rebar, Tiles Area, MRF (the one area drawn at an angle), stock yard,
  parking, canopies, gate, guard posts, vehicle routes.
- **Warehouse** — building envelope, 11 racks, the cantilever run along the east wall, the
  open floor area, LS600 shelving in the high-value room, eight rooms, and the two open
  flat areas with the drawing's stated 628.63 / 262.84 / 90.45 m².
- **Racking** — Interlock 600 selective, beam elevations 1095 / 2295 / 3545 / 4795, frame
  5000, Type A 2300 CE / 1200 kg and Type B 3300 CE / 1500 kg; cantilever 3000 upright,
  900 bay centre, 1000 arm, 300 kg; LS600 4 levels at 167 / 717 / 1267 / 1817.

**Placement — the honest part.** The stock sheet records no physical location, so the map
places every line by the rule the plan itself implies: item group first where the plan
puts that group outdoors (rebar → Deformed Rebar, tiles → Tiles Area), then value (the
existing `isHighValue` top-36 → the locked room), then trade (the four areas inside the
shed ARE trade areas). Steps 1–3 are a real reading of the plan. Step 4 — which bay a line
sits in — is a MODEL: lines are ordered by issue frequency and laid in from ground level
up, so fast movers sit at pick height. Every screen showing a bay says so, and the
capacity read-out distinguishes the two ("capacity is counted off the racking drawing;
which line sits in which bay is modelled").

Audited in the browser against a temporary anonymised fixture: 779 lines = 730 inside +
49 outdoors, zero unplaced, zero double-placed. Note 36 lines are flagged high value but
32 reach the cage — four are tiles, and the outdoor assignment deliberately wins over
value, because a tile pallet is outside whatever it is worth.

**Colour.** The deck legends its areas in teal / magenta / amber / yellow / purple, none of
which are in this design system. Each maps to the nearest sanctioned hue, fixed once at
the top of the floor-plan CSS block. Safekeeping keeps yellow — the deck's own colour, and
the warehouse's largest area — which is the one use of yellow outside its warning role;
no low-stock warning is ever drawn as an area fill, so the two cannot be confused.

**Other files.** `MaterialProfile` now reads `locationOf(item)` and shows Building → Area →
Rack → Bay → Level instead of the dead Zone/Rack/Shelf/Bin columns. The guided tour's
floor step was rewritten for the three levels; its anchor moved to `.fp-topbar`.
`Movement.jsx` still defaults to `Zone A / R01` — left alone, flagged below.

**Bugs found and fixed while verifying** (browser pane hidden again, so measured through
the DOM rather than screenshots):
- `getBBox()` reports coordinates in the element's LOCAL space, so every label inside a
  rotated or translated group read as out-of-bounds. All checks were redone through
  `getBoundingClientRect()` mapped back to viewBox units.
- "DELIVERY TRUCK PARKING" ran 11 units past the drawing's right edge, and the Open Stock
  Yard label sat on top of the Tiles Area name. Added `planText.jsx`, which wraps a label
  to its box; the yard's own label is pinned to the top of its box because the rebar and
  tiles areas sit inside it.
- The rack number was centred on the run, which put it exactly under the area label for
  Structural and Architectural — the two areas that are one rack deep. Numbers moved to
  the run's head.
- **Page scrolled sideways by 207–307 px at 375 px.** A grid item defaults to
  `min-width: auto`, so `.fp-layout`'s column grew to the plan's `min-width` instead of
  letting `.fp-stage` scroll. Fixed with `minmax(0, 1fr)` plus `min-width: 0` on the items.
- The level switcher overran a phone by 7 px; its icons are hidden below 560 px.
- The cantilever run and two rooms floated a few pixels outside the shed wall — raster
  measurement drift, snapped back to the wall line. The loading bay still projects past
  it, correctly: it does that in the plan, under the canopy.

**Verified**: site / warehouse / rack / cantilever / shelving / floor views at 1440×900 and
375×812, light and dark — zero labels clipped, zero label overlaps, zero page-level
horizontal scroll, no console errors on a clean dev server. Drill-down, breadcrumbs, the
back button and bay selection all exercised. Geometry audit: all racks, rooms, hulls and
open areas inside the envelope; back-to-back pairs touch exactly; run pitch 86 px on all
four gaps between double runs. `npm run build` passes.

**Known, deliberately not fixed here:** the shared topbar overflows 375 px on every page
(3 px on /dashboard, 9 px on /inventory, 18 px here) — the page title pushes the avatar
past the edge. It is in `Layout.jsx`, pre-dates this work, and is spun off separately.
`Movement.jsx`'s location fields still use the old vocabulary; it is a read-only Phase 3
form. Real recorded locations remain the eventual fix — add a `location` column and
`placement()` becomes a lookup instead of a rule.

### 2026-08-17 — Session: topbar icons, tour button, notification-dot bug, greeting removed

Five small UI requests, all in `Layout.jsx`, `Dashboard.jsx` and `index.css`.

**1. Every page title in the topbar now carries an icon.** `Layout.jsx` gained
`ROUTE_ICONS`/`DASH_ICONS` maps (same keys as the existing `ROUTE_TITLES`/`DASH_TITLES`)
and a `pageIcon()` alongside `pageTitle()`. Each icon name matches the one the sidebar
already uses for that destination — the topbar title and the nav item that led there
carry the same glyph. `.topbar-title-wrap` lays the icon beside the `<h1>`.

**2. "Take a Tour" moved into the topbar, next to Notifications, as a question-mark
icon button.** It used to be a labelled button on the Dashboard page itself
(`.page-actions`, removed — see #4), which meant the tour trigger only existed on one
page even though `<Tour />` runs globally from `Layout.jsx`. `useTour()` is now called
in `Layout.jsx`, and the icon button sits between the theme toggle and the bell,
`data-tour="tour-btn"` moved with it. `Icon` gained a `help` glyph (circle with a
question mark) since none of the existing 40-odd icons fit.

**3. Fixed the notification unread dot — it was never actually on the bell.** `.icon-btn`
had no `position: relative`, so the dot's `position: absolute` (set inline in
`Layout.jsx`) resolved against the nearest positioned ancestor up the tree instead of
the button — it rendered as a stray red dot elsewhere in the topbar rather than on the
bell icon. This is what "the notification colors are wrong" was pointing at: not a
wrong hue, a wrong position that then reads as a color problem because the dot shows up
somewhere it isn't supposed to be. One line (`position: relative` on `.icon-btn`) fixes
every icon-button badge, not just this one.

**4. The dashboard greeting ("Good day, {name} · {role}") is gone entirely** —
`.page-head` / `.page-greeting` / `.page-actions` / `.greeting-role` deleted from both
`Dashboard.jsx` and the stylesheet. Nothing replaced it; the topbar title already says
what page this is, and the account menu already carries the name and role.

**5. New Transaction now shares a row with the Inventory/Safekeeping/Excess tabs**,
pinned to the row's right-most end, sitting on top of the tab strip's own border
instead of in a separate toolbar row above it. New `.dash-tabs-row` wraps `.dash-tabs`
(now `flex: 1 1 auto`) and `NewTransactionMenu`'s `.txn-wrap`; below 760px the row wraps
and the button (icon-only at that width) stays pinned to the right edge above the tabs
via `order: -1` plus `justify-content: flex-end` on the wrapped row.

**Verified** against the other session's already-running dev server (this machine has a
live Supabase session cached from an earlier login, so the dashboard rendered against
real auth without a temporary fixture): topbar heading shows a 17×17 icon beside
"Inventory Insights"; Take a Tour sits between the theme toggle and the bell; the
notification dot's bounding box (1184–1192, 17.5–25.5) now sits inside the bell
button's box (1162–1200, 10.5–48.5), confirming the fix; no "Good day" text anywhere in
the rendered page; at 1280px the New Transaction control's right edge (1242) matches the
tab row's right edge exactly, vertically centered against it; at 375px the button sits
top-right (327–363, matching the row width) with the tabs wrapped beneath it and zero
horizontal page overflow. No console errors. `npm run build` passes.

### 2026-08-17 — Session: Floor plan levels 1 and 2 — decluttered, portrait, gradients

Seventeen changes to the stockyard view and six to the warehouse view, all cosmetic or
compositional; the placement model and the racking level are untouched.

**Level 1 — the site is now only what holds material.** Removed the 9.0 m unloading
area, car park, delivery-truck parking, queue parking, the loading/unloading block, the
canopy and gate slivers, the guard-post markers, the ingress/egress arrows and the north
arrow. All of it was vehicle logistics, and on a card-sized drawing it crowded out the
four areas the level exists to show. `SITE_FACILITIES`, `SITE_MARKERS` and `SITE_ROUTES`
are gone; the single surviving piece of context is `SITE_YARD`, widened west from
x 4.32 to x 3.90 so the deformed-bar bay sits inside it as it does on the drawing.
The card is titled **Stockyard**, "Deformed Rebar" is now **Deformed Bar Area**.

**Merged outlines.** The shed was three overlapping rectangles and the tiles bay two,
which left seams where the boxes met. Both are now single rectilinear outlines
(`SITE_BUILDING`, `SITE_TILES`) that keep the real shape — the shed still has its
loading recess notched out of the bottom, the tiles bay is still wide at the top and
narrower below. Same for Safekeeping and the open floor on level 2.

**Gradients.** `planDefs.jsx` (new) emits one diagonal gradient per area role, stops
reading the same `--fp-*` tokens the flat colours use, so a gradient tracks the theme
without a second palette. Opacity lives in the stops, which leaves `fill-opacity` free
to carry hover and selection on top. The shed shell and the open floor get neutral
gradients of their own so they read as surfaces, not as a sixth material area.

**Level 2 is portrait now, and that is what makes it line up with level 1.** The deck
presents the warehouse rotated 90° clockwise; the underlying CAD is portrait. Portrait is
the orientation that matches the site plan — on both drawings the rack runs stand
vertical, the entrance canopy is on the west wall about three-quarters of the way down,
and the loading recess is bottom-centre. Rotating the landscape view clockwise (as
literally asked) would have put it 180° from the shed you just clicked; rotating it the
other way is what "in line with the level 1 map" actually means, so `pl()` is now an
identity map and every measurement stays in the coordinates it was taken in. A portrait
drawing cannot be sized by width without running past the fold, so `.fp-stage-portrait`
leads with height (`max-height: 78vh`, width follows the intrinsic ratio) and centres it.

Also on level 2: the stated square-metre figures are off the map, the rack-run bay
divisions now run horizontally to suit the rotation, and both legends and both card
footnotes are gone from levels 1 and 2 (level 3 keeps its cell legend, which decodes
colour rather than repeating the drawing).

**Label sizing.** `PlanText` now drives every label on both plans. The area-label
rotation threshold went from `h > w * 1.4` to `h > w * 2.2`, because the high-value room
is 119 × 175 — barely oblong — and turning text in a near-square block looks wrong. A
hull one rack deep (~21 units across) drops to 12 px so its name fits on one line inside
the run; a hull that stays horizontal drops to 13 px because it wraps to several lines.
The MRF label is wrapped and sized to its own angled box, where at heading size
"MATERIAL RECOVERY" alone was wider than the bay it names. Rack numbers went 11 → 13 px:
the portrait plan renders about 0.76 viewBox units to the pixel.

**The contrast complaint was a real bug, not a taste issue.** This stylesheet's
`button { font-family: inherit; cursor: pointer; }` does not set `color`, so the site
tiles and the area rows — both `<button>` — were painting the user agent's own
`buttontext` black. On the dark theme's near-black card that is invisible. Both now set
`color: var(--text)` explicitly, carry their area's colour as a left border and on the
figure, and the two 10–11 px captions moved from `--text-faint` to `--text-muted`.
Measured after: every text/background pair on those cards is now **5.8:1 or better in
both themes** (worst was 3.82:1 before, and the tile name was effectively 1:1 in dark).

**Bug found while verifying:** dropping `rects: []` from the MRF entry meant the
deformed-bar area had no label box either, and `centreOf(undefined)` crashed the whole
site level. `SITE_AREAS.forEach` now falls back to the outline's bounds, then to the
area's single rectangle.

**Verified** at 1440×900 and 375×812, light and dark, on all three levels: zero labels
clipped, zero label overlaps, zero page-level horizontal scroll from anything in `main`,
no console errors on a clean dev server. Every level-2 area label measured inside its own
hull. Click-through exercised end to end — tiles → panel, shed → warehouse, safekeeping
hull → panel, Rack 10 → 50-cell elevation, breadcrumb back up.

**Still outstanding, unchanged:** the shared topbar overflows a 375 px viewport on every
page (38 px on /dashboard, 44 px on /inventory, 50 px here — it grows with the page
title). Confirmed again this session that nothing inside `main` contributes to it; it is
`Layout.jsx` and is being fixed separately.

### 2026-08-17 — Session: floor plan polish — icons, textures, rotation, depth hierarchy

**Level 1.** "Deformed Bar Area" → **Deformed Rebar Area**. The MRF label is now sized
and wrapped to its own angled box at 9.5 px with the icon above it (it kept reading as
too big because it was sized like the rectangular areas, which are three times wider).
Entrance/exit signage is back, at the two places the deck marks it: the roll-up gate on
the shed's west wall (slide 4's yellow strip, label set vertically beside it) and the
site gate on the south access road where the EXIT/ENTRY arrows meet the property line —
`SITE_GATES`. Each clickable area carries an icon drawn into the plan and a fine
diagonal hatch over its fill, so a block reads as a stocked surface rather than a
flat swatch.

**Level 2 — rotation.** `WarehousePlan` takes `orient`, held in the URL as `?rot=l`.
Geometry is still stored portrait; `mr()` and `mp()` map rects and outlines into
whichever orientation is showing, so the rotation lives in exactly one place. Labels
recompute their own wrap width, size and rotation from the MAPPED box, and the rack bay
divisions pick their axis from whichever side of the run is longer — so both
orientations lay out correctly rather than one being a rotated screenshot of the other.
Portrait stays the default because it matches the shed on level 1; landscape is the
deck's own presentation.

**Level 2 — depth.** Three tiers now, and the difference is deliberate:
- *Context* (rooms, circulation floor) — flat tint, **no outline at all**, muted text.
- *Section areas* (MEPFS, Structural, …) — a soft gradient wash, dashed edge, and a
  **Sections toggle** (`?sections=0`) that hides them entirely. With them off, the racks
  and floor bays keep their own colours and the plan reads as pure racking.
- *Clickable* (racks, cantilever, open flat area) — the strong gradient, textured,
  outlined. `planDefs.jsx` now emits both a soft and a solid gradient per role.

**Level 2 — geometry fixes against the reference.**
- **The cantilever does not run wall to wall.** Scanning the raster for its arm ticks
  puts the comb at iy 32–550, not 32–838: it stops at the green line about two-thirds
  down. 518 px at ~76 mm/px is 39.4 m, which at the drawing's 900 mm bay centres is
  **42 bays**, not the 22 previously assumed (126 arm positions, not 66).
- **Floor Area → Open Flat Area**, and moved. The drawing's own
  "OPEN FLAT AREA A = 262.84 m²" label sits at the bottom-right of the yellow
  Safekeeping highlight, so the clickable block is now there (ix 410–604, iy 565–838)
  rather than the strip beside run 6 where it had been placed.
- The Safekeeping outline was re-measured off slide 13's highlight and the loading bay's
  bottom edge is pinned to the building's own wall line.
- Every unclickable region now clears every other region: audited context/context,
  context/clickable and clickable/clickable — **zero overlaps**, where the EE cabinet and
  security check had been clipping 1 px into the high-value room.

**Two real bugs, both about colour inheritance.**
- The plan icons rendered in the page's text colour, not their area's. The icon set
  strokes with `currentColor`, but the role classes only set `fill` (which is what SVG
  `<text>` needs). Both `fill` and `color` are now set, and `--c` cascades from the area
  group so any icon inside picks it up.
- **`.fp-mrf` was two different things**: the Material Recovery Facility's area-role
  class on the map, and the explanatory note block in the site overview card. The note's
  rule sits later in the stylesheet, so its `color: var(--text-muted)` silently won for
  the MRF icon on the plan. The note block is now `.fp-mrf-note`.

**High-value contrast fixed.** `--fp-highvalue` was near-black (#2b2c2b) in light mode,
which gave the area no presence on white paper and made its own label barely readable.
Now #4d4b4b light / #c4c3c3 dark — same neutral hue, real contrast: **8.3:1 in light and
9.6:1 in dark** against the drawing surface. The padlock and diagonal hatch still carry
"secure".

**The 42-bay cantilever elevation needed a minimum width.** Scaled to fit the card it
landed at 0.33 and its bay numbers were three pixels wide. It now sets a floor of ~26 px
per bay and scrolls inside the stage instead: 1,202 px wide, 25.6 px cells, readable.

**Verified**: 22 desktop view/theme combinations (site, site+MRF, warehouse in both
orientations × sections on/off, high-value selected, and all four racking views, in light
and dark) plus 5 at 375 px — zero labels clipped, zero label overlaps, nothing in `main`
outside a scroll container. Rotate and Sections exercised by click; rack drill-down works
in landscape with sections off. `npm run build` passes.
