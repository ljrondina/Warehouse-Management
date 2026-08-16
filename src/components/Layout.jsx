import { useEffect, useState } from 'react'
import { NavLink, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useTheme } from '../context/ThemeContext'
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

export default function Layout({ children }) {
  const { user, signOut, switchRole, canSwitchRole } = useAuth()
  const { theme, toggle } = useTheme()
  // `open` drives the off-canvas drawer on narrow screens; `collapsed` hides the
  // sidebar on wide ones. One burger drives whichever applies at the current width.
  const [open, setOpen] = useState(false)
  const [collapsed, setCollapsed] = useState(false)
  const [notifOpen, setNotifOpen] = useState(false)
  const [roleOpen, setRoleOpen] = useState(false)
  const navigate = useNavigate()
  const role = ROLES[user.role]

  // `collapsed` is the user's desktop preference and can be set while the window is
  // wide, then persist in state even if the window is later narrowed. `isMobile`
  // tracks the actual current breakpoint so the icon-only rail never applies on a
  // narrow screen — there the sidebar must always open as the full off-canvas
  // drawer, regardless of what was chosen on desktop.
  const [isMobile, setIsMobile] = useState(() => window.matchMedia('(max-width: 900px)').matches)
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 900px)')
    const check = () => setIsMobile(mq.matches)
    // Both listeners target the same outcome; `change` is the precise signal, but
    // some embedding contexts resize the viewport without firing it, so a plain
    // `resize` listener re-checks matchMedia as a fallback.
    mq.addEventListener('change', check)
    window.addEventListener('resize', check)
    return () => {
      mq.removeEventListener('change', check)
      window.removeEventListener('resize', check)
    }
  }, [])
  const collapsedRail = collapsed && !isMobile

  const notifications = [
    { icon: 'alert', tone: 'warn', text: `${counts.lowStock} materials below minimum stock`, to: '/low-stock' },
    { icon: 'incoming', tone: 'info', text: `${counts.approvals} items pending approval`, to: '/approvals' },
    { icon: 'reserve', tone: 'ok', text: `${counts.reservations} active reservations`, to: '/reservations' },
    { icon: 'alert', tone: 'danger', text: 'Disposal review required — Class D items', to: '/approvals' },
  ]

  return (
    <div className={`app-shell ${collapsedRail ? 'nav-collapsed' : ''}`}>
      <aside className={`sidebar ${open ? 'open' : ''}`}>
        <div className="sidebar-head">
          {/* Collapsed rail shows the icon mark only — the full wordmark + sub-label
              lockup doesn't fit a 72px-wide rail and would just get clipped. */}
          {collapsedRail
            ? <Logo variant="mark" height={22} />
            : <Logo variant="darkbg" height={30} sub={['Procurement', '×', 'Warehouse Management']} />}
        </div>
        <nav className="nav" data-tour="nav">
          {NAV.map((item) => (
            <NavItem key={item.to} item={item} role={user.role} onNavigate={() => setOpen(false)} />
          ))}
        </nav>
        {!collapsedRail && (
          <div className="sidebar-foot">
            <div className="role-pill">
              Signed in as <b>{role.label}</b>
            </div>
          </div>
        )}
      </aside>

      <div className="main">
        <header className="topbar">
          <button
            className="icon-btn nav-toggle"
            onClick={() => {
              // Below 900px the sidebar is an overlay drawer; above it, it docks.
              if (window.matchMedia('(max-width: 900px)').matches) setOpen((o) => !o)
              else setCollapsed((c) => !c)
            }}
            title={collapsedRail ? 'Show navigation' : 'Hide navigation'}
            aria-label="Toggle navigation"
          >
            <Icon name="menu" size={18} />
          </button>
          <div className="topbar-site">
            <Icon name="warehouse" size={18} className="muted" />
            <span className="muted topbar-site-name">Central Warehouse Taytay</span>
          </div>

          <div style={{ flex: 1 }} />

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

          <div style={{ position: 'relative' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div className="avatar">{initials(user.name)}</div>
              <div className="topbar-user-meta" style={{ lineHeight: 1.2 }}>
                <div style={{ fontWeight: 700, fontSize: 13 }}>{user.name}</div>
                <div className="faint" style={{ fontSize: 11 }}>{user.department}</div>
              </div>
              <button className="icon-btn" onClick={signOut} title="Sign out">
                <Icon name="logout" size={17} />
              </button>
            </div>
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
