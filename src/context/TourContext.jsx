import { createContext, useContext, useState, useCallback } from 'react'

const TourContext = createContext()

// Each step targets an element by [data-tour="key"]. `route` navigates there first.
export const TOUR_STEPS = [
  { key: 'header', route: '/dashboard', title: 'Welcome to Megawide WMS', body: 'This is your Inventory Insights dashboard — the same view for every role, with actions locked based on your permissions. Let’s walk through the key functions.' },
  { key: 'dash-tabs', route: '/dashboard', title: 'Three Dashboards', body: 'Inventory covers warehouse-owned stock; Safekeeping covers project-owned materials stored here as a service. Excess — surplus recovered from completed projects — arrives in Phase 2 and is locked 🔒 for now.' },
  { key: 'kpis', route: '/dashboard', title: 'Inventory KPIs', body: 'Quantity and value indicators at a glance: total, available, reserved, incoming, outgoing and damaged. Hover any card for a full description.' },
  { key: 'charts', route: '/dashboard', title: 'Interactive Charts', body: 'Break inventory down by category — or drill into a category’s subcategories — and toggle between Quantity and Value. The distribution donut switches the same way.' },
  { key: 'insights', route: '/dashboard', title: 'Ranked Insights', body: 'High stock, fast-moving, low-stock, overstocked, high-value and non-moving materials. Click any row to open that material’s profile.' },
  { key: 'add-btn', route: '/dashboard', title: 'New Transaction', body: 'Every creation flow starts here: Receipt, Issuance, Transfer, Return and Reservation. Receipt captures materials with SAP-format item codes (DD-DD-DDD); Transfer → Safekeeping raises a safekeeping request. Entries your role can’t create are locked 🔒.' },
  { key: 'nav', route: '/dashboard', title: 'Navigation', body: 'Your menu adapts to your role. Warehouse handles movement & storage; Procurement sees replenishment; Site requests materials; Management approves.' },
  { key: 'topbar-tools', route: '/dashboard', title: 'Tools & Theme', body: 'Switch roles to preview access levels, toggle light/dark mode, and check notifications for low stock and pending approvals.' },
  { key: 'qty-dropdown', route: '/inventory', title: 'Quantity Status View', body: 'On the inventory master list, switch the prioritized quantity column — Total, Available, Reserved, Incoming, Outgoing or Damaged — plus filters and search.' },
  { key: 'floor', route: '/storage', title: 'Warehouse Floor Plan', body: 'Pick a zone, rack, shelf or bin — like choosing a seat — to see exactly what’s stored there. High-value items sit in a dedicated secure cage.' },
  { key: 'done', route: '/dashboard', title: 'You’re all set', body: 'That’s the Phase 1 walkthrough. Phase 2 will add QR-code tagging for scan-based movement and location updates. Explore freely — you can restart this tour anytime.' },
]

export function TourProvider({ children }) {
  const [active, setActive] = useState(false)
  const [step, setStep] = useState(0)

  const startTour = useCallback(() => { setStep(0); setActive(true) }, [])
  const stop = useCallback(() => setActive(false), [])
  const next = useCallback(() => setStep((s) => Math.min(s + 1, TOUR_STEPS.length - 1)), [])
  const prev = useCallback(() => setStep((s) => Math.max(s - 1, 0)), [])

  return (
    <TourContext.Provider value={{ active, step, steps: TOUR_STEPS, startTour, stop, next, prev, isLast: step === TOUR_STEPS.length - 1 }}>
      {children}
    </TourContext.Provider>
  )
}

export const useTour = () => useContext(TourContext)
