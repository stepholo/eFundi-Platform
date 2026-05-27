import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { adminApi } from '../../api/admin'
import useAuthStore from '../../store/authStore'

const ADMIN = '#7C3AED'

function StatCard({ icon, label, value, sub, color = ADMIN, delay = 0, onClick }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.4 }}
      onClick={onClick}
      style={{
        background: 'var(--ink3)', border: '1px solid var(--border2)',
        borderRadius: '20px', padding: '22px',
        cursor: onClick ? 'pointer' : 'default',
        transition: 'border-color 0.2s',
      }}
      whileHover={onClick ? { scale: 1.01 } : {}}
    >
      <div style={{
        width: '44px', height: '44px', borderRadius: '12px',
        background: `${color}18`, display: 'flex', alignItems: 'center',
        justifyContent: 'center', fontSize: '20px', marginBottom: '14px',
      }}>{icon}</div>
      <div style={{ fontSize: '12px', letterSpacing: '1.5px', color: 'var(--muted)', textTransform: 'uppercase', fontFamily: 'DM Mono', marginBottom: '8px' }}>
        {label}
      </div>
      <div style={{ fontFamily: 'Clash Display', fontSize: '32px', fontWeight: '700', color: 'var(--white)' }}>
        {value ?? '—'}
      </div>
      {sub && <div style={{ fontSize: '13px', color: 'var(--muted)', marginTop: '4px' }}>{sub}</div>}
    </motion.div>
  )
}

const STATUS_COLOR = {
  requested:   '#6B7A55',
  broadcasted: '#FF6B1A',
  assigned:    '#1AADFF',
  in_progress: '#16A34A',
  completed:   '#22C55E',
  cancelled:   '#EF4444',
}

