import { useEffect, useRef, useState } from 'react'
import { NavLink, useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useTheme } from '../context/ThemeContext'
import { useTour } from '../context/TourContext'
import { ROLES, ROLE_LIST, NAV, isLocked } from '../data/roles'
import { counts } from '../data/transactions'
import Icon from '../lib/icons'
import Logo from './Logo'
import Tour from './Tour'
import { initials } from '../lib/format'

// `title` on every item doubles as the tooltip when the rail is collapsed to icons
// only — the label text is still in the DOM (for a11y / uncollapsed layout) but
// hidden by CSS, so hovering the icon is the only way to recover the name.
function NavItem({ item, role, onNavigate }) {
  const loc = useLocation()
  const path = item.to.split('?')[0]
  const isActive = path === loc.pathname
  const locked = isLocked(item, role)
  if (locked)
    return (
      <div className="nav-item locked" title={`${item.label} — restricted for your role`}>
        <Icon name={item.icon} className="ico" size={19} />
        <span className="nav-label">{item.label}</span>
        <span className="lock-ico">🔒</span>
      </div>
    )
  return (
    <NavLink to={item.to} className={`nav-item ${isActive ? 'active' : ''}`} onClick={onNavigate} title={item.label}>
      <Icon name={item.icon} className="ico" size={19} />
      <span className="nav-label">{item.label}</span>
    </NavLink>
  )
}

// The page title now lives in the topbar rather than being repeated at the top of
// every page body. Derived from the route so no page has to register anything; the
// dashboard's three tabs are the one case where the same path carries two names.
const ROUTE_TITLES = {
  '/inventory': 'Inventory Masterlist',
  '/movement': 'Movement History',
  '/reservations': 'Reservations',
  '/approvals': 'Approvals',
  '/users': 'Users',
  '/audit': 'Audit Logs',
  '/reports': 'Reports',
  '/analytics': 'Analytics',
  '/storage': 'Warehouse Floor Plan',
  '/settings': 'Settings',
  '/low-stock': 'Low Stock Alerts',
  '/purchase-requests': 'Purchase Requests',
  '/request-materials': 'Request Materials',
  '/delivery': 'Delivery Tracking',
}
const DASH_TITLES = { safekeeping: 'Safekeeping Insights', excess: 'Excess Materials' }

// One icon per route/tab, reusing the same names the sidebar nav already uses for
// that destination — so the topbar title and the nav item that led here match.
const ROUTE_ICONS = {
  '/inventory': 'inventory',
  '/movement': 'incoming',
  '/reservations': 'reserve',
  '/approvals': 'approve',
  '/users': 'users',
  '/audit': 'audit',
  '/reports': 'reports',
  '/analytics': 'trend',
  '/storage': 'map',
  '/settings': 'settings',
  '/low-stock': 'alert',
  '/purchase-requests': 'request',
  '/request-materials': 'request',
  '/delivery': 'truck',
}
const DASH_ICONS = { safekeeping: 'vault', excess: 'excess' }

function pageTitle(pathname, tabParam) {
  if (pathname === '/dashboard') return DASH_TITLES[tabParam] || 'Inventory Insights'
  if (pathname.startsWith('/inventory/')) return 'Material Profile'
  return ROUTE_TITLES[pathname] || 'Megawide WMS'
}

function pageIcon(pathname, tabParam) {
  if (pathname === '/dashboard') return DASH_ICONS[tabParam] || 'inventory'
  if (pathname.startsWith('/inventory/')) return 'box'
  return ROUTE_ICONS[pathname] || 'dashboard'
}

