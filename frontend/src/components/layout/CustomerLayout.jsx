import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useState } from 'react'
import useAuthStore from '../../store/authStore'
import { authApi } from '../../api/auth'
import UserMenu from '../ui/UserMenu'

const ACCENT = '#E8501A'
const NAVY   = '#1B2D5E'

const NAV = [
  { to: '/customer/dashboard', icon: '⚡', label: 'Dashboard'    },
  { to: '/customer/book',      icon: '＋', label: 'Book Service' },
  { to: '/customer/bookings',  icon: '📋', label: 'My Bookings'  },
  { to: '/customer/nearby',    icon: '📍', label: 'Nearby Techs' },
  { to: '/customer/payments',  icon: '💳', label: 'Payments'     },
]

const BOTTOM_NAV = [
  { to: '/customer/settings', icon: '⚙️', label: 'Settings' },
]

function NavItem({ to, icon, label }) {
  return (
    <NavLink to={to} style={{ textDecoration: 'none' }}>
      {({ isActive }) => (
        <div style={{
          display: 'flex', alignItems: 'center', gap: '10px',
          padding: '9px 12px', borderRadius: '8px', marginBottom: '2px',
          fontSize: '16px', fontWeight: isActive ? '600' : '400',
          background: isActive ? 'rgba(255,154,60,0.18)' : 'transparent',
          color: isActive ? '#FF9A3C' : '#94A3B8',
          cursor: 'pointer', transition: 'all 0.15s',
          fontFamily: 'Cabinet Grotesk',
        }}>
          <span style={{ fontSize: '17px', width: '20px', textAlign: 'center', flexShrink: 0 }}>{icon}</span>
          {label}
        </div>
      )}
    </NavLink>
  )
}

function VerificationBanner({ email }) {
  const [sent, setSent] = useState(false)
  const [loading, setLoading] = useState(false)

  const resend = async () => {
    if (loading || sent) return
    setLoading(true)
    try {
      await authApi.resendVerification(email)
      setSent(true)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      background: '#FFF7ED', borderBottom: '1px solid #FED7AA',
      padding: '10px 24px', display: 'flex', alignItems: 'center',
      gap: '12px', flexWrap: 'wrap',
    }}>
      <span style={{ fontSize: '15px' }}>⚠️</span>
      <span style={{ fontSize: '15px', color: '#92400E', flex: 1 }}>
        Your email is not verified. Verify to unlock bookings.
      </span>
      {sent ? (
        <span style={{ fontSize: '14px', color: '#16A34A', fontWeight: '600' }}>Email sent ✓</span>
      ) : (
        <button
          onClick={resend}
          disabled={loading}
          style={{
            background: '#E8501A', color: '#FFFFFF', border: 'none',
            borderRadius: '6px', padding: '5px 14px', fontSize: '14px',
            fontWeight: '600', fontFamily: 'Cabinet Grotesk', cursor: 'pointer',
            opacity: loading ? 0.7 : 1,
          }}
        >
          {loading ? 'Sending…' : 'Resend verification'}
        </button>
      )}
    </div>
  )
}

export default function CustomerLayout() {
  const { user, logout } = useAuthStore()
  const navigate = useNavigate()

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
              <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.45)', fontFamily: 'DM Mono', letterSpacing: '1px', marginTop: '2px' }}>
                CUSTOMER
              </div>
            </div>
          </div>
        </div>

        {/* Main nav */}
        <div style={{ flex: 1, padding: '16px 12px', overflowY: 'auto' }}>
          <div style={{ fontSize: '11px', letterSpacing: '1.5px', color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', padding: '0 8px', marginBottom: '8px', fontFamily: 'DM Mono' }}>
            Menu
          </div>
          {NAV.map(item => <NavItem key={item.to} {...item} />)}
        </div>

        {/* Bottom */}
        <div style={{ padding: '12px 12px 16px', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
          {BOTTOM_NAV.map(item => <NavItem key={item.to} {...item} />)}

          <div style={{ marginTop: '6px' }}>
            <UserMenu
              user={user}
              logout={logout}
              accentColor={ACCENT}
              profilePath="/customer/settings"
              statsPath="/customer/payments"
            />
          </div>
        </div>
      </aside>

      {/* ── Main ───────────────────────────────────────────────────────────── */}
      <main style={{ flex: 1, minWidth: 0, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
        {user && !user.verified_email && <VerificationBanner email={user.email} />}
        <div style={{ flex: 1 }}>
          <Outlet />
        </div>
      </main>

    </div>
  )
}