export default function AdminDashboard() {
  const { user } = useAuthStore()
  const navigate = useNavigate()

  const { data: users = [] }       = useQuery({ queryKey: ['admin-users'],    queryFn: () => adminApi.listUsers().then(r => r.data) })
  const { data: technicians = [] } = useQuery({ queryKey: ['admin-techs'],    queryFn: () => adminApi.listTechnicians().then(r => r.data) })
  const { data: bookings = [] }    = useQuery({ queryKey: ['admin-bookings'], queryFn: () => adminApi.listBookings().then(r => r.data), refetchInterval: 30_000 })
  const { data: payments = [] }    = useQuery({ queryKey: ['admin-payments'], queryFn: () => adminApi.listPayments().then(r => r.data) })
  const { data: withdrawals = [] } = useQuery({ queryKey: ['admin-withdrawals'], queryFn: () => adminApi.listWithdrawals().then(r => r.data) })

  const pendingTechs     = technicians.filter(t => t.verification_status === 'Pending')
  const activeBookings   = bookings.filter(b => ['assigned', 'in_progress'].includes(b.status))
  const revenue          = payments.filter(p => p.payment_status === 'Successful').reduce((s, p) => s + Number(p.amount), 0)
  const pendingWithdrawals = withdrawals.filter(w => w.status === 'Pending')

  // Recent bookings
  const recentBookings = [...bookings].sort((a, b) => new Date(b.created_at) - new Date(a.created_at)).slice(0, 6)

  return (
    <div>
      <div style={{
        height: '60px', background: 'var(--ink2)', borderBottom: '1px solid var(--border2)',
        display: 'flex', alignItems: 'center', padding: '0 32px', gap: '16px',
        position: 'sticky', top: 0, zIndex: 100,
      }}>
        <span style={{ fontFamily: 'Clash Display', fontSize: '17px', fontWeight: '600', color: 'var(--white)' }}>
          Dashboard
        </span>
        <div style={{ flex: 1 }} />
        <div style={{ fontSize: '14px', color: 'var(--muted)', fontFamily: 'DM Mono' }}>
          {user?.role}
        </div>
      </div>

      <div style={{ padding: '32px 32px 60px' }}>
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <div style={{ fontSize: '12px', letterSpacing: '2.5px', color: ADMIN, textTransform: 'uppercase', fontFamily: 'DM Mono', marginBottom: '6px' }}>
            Platform overview
          </div>
          <h1 style={{ fontFamily: 'Clash Display', fontSize: '26px', fontWeight: '700', color: 'var(--white)', marginBottom: '28px' }}>
            Hi {user?.first_name}, here's what's happening
          </h1>
        </motion.div>

        {/* Stat cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '36px' }}>
          <StatCard icon="👥" label="Total Users"    value={users.length}     delay={0}    />
          <StatCard icon="⏳" label="Pending Verif." value={pendingTechs.length} color="#FF6B1A" delay={0.06}
            onClick={pendingTechs.length > 0 ? () => navigate('/admin/technicians') : null}
            sub={pendingTechs.length > 0 ? 'Tap to review' : null}
          />
          <StatCard icon="🔧" label="Active Jobs"    value={activeBookings.length} color="#1AADFF" delay={0.12} />
          <StatCard icon="💰" label="Total Revenue"  value={`KES ${revenue.toLocaleString()}`} color="#22C55E" delay={0.18} />
        </div>

        {/* Second row */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '36px' }}>
          <StatCard icon="📋" label="Total Bookings"  value={bookings.length}          delay={0.22} />
          <StatCard icon="💸" label="Pending Payouts" value={pendingWithdrawals.length} color="#FF6B1A" delay={0.26}
            onClick={pendingWithdrawals.length > 0 ? () => navigate('/admin/withdrawals') : null}
            sub={pendingWithdrawals.length > 0 ? 'Tap to review' : null}
          />
          <StatCard icon="✅" label="Verified Techs"  value={technicians.filter(t => t.verification_status === 'Verified').length} color="#22C55E" delay={0.3} />
        </div>

        {/* Recent bookings */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.34 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <div style={{ fontSize: '13px', fontWeight: '600', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '1px', fontFamily: 'DM Mono' }}>
              Recent Bookings
            </div>
            <button
              onClick={() => navigate('/admin/bookings')}
              style={{ background: 'none', border: 'none', color: ADMIN, fontSize: '14px', fontWeight: '600', cursor: 'pointer', fontFamily: 'Cabinet Grotesk' }}
            >
              View all →
            </button>
          </div>
          <div style={{ background: 'var(--ink3)', border: '1px solid var(--border2)', borderRadius: '20px', overflow: 'hidden' }}>
            {recentBookings.length === 0 ? (
              <div style={{ padding: '48px', textAlign: 'center', color: 'var(--muted)', fontSize: '15px' }}>No bookings yet</div>
            ) : recentBookings.map((b, i) => (
              <div key={b.booking_id} style={{
                display: 'flex', alignItems: 'center', padding: '14px 24px', gap: '16px',
                borderBottom: i < recentBookings.length - 1 ? '1px solid var(--border2)' : 'none',
              }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '15px', fontWeight: '600', color: 'var(--white)', marginBottom: '2px' }}>
                    {b.service_category}
                  </div>
                  <div style={{ fontSize: '13px', color: 'var(--muted)', fontFamily: 'DM Mono' }}>
                    📍 {b.location} · {new Date(b.created_at).toLocaleDateString('en-KE', { day: 'numeric', month: 'short' })}
                  </div>
                </div>
                {b.amount && (
                  <div style={{ fontSize: '15px', fontWeight: '700', color: 'var(--white)', fontFamily: 'Clash Display', flexShrink: 0 }}>
                    KES {Number(b.amount).toLocaleString()}
                  </div>
                )}
                <span style={{
                  display: 'inline-block', padding: '3px 10px', borderRadius: '20px', flexShrink: 0,
                  fontSize: '12px', fontWeight: '600', fontFamily: 'DM Mono',
                  background: `${STATUS_COLOR[b.status]}18`, color: STATUS_COLOR[b.status],
                }}>
                  {b.status.replace('_', ' ')}
                </span>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  )
}
