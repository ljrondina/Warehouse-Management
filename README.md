# Megawide WMS — Warehouse Management System (Prototype)

Enterprise-grade Warehouse Management System prototype for **Megawide Construction Corporation**,
built for the **Central Warehouse Taytay**. Streamlines inventory monitoring, material movement,
reservations and warehouse operations with role-based access.

Built with **Vite + React + Supabase**, styled to the official Megawide brand book
(Megawide Red `#ee3124`, Gotham/Avenir → Montserrat/Barlow Condensed), with **light & dark mode**.

The dashboards, tables, charts and material profiles are driven by the **real inventory dataset**
(`MCC. FIN. WM. Central Warehouse Inventory 2026 07 14.xlsx`) — **789 line items**, ~447K units,
~₱109M value. Reserved / available / incoming / outgoing / damaged quantities, minimum levels and
storage locations are deterministically synthesized for prototype realism (the source file only
carries stock-on-hand, unit price and class).

---

## 1. Prerequisites

Install **Node.js 18+** (this includes `npm`): https://nodejs.org

```bash
node --version   # should print v18 or higher
```

## 2. Install & run

```bash
npm install
npm run dev
```

Open http://localhost:5173

> The `.env` file already contains the Supabase URL + publishable key for the
> `ahwfkdgvkmhnrlmhumgn` project. To point at a different project, edit `.env`
> (see `.env.example`).

## 3. Supabase setup (real auth + role-based access)

1. Open your project → **SQL Editor** and run **`supabase/schema.sql`**.
   This creates `profiles` (with a `wms_role` enum), row-level security, and a
   trigger that **auto-assigns a role** based on the sign-in email prefix.
2. Run **`supabase/seed_data.sql`** to load the warehouse dataset (1,622 rows).
   Regenerate it from the source modules any time with `npm run seed`.
3. Create the five demo users in **Authentication → Users → Add user**
   (email confirmed), all with password `megawide2026`:

   | Email | Auto-assigned role |
   |-------|--------------------|
   | `admin@megawide.com.ph` | System Administrator |
   | `warehouse@megawide.com.ph` | Warehouse Personnel |
   | `procurement@megawide.com.ph` | Procurement |
   | `site@megawide.com.ph` | Project Site |
   | `management@megawide.com.ph` | Management / Supervisor |

   The signup trigger creates each `profiles` row and sets the role automatically.

> **Demo fallback:** if the Supabase env vars are missing, or a profile row
> isn't found, the app resolves the role from the email using the built-in demo
> mapping — so the prototype is always presentable. The **Switch Role** control
> in the top bar lets you preview every role's dashboard and menu instantly.

## Key features (Phase 1)

- **Unified dashboard** for every role — *"Inventory Insights"* merging quantity + value KPIs (hover any card for a full description), with actions **locked by permission** (e.g. Add Material shows 🔒 for roles without rights).
- **Interactive charts** — Inventory by Category with a scope dropdown (drill from categories into a category's subcategories) and a Quantity/Value toggle, plus a distribution donut that switches between category/subcategory and quantity/value. Values shown at a glance.
- **Add Material** — form using the reference sheet's **SAP item-code format `DD-DD-DDD`** (e.g. `23-10-121`); known codes auto-fill description/category/UOM/type; a generator suggests valid unused codes.
- **Material Profile** — full master sheet: all add-form fields + specifications, reference image, location (Zone→Rack→Shelf→Bin), that material's movement history, current reservations and attached documents.
- **Warehouse Floor Plan** — a seat-picker-style interactive layout of the Taytay ground floor. Click a **zone → rack → shelf·bin** to see exactly what's stored there. High-value materials live in a dedicated **secure cage (Zone HV)**.
- **Guided walkthrough** — a step-by-step spotlight tour of every function (button: **Take a Tour** on the dashboard).
- **Responsive** — desktop and mobile layouts (collapsible sidebar, stacked grids).

**Phase 2 (planned):** QR-code tagging for scan-based material movement and location updates.

## 4. Roles & what each sees

| Role | Menu highlights | Dashboard focus |
|------|-----------------|-----------------|
| **System Administrator** | Inventory, Users, Audit Logs, Settings, Reports | Full analytics (Quantity → Risk → Value) |
| **Warehouse** | Inventory, Incoming, Outgoing, Reservations, Storage Map | Operational stock & movement |
| **Procurement** | Inventory Monitoring, Low Stock, Purchase Requirements | Replenishment & demand |
| **Project Site** | Request Materials, My Reservations, Delivery Tracking | Project material visibility |
| **Management** | Approvals, Reports, Analytics | Executive value/risk analytics |

## 5. Deploy to GitHub / hosting

```bash
git init && git add . && git commit -m "Megawide WMS prototype"
git remote add origin https://github.com/ljrondina/Warehouse-Management.git
git branch -M main && git push -u origin main
```

Deploy the `npm run build` output (`dist/`) to Vercel / Netlify / any static host.
Set the two `VITE_SUPABASE_*` variables in the host's environment.

## Project structure

```
src/
  data/         inventory.js (real data) · roles.js · insights.js · transactions.js
  context/      AuthContext (Supabase auth + role) · ThemeContext (light/dark)
  components/   Layout · ui (KPI/Card/Table/Modal/Badge) · charts · Logo
  pages/        Login · Dashboard · Inventory · MaterialProfile · Movement ·
                Reservations · Approvals · Users · AuditLogs · Reports ·
                Analytics · StorageMap · Settings · LowStock ·
                PurchaseRequests · RequestMaterials · DeliveryTracking
supabase/       schema.sql · seed_data.sql (generated by scripts/generate-seeds.mjs)
```