export default function Layout({ children }) {
  const { user, signOut, switchRole, canSwitchRole } = useAuth()
  const { theme, toggle } = useTheme()
  const { startTour } = useTour()
  // ONE piece of state for the sidebar, and it starts closed. There is no icon-rail
  // middle state any more: the burger either shows the full labelled panel or hides
  // it completely, at every width. Open, it overlays the page — `.main` reserves no
  // width for it — so opening the nav never reflows the dashboard underneath or makes
  // its charts re-measure.
  const [open, setOpen] = useState(false)
  const [notifOpen, setNotifOpen] = useState(false)
  const [roleOpen, setRoleOpen] = useState(false)
  const [acctOpen, setAcctOpen] = useState(false)
  const navigate = useNavigate()
  const location = useLocation()
  const [params] = useSearchParams()
  const acctRef = useRef(null)
  const role = ROLES[user.role]
  const title = pageTitle(location.pathname, params.get('tab'))
  const titleIcon = pageIcon(location.pathname, params.get('tab'))

  // Escape closes whichever overlay is showing — both are dismissible layers.
  useEffect(() => {
    const onKey = (e) => {
      if (e.key !== 'Escape') return
      setOpen(false)
      setAcctOpen(false)
      setNotifOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  // The account menu is a plain popover rather than a scrimmed layer, so it needs its
  // own outside-click handler to close.
  useEffect(() => {
    if (!acctOpen) return
    const onDown = (e) => { if (acctRef.current && !acctRef.current.contains(e.target)) setAcctOpen(false) }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [acctOpen])

  const notifications = [
    { icon: 'alert', tone: 'warn', text: `${counts.lowStock} materials below minimum stock`, to: '/low-stock' },
    { icon: 'incoming', tone: 'info', text: `${counts.approvals} items pending approval`, to: '/approvals' },
    { icon: 'reserve', tone: 'ok', text: `${counts.reservations} active reservations`, to: '/reservations' },
    { icon: 'alert', tone: 'danger', text: 'Disposal review required — Class D items', to: '/approvals' },
  ]

  return (
    <div className={`app-shell ${open ? 'nav-open' : ''}`}>
      <aside className={`sidebar ${open ? 'open' : ''}`}>
        <div className="sidebar-head">
          <Logo variant="darkbg" height={30} sub={['Procurement', '×', 'Warehouse Management']} />
        </div>
        <nav className="nav" data-tour="nav">
          {NAV.map((item) => (
            <NavItem key={item.to} item={item} role={user.role} onNavigate={() => setOpen(false)} />
          ))}
        </nav>
        <div className="sidebar-foot">
          <div className="role-pill">
            Signed in as <b>{role.label}</b>
          </div>
        </div>
      </aside>

      <div className="main">
        <header className="topbar">
          <button
            className="icon-btn nav-toggle"
            onClick={() => setOpen((o) => !o)}
            title={open ? 'Hide navigation' : 'Show navigation'}
            aria-label="Toggle navigation"
            aria-expanded={open}
          >
            <Icon name="menu" size={18} />
          </button>
          {/* The page title sits here, where the warehouse name used to. It is the
              thing that changes as you move around, so it takes the primary slot; the
              warehouse is fixed context and moves to the right. */}
          <div className="topbar-title-wrap">
            <Icon name={titleIcon} size={17} className="topbar-title-icon" />
            <h1 className="topbar-title">{title}</h1>
          </div>

          <div style={{ flex: 1 }} />

          <div className="topbar-site">
            <Icon name="warehouse" size={16} className="muted" />
            <span className="muted topbar-site-name">Central Warehouse Taytay</span>
          </div>

          <div className="topbar-tools" data-tour="topbar-tools" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {/* Role switcher (prototype, dev builds only) */}
          {canSwitchRole && (
          <div style={{ position: 'relative' }}>
            <button className="btn btn-sm" onClick={() => setRoleOpen((o) => !o)} title="Switch Role">
              <Icon name="users" size={15} /> <span className="topbar-hide-sm">Switch Role</span> <Icon name="chevronDown" size={14} />
            </button>
            {roleOpen && (
              <div className="card role-menu">
                {ROLE_LIST.map((r) => (
                  <button
                    key={r.key}
                    className={`role-opt ${r.key === user.role ? 'active' : ''}`}
                    onClick={() => {
                      switchRole(r.key)
                      setRoleOpen(false)
                      navigate('/dashboard')
                    }}
                  >
                    <Icon name="users" size={16} />
                    <span>{r.label}</span>
                    {r.key === user.role && <Icon name="check" size={15} className="chk" />}
                  </button>
                ))}
              </div>
            )}
          </div>
          )}

          <button className="icon-btn" onClick={toggle} title="Toggle theme">
            <Icon name={theme === 'light' ? 'moon' : 'sun'} size={18} />
          </button>

          <button className="icon-btn" onClick={startTour} data-tour="tour-btn" title="Take a Tour" aria-label="Take a Tour">
            <Icon name="help" size={18} />
          </button>

          <div style={{ position: 'relative' }}>
            <button className="icon-btn" onClick={() => setNotifOpen((o) => !o)} title="Notifications">
              <Icon name="bell" size={18} />
              <span style={{ position: 'absolute', top: 6, right: 7, width: 8, height: 8, background: 'var(--brand-red)', borderRadius: '50%' }} />
            </button>
            {notifOpen && (
              <div className="card" style={{ position: 'absolute', right: 0, top: 44, width: 320, zIndex: 50 }}>
                <div className="card-head"><div className="card-title" style={{ fontSize: 13 }}>Notifications</div></div>
                <div style={{ padding: 6 }}>
                  {notifications.map((n, i) => (
                    <button key={i} className="nav-item" style={{ width: '100%' }} onClick={() => { setNotifOpen(false); navigate(n.to) }}>
                      <span className={`badge badge-${n.tone}`} style={{ padding: 6 }}><Icon name={n.icon} size={14} /></span>
                      <span style={{ fontSize: 12.5, whiteSpace: 'normal', textAlign: 'left' }}>{n.text}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* The name, department and a separate sign-out button used to sit out here
              and were the widest thing in the bar. They are all inside this menu now;
              the avatar is the only control the topbar spends width on. */}
          <div style={{ position: 'relative' }} ref={acctRef}>
            <button className="avatar avatar-btn" onClick={() => setAcctOpen((o) => !o)}
              title={user.name} aria-haspopup="menu" aria-expanded={acctOpen}>
              {initials(user.name)}
            </button>
            {acctOpen && (
              <div className="card acct-menu" role="menu">
                <div className="acct-head">
                  <div className="avatar avatar-lg">{initials(user.name)}</div>
                  <div style={{ minWidth: 0 }}>
                    <div className="acct-name">{user.name}</div>
                    <div className="acct-meta">{user.department}</div>
                    <div className="acct-role">{role.label}</div>
                  </div>
                </div>
                <button className="acct-opt" role="menuitem"
                  onClick={() => { setAcctOpen(false); navigate('/settings') }}>
                  <Icon name="settings" size={16} /> <span>Account settings</span>
                </button>
                <button className="acct-opt danger" role="menuitem" onClick={signOut}>
                  <Icon name="logout" size={16} /> <span>Sign out</span>
                </button>
              </div>
            )}
          </div>
          </div>
        </header>

        <main className="content">{children}</main>
      </div>

      <Tour />
      {open && <div className="sidebar-scrim" onClick={() => setOpen(false)} />}
    </div>
  )
}
