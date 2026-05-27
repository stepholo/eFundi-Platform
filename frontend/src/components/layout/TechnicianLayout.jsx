import { NavLink, Outlet } from 'react-router-dom'
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { bookingsApi } from '../../api/bookings'
import { technicianApi } from '../../api/technicians'
import useAuthStore from '../../store/authStore'
import UserMenu from '../ui/UserMenu'

const ACCENT = '#E8501A'
const NAVY   = '#1B2D5E'

const WORK_NAV = [
  { to: '/technician/dashboard', label: 'Dashboard'   },
  { to: '/technician/available', label: 'Job Requests' },
  { to: '/technician/jobs',      label: 'My Jobs'      },
]

const FINANCE_NAV = [
  { to: '/technician/earnings',  label: 'Earnings & Wallet' },
  { to: '/technician/settings',  label: 'Profile & Skills'  },
]

function NavItem({ to, label, badge }) {
  return (
    <NavLink to={to} style={{ textDecoration: 'none' }}>
      {({ isActive }) => (
        <div style={{
          display: 'flex', alignItems: 'center', gap: '8px',
          padding: '9px 12px', borderRadius: '8px', marginBottom: '2px',
          fontSize: '16px', fontWeight: isActive ? '600' : '400',
          background: isActive ? 'rgba(255,154,60,0.18)' : 'transparent',
          color: isActive ? '#FF9A3C' : '#94A3B8',
          cursor: 'pointer', transition: 'all 0.15s',
          fontFamily: 'Cabinet Grotesk',
        }}>
          <span style={{ flex: 1 }}>{label}</span>
          {badge > 0 && (
            <span style={{
              minWidth: '20px', height: '20px', borderRadius: '10px', padding: '0 5px',
              fontSize: '13px', fontWeight: '700',
              background: isActive ? 'rgba(255,154,60,0.35)' : ACCENT,
              color: '#FFFFFF',
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            }}>{badge}</span>
          )}
        </div>
      )}
    </NavLink>
  )
}

export default function TechnicianLayout() {
  const { user, logout } = useAuthStore()
  const qc = useQueryClient()
  const initials = user
    ? `${user.first_name?.[0] ?? ''}${user.last_name?.[0] ?? ''}`.toUpperCase() || '?'
    : '?'

  const { data: profile } = useQuery({
    queryKey: ['tech-profile', user?.user_id],
    queryFn:  () => technicianApi.getProfile(user.user_id).then(r => r.data),
    enabled:  !!user?.user_id,
  })

  const { data: bookings = [] } = useQuery({
    queryKey: ['tech-bookings'],
    queryFn:  () => bookingsApi.list().then(r => r.data),
    refetchInterval: 30_000,
  })

  const availableCount = bookings.filter(b => b.status === 'broadcasted').length
  const isVerified     = profile?.verification_status === 'Verified'
  const isAvailable    = profile?.is_available ?? false

  const availMutation = useMutation({
    mutationFn: (val) => technicianApi.setAvailability(user.user_id, val),
    onSuccess:  () => qc.invalidateQueries(['tech-profile']),
  })

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
                TECHNICIAN
              </div>
            </div>
          </div>
        </div>

        {/* Work nav */}
        <div style={{ padding: '16px 12px 8px' }}>
          <div style={{ fontSize: '11px', letterSpacing: '1.5px', color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', padding: '0 8px', marginBottom: '8px', fontFamily: 'DM Mono' }}>
            Work
          </div>
          {WORK_NAV.map(({ to, label }) => (
            <NavItem key={label} to={to} label={label}
              badge={label === 'Job Requests' ? availableCount : 0}
            />
          ))}
        </div>

        {/* Finance nav */}
        <div style={{ padding: '8px 12px', borderTop: '1px solid rgba(255,255,255,0.08)', marginTop: '4px' }}>
          <div style={{ fontSize: '11px', letterSpacing: '1.5px', color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', padding: '8px 8px 8px', fontFamily: 'DM Mono' }}>
            Finance
          </div>
          {FINANCE_NAV.map(({ to, label }) => (
            <NavItem key={label} to={to} label={label} />
          ))}
        </div>

        <div style={{ flex: 1 }} />

        {/* Online toggle */}
        {isVerified && (
          <div style={{ padding: '16px 20px', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <motion.button
                whileTap={{ scale: 0.95 }}
                disabled={availMutation.isPending}
                onClick={() => availMutation.mutate(!isAvailable)}
                style={{
                  width: '40px', height: '22px', borderRadius: '11px', border: 'none', flexShrink: 0,
                  background: isAvailable ? ACCENT : 'rgba(255,255,255,0.15)',
                  cursor: availMutation.isPending ? 'not-allowed' : 'pointer',
                  position: 'relative',
                  opacity: availMutation.isPending ? 0.6 : 1,
                  transition: 'background 0.3s',
                }}
              >
                <motion.div
                  animate={{ x: isAvailable ? 18 : 2 }}
                  transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                  style={{ position: 'absolute', top: '2px', width: '18px', height: '18px', borderRadius: '50%', background: 'white' }}
                />
              </motion.button>
              <div>
                <div style={{ fontSize: '15px', fontWeight: '600', color: isAvailable ? '#FF9A3C' : 'rgba(255,255,255,0.4)' }}>
                  {isAvailable ? 'Online' : 'Offline'}
                </div>
                <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.3)', fontFamily: 'DM Mono' }}>
                  {isAvailable ? 'Accepting jobs' : 'Not accepting'}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* User chip */}
        <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', padding: '8px 8px 12px' }}>
          <UserMenu
            user={user}
            logout={logout}
            accentColor={ACCENT}
            profilePath="/technician/settings"
            statsPath="/technician/earnings"
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
