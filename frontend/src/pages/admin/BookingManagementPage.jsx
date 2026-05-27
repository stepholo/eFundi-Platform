import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { adminApi } from '../../api/admin'

const STATUS_CFG = {
  requested:   { label: 'Submitted',    bg: 'rgba(107,122,85,0.18)',  color: '#6B7A55'  },
  broadcasted: { label: 'Finding Tech', bg: 'rgba(255,107,26,0.15)',  color: '#FF6B1A'  },
  assigned:    { label: 'Assigned',     bg: 'rgba(26,173,255,0.15)',  color: '#1AADFF'  },
  in_progress: { label: 'In Progress',  bg: 'rgba(22,163,74,0.12)',   color: '#16A34A'  },
  completed:   { label: 'Completed',    bg: 'rgba(34,197,94,0.15)',   color: '#22C55E'  },
  cancelled:   { label: 'Cancelled',    bg: 'rgba(239,68,68,0.15)',   color: '#EF4444'  },
}

const ACTIVE = ['requested', 'broadcasted', 'assigned', 'in_progress']

function catIcon(cat) {
  return { Electrical: '⚡', Plumbing: '🚿', Carpentry: '🪚', Cleaning: '🧹', Other: '🔧' }[cat] ?? '🔧'
}

export default function BookingManagementPage() {
  const [tab, setTab]     = useState('All')
  const [search, setSearch] = useState('')

  const { data: bookings = [], isLoading } = useQuery({
    queryKey: ['admin-bookings'],
    queryFn: () => adminApi.listBookings().then(r => r.data),
    refetchInterval: 30_000,
  })

  const filtered = bookings
    .filter(b => {
      if (tab === 'All')       return true
      if (tab === 'Active')    return ACTIVE.includes(b.status)
      if (tab === 'Completed') return b.status === 'completed'
      if (tab === 'Cancelled') return b.status === 'cancelled'
      return true
    })
    .filter(b => {
      if (!search) return true
      const q = search.toLowerCase()
      return (
        b.service_category?.toLowerCase().includes(q) ||
        b.location?.toLowerCase().includes(q) ||
        b.status?.toLowerCase().includes(q)
      )
    })

  const counts = {
    All:       bookings.length,
    Active:    bookings.filter(b => ACTIVE.includes(b.status)).length,
    Completed: bookings.filter(b => b.status === 'completed').length,
    Cancelled: bookings.filter(b => b.status === 'cancelled').length,
  }

  const ADMIN = '#7C3AED'

  return (
    <div>
      <div style={{
        height: '60px', background: 'var(--ink2)', borderBottom: '1px solid var(--border2)',
        display: 'flex', alignItems: 'center', padding: '0 32px', gap: '16px',
        position: 'sticky', top: 0, zIndex: 100,
      }}>
        <span style={{ fontFamily: 'Clash Display', fontSize: '17px', fontWeight: '600', color: 'var(--white)' }}>
          Bookings
        </span>
        <div style={{ flex: 1 }} />
        <input
          placeholder="Search category, location, status…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{
            width: '280px', padding: '8px 14px', borderRadius: '10px',
            background: 'var(--ink3)', border: '1px solid var(--border2)',
            color: 'var(--white)', fontSize: '15px', outline: 'none', fontFamily: 'Cabinet Grotesk',
          }}
          onFocus={e => (e.target.style.borderColor = ADMIN)}
          onBlur={e => (e.target.style.borderColor = 'var(--border2)')}
        />
      </div>

      <div style={{ padding: '32px 32px 60px' }}>
        {/* Tabs */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '24px' }}>
          {['All', 'Active', 'Completed', 'Cancelled'].map(t => (
            <button key={t} onClick={() => setTab(t)} style={{
              padding: '7px 18px', borderRadius: '20px', border: 'none', cursor: 'pointer',
              fontSize: '15px', fontWeight: '600', fontFamily: 'Cabinet Grotesk',
              background: tab === t ? ADMIN : 'var(--ink3)',
              color:      tab === t ? 'white' : 'var(--muted)',
              transition: 'all 0.15s', display: 'flex', alignItems: 'center', gap: '6px',
            }}>
              {t}
              {counts[t] > 0 && (
                <span style={{
                  width: '18px', height: '18px', borderRadius: '50%', fontSize: '12px', fontWeight: '700',
                  background: tab === t ? 'rgba(255,255,255,0.25)' : ADMIN, color: 'white',
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                }}>{counts[t]}</span>
              )}
            </button>
          ))}
        </div>

        {isLoading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {[0,1,2,3,4].map(i => (
              <div key={i} style={{ height: '82px', background: 'var(--ink3)', borderRadius: '16px', border: '1px solid var(--border2)' }} />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '80px 24px', background: 'var(--ink3)', border: '1px dashed var(--border2)', borderRadius: '20px' }}>
            <div style={{ fontSize: '40px', marginBottom: '12px' }}>📋</div>
            <div style={{ fontSize: '17px', fontWeight: '600', color: 'var(--white)' }}>No bookings found</div>
          </div>
        ) : (
          <div style={{ background: 'var(--ink3)', border: '1px solid var(--border2)', borderRadius: '20px', overflow: 'hidden' }}>
            {/* Table header */}
            <div style={{
              display: 'grid', gridTemplateColumns: '40px 1fr 140px 110px 100px 100px',
              padding: '10px 20px', borderBottom: '1px solid var(--border2)',
              fontSize: '12px', fontWeight: '600', color: 'var(--muted)', textTransform: 'uppercase',
              letterSpacing: '1px', fontFamily: 'DM Mono',
            }}>
              <div></div>
              <div>Service / Location</div>
              <div>Technician</div>
              <div>Scheduled</div>
              <div>Amount</div>
              <div>Status</div>
            </div>

            {filtered.map((b, i) => {
              const cfg = STATUS_CFG[b.status] || STATUS_CFG.requested
              return (
                <motion.div
                  key={b.booking_id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: i * 0.02 }}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '40px 1fr 140px 110px 100px 100px',
                    padding: '14px 20px', gap: '0', alignItems: 'center',
                    borderBottom: i < filtered.length - 1 ? '1px solid var(--border2)' : 'none',
                  }}
                >
                  <div style={{ fontSize: '18px' }}>{catIcon(b.service_category)}</div>
                  <div>
                    <div style={{ fontSize: '15px', fontWeight: '600', color: 'var(--white)', marginBottom: '3px' }}>
                      {b.service_category}
                    </div>
                    <div style={{ fontSize: '13px', color: 'var(--muted)', fontFamily: 'DM Mono' }}>
                      📍 {b.location}
                    </div>
                  </div>
                  <div style={{ fontSize: '14px', color: b.technician_name ? 'var(--white)' : 'var(--muted)', fontWeight: '600' }}>
                    {b.technician_name || '—'}
                  </div>
                  <div style={{ fontSize: '13px', color: 'var(--muted)', fontFamily: 'DM Mono' }}>
                    {b.scheduled_time
                      ? new Date(b.scheduled_time).toLocaleDateString('en-KE', { day: 'numeric', month: 'short' })
                      : '—'}
                  </div>
                  <div style={{ fontFamily: 'Clash Display', fontSize: '15px', fontWeight: '700', color: b.amount ? 'var(--white)' : 'var(--muted)' }}>
                    {b.amount ? `KES ${Number(b.amount).toLocaleString()}` : '—'}
                  </div>
                  <span style={{
                    display: 'inline-block', padding: '3px 10px', borderRadius: '20px',
                    fontSize: '12px', fontWeight: '600', fontFamily: 'DM Mono',
                    background: cfg.bg, color: cfg.color,
                  }}>
                    {cfg.label}
                  </span>
                </motion.div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
