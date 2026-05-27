import { NavLink, Outlet } from 'react-router-dom'
import useAuthStore from '../../store/authStore'
import UserMenu from '../ui/UserMenu'

const ACCENT = '#7C3AED'
const NAVY   = '#1B2D5E'

const NAV = [
  { to: '/admin/dashboard',   label: 'Dashboard'   },
  { to: '/admin/technicians', label: 'Technicians'  },
  { to: '/admin/bookings',    label: 'Bookings'     },
  { to: '/admin/withdrawals', label: 'Withdrawals'  },
]

function NavItem({ to, label }) {
  return (
    <NavLink to={to} style={{ textDecoration: 'none' }}>
      {({ isActive }) => (
        <div style={{
          display: 'flex', alignItems: 'center',
          padding: '9px 12px', borderRadius: '8px', marginBottom: '2px',
          fontSize: '16px', fontWeight: isActive ? '600' : '400',
          background: isActive ? `${ACCENT}22` : 'transparent',
          color: isActive ? '#A78BFA' : '#94A3B8',
          cursor: 'pointer', transition: 'all 0.15s',
          fontFamily: 'Cabinet Grotesk',
        }}>
          {label}
        </div>
      )}
    </NavLink>
  )
}

export default function AdminLayout() {
  const { user, logout } = useAuthStore()
  const initials = user
    ? `${user.first_name?.[0] ?? ''}${user.last_name?.[0] ?? ''}`.toUpperCase() || '?'
    : '?'

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--ink)', fontFamily: 'Cabinet Grotesk' }}>

      {/* ── Sidebar ────────────────────────────────────────────────────────── */}
      <aside style={{
        width: '240px', flexShrink: 0,
        background: NAVY,
        borderRight: '1px solid rgba(255,255,255,0.08)',
        display: 'flex', flexDirection: 'column',
        position: 'sticky', top: 0, height: '100vh',
      }}>
        {/* Logo */}
        <div style={{ padding: '20px 20px 18px', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <img src="/efundi_icon.svg" width="36" height="36" alt="eFundi" style={{ borderRadius: '8px', flexShrink: 0 }} />
            <div>
              <div style={{ fontFamily: 'Clash Display', fontSize: '17px', fontWeight: '700', color: '#FFFFFF', lineHeight: 1 }}>
                <span style={{ color: '#FF9A3C' }}>e</span>Fundi
              </div>
              <div style={{ fontSize: '11px', color: '#A78BFA', fontFamily: 'DM Mono', letterSpacing: '1px', marginTop: '2px' }}>
                ADMIN
              </div>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, padding: '16px 12px', overflowY: 'auto' }}>
          <div style={{ fontSize: '11px', letterSpacing: '1.5px', color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', padding: '0 8px', marginBottom: '8px', fontFamily: 'DM Mono' }}>
            Management
          </div>
          {NAV.map(item => <NavItem key={item.to} {...item} />)}
        </nav>

        {/* User chip */}
        <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', padding: '8px 8px 12px' }}>
          <UserMenu
            user={user}
            logout={logout}
            accentColor={ACCENT}
            profilePath="/admin/dashboard"
            statsPath="/admin/dashboard"
          />
        </div>
      </aside>

      {/* ── Main ───────────────────────────────────────────────────────────── */}
      <main style={{ flex: 1, minWidth: 0, overflowY: 'auto' }}>
        <Outlet />
      </main>

    </div>
  )
}
