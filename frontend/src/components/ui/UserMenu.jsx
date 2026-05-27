import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useTheme } from '../../hooks/useTheme'

const THEME_OPTS = [
  { value: 'light',  label: 'Light',  icon: '☀️' },
  { value: 'dark',   label: 'Dark',   icon: '🌙' },
  { value: 'system', label: 'System', icon: '💻' },
]

export default function UserMenu({ user, logout, accentColor = '#E8501A', profilePath, statsPath }) {
  const navigate = useNavigate()
  const { theme, setTheme } = useTheme()
  const [open, setOpen]               = useState(false)
  const [confirmLogout, setConfirm]   = useState(false)
  const ref = useRef(null)

  // Close on outside click
  useEffect(() => {
    if (!open) return
    const h = (e) => { if (ref.current && !ref.current.contains(e.target)) { setOpen(false); setConfirm(false) } }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [open])

  const initials = user
    ? `${user.first_name?.[0] ?? ''}${user.last_name?.[0] ?? ''}`.toUpperCase() || '?'
    : '?'

  const go = (path) => { setOpen(false); setConfirm(false); navigate(path) }
  const handleLogout = () => { logout(); navigate('/login') }

  return (
    <div ref={ref} style={{ position: 'relative' }}>

      {/* ── Trigger chip ─────────────────────────────────────────────────── */}
      <div
        onClick={() => { setOpen(v => !v); setConfirm(false) }}
        style={{
          display: 'flex', alignItems: 'center', gap: '10px',
          padding: '10px 12px', borderRadius: '8px', cursor: 'pointer',
          background: open ? 'rgba(255,255,255,0.1)' : 'transparent',
          transition: 'background 0.15s',
        }}
        onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.07)')}
        onMouseLeave={e => (e.currentTarget.style.background = open ? 'rgba(255,255,255,0.1)' : 'transparent')}
      >
        <div style={{
          width: '34px', height: '34px', borderRadius: '8px', flexShrink: 0,
          background: accentColor, color: '#FFFFFF',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '14px', fontWeight: '700',
        }}>
          {initials}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: '14px', fontWeight: '600', color: '#E2E8F0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {user?.first_name} {user?.last_name}
          </div>
          <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.35)' }}>
            {open ? 'Close menu' : 'Account & settings'}
          </div>
        </div>
        <span style={{
          fontSize: '10px', color: 'rgba(255,255,255,0.3)',
          transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s',
          display: 'inline-block',
        }}>▲</span>
      </div>

      {/* ── Dropdown ─────────────────────────────────────────────────────── */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.96 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
            style={{
              position: 'absolute', bottom: 'calc(100% + 10px)',
              left: '12px', right: '12px',
              background: '#FFFFFF', borderRadius: '16px',
              border: '1px solid #E2E8F0',
              boxShadow: '0 8px 40px rgba(0,0,0,0.18), 0 2px 8px rgba(0,0,0,0.1)',
              overflow: 'hidden', zIndex: 300,
            }}
          >
            {/* Header */}
            <div style={{ padding: '14px 16px 12px', background: '#F8FAFC', borderBottom: '1px solid #F1F5F9' }}>
              <div style={{ fontSize: '13px', fontWeight: '700', color: '#0F172A' }}>
                {user?.first_name} {user?.last_name}
              </div>
              <div style={{ fontSize: '11px', color: '#64748B', marginTop: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {user?.email}
              </div>
            </div>

            {/* Nav items */}
            <MenuRow icon="👤" label="Your Profile"    onClick={() => go(profilePath)} />
            <MenuRow icon="📊" label="Stats and Trends" onClick={() => go(statsPath)}  />

            {/* Theme picker */}
            <div style={{ padding: '10px 14px', borderTop: '1px solid #F1F5F9' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
                <span style={{ fontSize: '13px' }}>🎨</span>
                <span style={{ fontSize: '11px', fontWeight: '600', color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.8px' }}>
                  Theme
                </span>
              </div>
              <div style={{ display: 'flex', gap: '6px' }}>
                {THEME_OPTS.map(opt => {
                  const active = theme === opt.value
                  return (
                    <button
                      key={opt.value}
                      onClick={() => setTheme(opt.value)}
                      style={{
                        flex: 1, padding: '8px 4px', borderRadius: '10px', border: 'none', cursor: 'pointer',
                        background: active ? accentColor : '#F1F5F9',
                        color: active ? '#FFFFFF' : '#475569',
                        fontSize: '11px', fontWeight: active ? '700' : '500',
                        transition: 'all 0.15s',
                        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px',
                      }}
                    >
                      <span style={{ fontSize: '16px', lineHeight: 1 }}>{opt.icon}</span>
                      <span>{opt.label}</span>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Log out */}
            <div style={{ padding: '10px 14px 14px', borderTop: '1px solid #F1F5F9' }}>
              <AnimatePresence mode="wait">
                {confirmLogout ? (
                  <motion.div
                    key="confirm"
                    initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                    transition={{ duration: 0.14 }}
                  >
                    <div style={{ fontSize: '12px', color: '#64748B', textAlign: 'center', marginBottom: '8px' }}>
                      Are you sure you want to sign out?
                    </div>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <button
                        onClick={() => setConfirm(false)}
                        style={{
                          flex: 1, padding: '8px', borderRadius: '8px',
                          border: '1px solid #E2E8F0', background: '#F8FAFC',
                          fontSize: '12px', fontWeight: '600', color: '#475569', cursor: 'pointer',
                        }}
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleLogout}
                        style={{
                          flex: 1, padding: '8px', borderRadius: '8px',
                          border: 'none', background: '#DC2626',
                          fontSize: '12px', fontWeight: '700', color: '#FFFFFF', cursor: 'pointer',
                        }}
                      >
                        Sign out
                      </button>
                    </div>
                  </motion.div>
                ) : (
                  <motion.button
                    key="btn"
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                    onClick={() => setConfirm(true)}
                    style={{
                      width: '100%', padding: '9px', borderRadius: '10px',
                      border: '1px solid #FECACA', background: '#FEF2F2',
                      color: '#DC2626', fontSize: '13px', fontWeight: '600', cursor: 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                    }}
                  >
                    🚪 Log out
                  </motion.button>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function MenuRow({ icon, label, onClick }) {
  const [hov, setHov] = useState(false)
  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        display: 'flex', alignItems: 'center', gap: '10px',
        padding: '10px 16px', cursor: 'pointer',
        background: hov ? '#F8FAFC' : 'transparent',
        transition: 'background 0.1s',
      }}
    >
      <span style={{ fontSize: '16px', width: '20px', textAlign: 'center' }}>{icon}</span>
      <span style={{ fontSize: '13px', fontWeight: '500', color: '#0F172A', flex: 1 }}>{label}</span>
      <span style={{ color: '#CBD5E1', fontSize: '14px' }}>›</span>
    </div>
  )
}
