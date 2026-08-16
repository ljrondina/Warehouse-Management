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

- **Data**: **Postgres (Supabase)**, loaded before first render by `src/lib/hydrate.js`.
  The JS modules in `src/data/` remain as the **bundled fallback** — if Supabase is
  unconfigured, unreachable, or a reference table is empty, the app serves the compiled
  snapshot instead of breaking. Settings → *Data source* shows which one is live.
- **Auth**: `src/context/AuthContext.jsx` uses Supabase `signInWithPassword`, then reads
  `public.profiles` for the role. Falls back to `DEMO_USERS` + `DEMO_PASSWORD` from
  `src/data/roles.js` when Supabase is unconfigured **or when the real login fails**.
- **Backend**: `supabase/schema.sql` (all tables, RLS, `is_admin()`, role-escalation guard,
  signup trigger) + `supabase/seed_data.sql` (**generated** — never edit by hand).

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

**Seed generation**: `npm run seed` → regenerates `supabase/seed_data.sql` from the JS
modules. Run it whenever a `src/data/*.js` source module changes. (The old hand-written
`seed_inventory.sql` had drifted to a different snapshot and was missing five columns;
generating removes that failure mode.)
- **Git**: branch `master` locally; **`main` is the deploy branch** on GitHub.
- **Deploy**: GitHub Pages project site at `https://ljrondina.github.io/Warehouse-Management/`,
  built by `.github/workflows/deploy.yml` on every push to `main`.

## Deployment (GitHub Pages)

- **Repo**: `ljrondina/Warehouse-Management` · **Branch**: `main` · **Pages source**: GitHub Actions.
- **Base path**: `vite.config.js` sets `base = '/Warehouse-Management/'` for production
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
| ~~3~~ | ~~All business data lives in JS files~~ | **Fixed 2026-08-16** — all data in Postgres; the JS modules survive only as an offline fallback. |
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
