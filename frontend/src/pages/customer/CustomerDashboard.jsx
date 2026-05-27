import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { bookingsApi } from '../../api/bookings'
import { paymentsApi } from '../../api/payments'
import { authApi } from '../../api/auth'
import { notificationsApi } from '../../api/notifications'
import { reviewsApi } from '../../api/reviews'
import useAuthStore from '../../store/authStore'
import StatusBadge from '../../components/ui/StatusBadge'

// ── Constants ─────────────────────────────────────────────────────────────────

const QUICK_SERVICES = [
  { icon: '🧊', label: 'Fridge Repair',   category: 'Electrical' },
  { icon: '⚡', label: 'Wiring',          category: 'Electrical' },
  { icon: '🚿', label: 'Plumbing',        category: 'Plumbing'   },
  { icon: '🪚', label: 'Carpentry',       category: 'Carpentry'  },
  { icon: '🧹', label: 'Cleaning',        category: 'Cleaning'   },
  { icon: '💡', label: 'Lighting',        category: 'Electrical' },
  { icon: '🔌', label: 'Sockets',         category: 'Electrical' },
  { icon: '🔧', label: 'Other',           category: 'Other'      },
]

const ACTIVE_STATUSES = ['requested', 'broadcasted', 'assigned', 'in_progress']
const STEPS           = ['requested', 'broadcasted', 'assigned', 'in_progress', 'completed']
const STEP_LABELS     = ['Submitted',  'Finding tech', 'Assigned', 'In Progress', 'Done']

// ── Time-aware greeting ───────────────────────────────────────────────────────

function useGreeting(name) {
  const h = new Date().getHours()
  const part = h < 12 ? 'morning' : h < 17 ? 'afternoon' : 'evening'
  const icon = h < 12 ? '🌅'     : h < 17 ? '☀️'         : '🌙'
  return { text: `Good ${part}, ${name}`, icon }
}

// ── Main component ────────────────────────────────────────────────────────────

export default function CustomerDashboard() {
  const { user }  = useAuthStore()
  const navigate  = useNavigate()
  const qc        = useQueryClient()
  const greeting  = useGreeting(user?.first_name || 'there')
  const [payModal, setPayModal] = useState(null) // booking object when open

  const { data: bookings = [], isLoading } = useQuery({
    queryKey: ['bookings'],
    queryFn:  () => bookingsApi.list().then(r => r.data),
    refetchInterval: 20_000,
  })

  const { data: techStats = {} } = useQuery({
    queryKey: ['technician-stats'],
    queryFn:  () => authApi.technicianStats().then(r => r.data),
    staleTime: 5 * 60_000,
  })

  const { data: notifications = [] } = useQuery({
    queryKey: ['notifications'],
    queryFn:  () => notificationsApi.list().then(r => r.data),
    refetchInterval: 30_000,
  })

  const { data: myReviews = [], isLoading: reviewsLoading } = useQuery({
    queryKey: ['my-reviews'],
    queryFn:  () => reviewsApi.myReviews().then(r => r.data),
    staleTime: 60_000,
  })

  const active    = bookings.filter(b => ACTIVE_STATUSES.includes(b.status))
  const past      = bookings.filter(b => !ACTIVE_STATUSES.includes(b.status)).slice(0, 5)
  const topActive = active[0] ?? null

  return (
    <div>
      {/* ── Topbar ────────────────────────────────────────────────────────── */}
      <div style={{
        height: '60px', background: 'var(--ink2)', borderBottom: '1px solid var(--border2)',
        display: 'flex', alignItems: 'center', padding: '0 32px', gap: '12px',
        position: 'sticky', top: 0, zIndex: 100,
      }}>
        <span style={{ fontFamily: 'Clash Display', fontSize: '17px', fontWeight: '600', color: 'var(--white)' }}>
          Dashboard
        </span>
        <div style={{ flex: 1 }} />

        {/* Notifications bell */}
        <button
          onClick={() => navigate('/customer/bookings')}
          style={{
            display: 'flex', alignItems: 'center', gap: '6px',
            padding: '7px 14px', borderRadius: '8px',
            border: '1px solid var(--border2)', background: 'transparent',
            color: 'var(--muted)', fontSize: '14px', fontWeight: '600',
            cursor: 'pointer', fontFamily: 'Cabinet Grotesk',
          }}
        >
          🔔 Notifications
          {active.length > 0 && (
            <motion.span
              key={active.length}
              initial={{ scale: 0 }}
              animate={{ scale: [0, 1.25, 1] }}
              transition={{ type: 'spring', stiffness: 500, damping: 20 }}
              style={{
                width: '16px', height: '16px', borderRadius: '50%', background: 'var(--volt)',
                color: 'var(--ink)', fontSize: '11px', fontWeight: '700',
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              }}
            >{active.length}</motion.span>
          )}
        </button>

        <motion.button
          whileHover={{ translateY: -1 }} whileTap={{ scale: 0.97 }}
          onClick={() => navigate('/customer/book')}
          style={{
            padding: '8px 18px', borderRadius: '8px', border: 'none',
            background: 'var(--volt)', color: 'var(--ink)', fontSize: '15px',
            fontWeight: '700', fontFamily: 'Cabinet Grotesk', cursor: 'pointer',
          }}
        >
          + Book Service
        </motion.button>
      </div>

      <div style={{ padding: '28px 32px 60px' }}>

        {/* ── Greeting ──────────────────────────────────────────────────────── */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <div style={{ fontSize: '12px', letterSpacing: '2px', color: 'var(--volt)', textTransform: 'uppercase', fontFamily: 'DM Mono', marginBottom: '4px' }}>
            {greeting.text} {greeting.icon}
          </div>
          <h1 style={{ fontFamily: 'Clash Display', fontSize: '24px', fontWeight: '700', color: 'var(--white)', marginBottom: '24px' }}>
            What do you need fixed today?
          </h1>
        </motion.div>

        {/* ── Quick service cards ────────────────────────────────────────────── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(8, 1fr)', gap: '10px', marginBottom: '32px' }}>
          {QUICK_SERVICES.map(({ icon, label, category }, i) => (
            <motion.div
              key={label}
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.06, duration: 0.35 }}
              whileHover={{ translateY: -4, boxShadow: '0 8px 24px rgba(0,0,0,0.25)' }}
              whileTap={{ scale: 0.93 }}
              onClick={() => navigate(`/customer/book?category=${category}`)}
              style={{
                background: 'var(--ink3)', border: '1px solid var(--border2)',
                borderRadius: '14px', padding: '16px 8px', textAlign: 'center',
                cursor: 'pointer', transition: 'border-color 0.2s',
              }}
              onHoverStart={e => {}}
            >
              <div style={{ fontSize: '22px', marginBottom: '8px' }}>{icon}</div>
              <div style={{ fontSize: '12px', fontWeight: '600', color: 'var(--white)', lineHeight: '1.3', fontFamily: 'Cabinet Grotesk' }}>{label}</div>
            </motion.div>
          ))}
        </div>

        {/* ── Verified technician counts ────────────────────────────────────── */}
        {Object.keys(techStats).length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.12 }}
            style={{ marginBottom: '28px' }}
          >
            <div style={{ fontSize: '12px', fontWeight: '600', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '1px', fontFamily: 'DM Mono', marginBottom: '10px' }}>
              Verified Technicians Available
            </div>
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              {Object.entries(techStats).map(([spec, count]) => (
                <div
                  key={spec}
                  onClick={() => navigate(`/customer/book?category=${spec}`)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '8px',
                    padding: '8px 16px', borderRadius: '20px', cursor: 'pointer',
                    background: 'var(--ink3)', border: '1px solid var(--border2)',
                    transition: 'border-color 0.15s',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--volt)')}
                  onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border2)')}
                >
                  <span style={{
                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                    width: '22px', height: '22px', borderRadius: '50%',
                    background: '#FFF7ED', fontSize: '12px', fontWeight: '700', color: '#E8501A',
                  }}>{count}</span>
                  <span style={{ fontSize: '14px', fontWeight: '600', color: 'var(--white)' }}>{spec}</span>
                  <span style={{ fontSize: '12px', color: 'var(--muted)' }}>→</span>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* ── Two-column: Active job | Past jobs + Notifications ─────────────── */}
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '20px' }}>

          {/* ─ Active job (left) ─────────────────────────────────────────────── */}
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.18 }}>
            <div style={{ fontSize: '12px', fontWeight: '600', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '1px', fontFamily: 'DM Mono', marginBottom: '12px' }}>
              Active Job
            </div>

            {isLoading ? (
              <Skeleton />
            ) : topActive ? (
              <ActiveJobCard
                job={topActive}
                navigate={navigate}
                onPay={() => setPayModal(topActive)}
              />
            ) : (
              <EmptyActive onBook={() => navigate('/customer/book')} />
            )}
          </motion.div>

          {/* ─ Right column ──────────────────────────────────────────────────── */}
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.26 }}>

            {/* Past jobs */}
            <div style={{ fontSize: '12px', fontWeight: '600', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '1px', fontFamily: 'DM Mono', marginBottom: '12px' }}>
              Past Jobs
            </div>
            <div style={{ background: 'var(--ink3)', border: '1px solid var(--border2)', borderRadius: '16px', overflow: 'hidden', marginBottom: '20px' }}>
              {isLoading ? (
                [0,1,2].map(i => <RowSkeleton key={i} />)
              ) : past.length === 0 ? (
                <div style={{ padding: '28px 20px', textAlign: 'center', color: 'var(--muted)', fontSize: '14px' }}>
                  No past jobs yet
                </div>
              ) : past.map((b, i) => (
                <div
                  key={b.booking_id}
                  onClick={() => navigate(`/customer/bookings/${b.booking_id}`)}
                  style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    padding: '12px 16px', cursor: 'pointer',
                    borderBottom: i < past.length - 1 ? '1px solid var(--border2)' : 'none',
                    transition: 'background 0.15s',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.background = '#F8FAFC')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                >
                  <div>
                    <div style={{ fontSize: '14px', fontWeight: '600', color: 'var(--white)', marginBottom: '2px' }}>
                      {b.service_category}
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--muted)', fontFamily: 'DM Mono' }}>
                      {new Date(b.created_at).toLocaleDateString('en-KE', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <StatusBadge status={b.status} />
                    {b.amount && (
                      <div style={{ fontSize: '13px', color: 'var(--volt)', marginTop: '3px', fontWeight: '700' }}>
                        KES {Number(b.amount).toLocaleString()}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Notifications panel */}
            <NotificationPanel
              notifications={notifications}
              user={user}
              navigate={navigate}
              qc={qc}
            />
          </motion.div>
        </div>
        {/* ── Reviews section ───────────────────────────────────────────────── */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.32 }} style={{ marginTop: '28px' }}>
          <ReviewsSection
            bookings={bookings}
            myReviews={myReviews}
            reviewsLoading={reviewsLoading}
            qc={qc}
          />
        </motion.div>

      </div>

      {/* ── M-Pesa Payment Modal ──────────────────────────────────────────────── */}
      <AnimatePresence>
        {payModal && (
          <PaymentModal
            booking={payModal}
            user={user}
            qc={qc}
            onClose={() => setPayModal(null)}
          />
        )}
      </AnimatePresence>
    </div>
  )
}

// ── ActiveJobCard ─────────────────────────────────────────────────────────────

function ActiveJobCard({ job, navigate, onPay }) {
  const idx = STEPS.indexOf(job.status)

  return (
    <div style={{
      background: 'var(--ink3)', border: '1px solid var(--border2)',
      borderRadius: '20px', overflow: 'hidden',
    }}>
      {/* Header */}
      <div style={{ padding: '20px 20px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
        <div>
          <div style={{ fontSize: '16px', fontWeight: '700', color: 'var(--white)', marginBottom: '3px' }}>
            {job.service_category}
          </div>
          <div style={{ fontSize: '13px', color: 'var(--muted)', fontFamily: 'DM Mono' }}>
            #{job.booking_id?.slice(-8).toUpperCase()} · {job.location}
          </div>
        </div>
        <StatusBadge status={job.status} />
      </div>

      {/* Progress steps */}
      <div style={{ padding: '0 20px', marginBottom: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          {STEPS.map((s, i) => (
            <div key={s} style={{ display: 'flex', alignItems: 'center', flex: i < STEPS.length - 1 ? 1 : 'none' }}>
              {i < idx ? (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.15 + i * 0.08, type: 'spring', stiffness: 400, damping: 18 }}
                  style={{
                    width: '20px', height: '20px', borderRadius: '50%', flexShrink: 0,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: 'var(--volt)',
                  }}
                >
                  <svg width="10" height="8" viewBox="0 0 10 8" fill="none" stroke="var(--ink)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <motion.path
                      d="M1 4L4 7L9 1"
                      initial={{ pathLength: 0 }}
                      animate={{ pathLength: 1 }}
                      transition={{ delay: 0.26 + i * 0.08, duration: 0.35, ease: 'easeOut' }}
                    />
                  </svg>
                </motion.div>
              ) : i === idx ? (
                <motion.div
                  animate={{ boxShadow: ['0 0 0px 0px rgba(232,80,26,0)', '0 0 0px 5px rgba(232,80,26,0.3)', '0 0 0px 0px rgba(232,80,26,0)'] }}
                  transition={{ repeat: Infinity, duration: 1.8, ease: 'easeInOut' }}
                  style={{
                    width: '20px', height: '20px', borderRadius: '50%', flexShrink: 0,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '11px', fontWeight: '700',
                    background: 'var(--volt)', color: 'var(--ink)',
                  }}
                >
                  {i + 1}
                </motion.div>
              ) : (
                <div style={{
                  width: '20px', height: '20px', borderRadius: '50%', flexShrink: 0,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '11px', fontWeight: '700',
                  background: 'var(--ink)', border: '1px solid var(--muted2)', color: 'var(--muted)',
                }}>
                  {i + 1}
                </div>
              )}
              {i < STEPS.length - 1 && (
                <div style={{ flex: 1, height: '2px', background: 'var(--border2)', position: 'relative', overflow: 'hidden' }}>
                  <motion.div
                    initial={{ scaleX: 0 }}
                    animate={{ scaleX: i < idx ? 1 : 0 }}
                    transition={{ delay: 0.3 + i * 0.12, duration: 0.45, ease: 'easeOut' }}
                    style={{ position: 'absolute', inset: 0, background: 'var(--volt)', transformOrigin: 'left' }}
                  />
                </div>
              )}
            </div>
          ))}
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '6px' }}>
          {STEP_LABELS.map((l, i) => (
            <div key={l} style={{ fontSize: '8px', color: i <= idx ? 'var(--volt)' : 'var(--muted)', fontFamily: 'DM Mono', textAlign: 'center', flex: 1 }}>{l}</div>
          ))}
        </div>
      </div>

      {/* Map placeholder */}
      <div style={{
        margin: '0 20px 16px',
        height: '140px', borderRadius: '12px', overflow: 'hidden',
        background: '#FFF7ED',
        border: '1px solid var(--border2)',
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        position: 'relative',
      }}>
        {/* Grid overlay */}
        <div style={{
          position: 'absolute', inset: 0,
          backgroundImage: 'linear-gradient(rgba(232,80,26,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(232,80,26,0.06) 1px, transparent 1px)',
          backgroundSize: '24px 24px',
        }} />
        {/* Pin */}
        <div style={{ fontSize: '28px', marginBottom: '6px', position: 'relative' }}>📍</div>
        <div style={{ fontSize: '13px', color: 'var(--muted)', fontFamily: 'DM Mono', position: 'relative' }}>
          {job.location}
        </div>
        {job.status === 'in_progress' && (
          <div style={{
            position: 'absolute', top: '10px', right: '10px',
            padding: '3px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: '700',
            background: 'rgba(22,163,74,0.12)', border: '1px solid rgba(22,163,74,0.3)',
            color: '#16A34A', fontFamily: 'DM Mono',
          }}>
            LIVE
          </div>
        )}
      </div>

      {/* Technician info */}
      {job.technician_name ? (
        <div style={{
          margin: '0 20px 16px', padding: '14px', borderRadius: '12px',
          background: 'var(--ink)', border: '1px solid var(--border2)',
          display: 'flex', alignItems: 'center', gap: '12px',
        }}>
          <div style={{
            width: '42px', height: '42px', borderRadius: '50%', flexShrink: 0,
            background: 'var(--volt)', color: 'var(--ink)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '16px', fontWeight: '700',
          }}>
            {job.technician_name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: '15px', fontWeight: '700', color: 'var(--white)', marginBottom: '2px' }}>
              {job.technician_name}
            </div>
            <div style={{ fontSize: '12px', color: 'var(--muted)', fontFamily: 'DM Mono' }}>
              {job.service_category} specialist
            </div>
          </div>
          {job.amount && (
            <div style={{ fontFamily: 'Clash Display', fontSize: '17px', fontWeight: '700', color: 'var(--volt)', flexShrink: 0 }}>
              KES {Number(job.amount).toLocaleString()}
            </div>
          )}
        </div>
      ) : (
        <div style={{
          margin: '0 20px 16px', padding: '12px 16px', borderRadius: '12px',
          background: 'rgba(255,107,26,0.06)', border: '1px solid rgba(255,107,26,0.15)',
          fontSize: '14px', color: 'var(--muted)', textAlign: 'center',
        }}>
          {job.status === 'broadcasted'
            ? '⏳ Waiting for a technician to accept your request…'
            : '📋 Job submitted — broadcasting to nearby technicians soon'}
        </div>
      )}

      {/* Action buttons */}
      <div style={{ padding: '0 20px 20px', display: 'flex', gap: '10px' }}>
        {job.status === 'assigned' && job.amount && (
          <motion.button
            whileHover={{ translateY: -1 }} whileTap={{ scale: 0.98 }}
            onClick={onPay}
            style={{
              flex: 1, padding: '12px', borderRadius: '10px', border: 'none',
              background: 'var(--volt)', color: 'var(--ink)',
              fontSize: '15px', fontWeight: '700', fontFamily: 'Cabinet Grotesk',
              cursor: 'pointer', display: 'flex', alignItems: 'center',
              justifyContent: 'center', gap: '6px',
            }}
          >
            📱 Pay via M-Pesa — KES {Number(job.amount).toLocaleString()}
          </motion.button>
        )}
        <button
          onClick={() => navigate(`/customer/bookings/${job.booking_id}`)}
          style={{
            padding: '12px 18px', borderRadius: '10px',
            border: '1px solid var(--border2)', background: 'transparent',
            color: 'var(--muted)', fontSize: '14px', fontWeight: '600',
            fontFamily: 'Cabinet Grotesk', cursor: 'pointer', flexShrink: 0,
          }}
        >
          Details →
        </button>
      </div>
    </div>
  )
}

// ── M-Pesa Payment Modal ──────────────────────────────────────────────────────

function PaymentModal({ booking, user, qc, onClose }) {
  const [phone, setPhone] = useState(user?.phone_number || '')
  const [step, setStep]   = useState('form') // form | success | error
  const [errMsg, setErrMsg] = useState('')

  const stkMutation = useMutation({
    mutationFn: () => paymentsApi.stkPush({
      booking_id:        booking.booking_id,
      payer_phone_number: phone,
    }),
    onSuccess: () => {
      setStep('success')
      qc.invalidateQueries(['bookings'])
    },
    onError: (err) => {
      const d = err.response?.data
      setErrMsg(
        typeof d === 'string' ? d
        : d?.detail ?? 'Payment request failed. Please try again.'
      )
      setStep('error')
    },
  })

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!phone) return
    setStep('form')
    setErrMsg('')
    stkMutation.mutate()
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200,
        padding: '24px',
      }}
      onClick={() => !stkMutation.isPending && onClose()}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.9, opacity: 0, y: 20 }}
        onClick={e => e.stopPropagation()}
        style={{
          background: 'var(--ink2)', border: '1px solid var(--border2)',
          borderRadius: '24px', width: '100%', maxWidth: '420px', overflow: 'hidden',
        }}
      >
        {/* Modal header */}
        <div style={{
          padding: '20px 24px', borderBottom: '1px solid var(--border2)',
          display: 'flex', alignItems: 'center', gap: '12px',
        }}>
          <div style={{
            width: '40px', height: '40px', borderRadius: '12px',
            background: '#FFF7ED', border: '1px solid #FED7AA',
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px',
          }}>📱</div>
          <div>
            <div style={{ fontSize: '16px', fontWeight: '700', color: 'var(--white)' }}>Pay via M-Pesa</div>
            <div style={{ fontSize: '13px', color: 'var(--muted)' }}>
              {booking.service_category} · {booking.location}
            </div>
          </div>
        </div>

        <div style={{ padding: '24px' }}>
          {step === 'success' ? (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              style={{ textAlign: 'center', padding: '16px 0' }}
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 250, damping: 14, delay: 0.1 }}
                style={{ fontSize: '52px', marginBottom: '16px' }}
              >✅</motion.div>
              <div style={{ fontSize: '16px', fontWeight: '700', color: 'var(--white)', marginBottom: '8px' }}>
                Check your phone!
              </div>
              <div style={{ fontSize: '15px', color: 'var(--muted)', lineHeight: '1.6', marginBottom: '24px' }}>
                An M-Pesa prompt has been sent to <strong style={{ color: 'var(--white)' }}>{phone}</strong>. Enter your PIN to complete the payment.
              </div>
              <button
                onClick={onClose}
                style={{
                  padding: '12px 32px', borderRadius: '10px', border: 'none',
                  background: 'var(--volt)', color: 'var(--ink)',
                  fontSize: '15px', fontWeight: '700', fontFamily: 'Cabinet Grotesk', cursor: 'pointer',
                }}
              >
                Done
              </button>
            </motion.div>
          ) : (
            <form onSubmit={handleSubmit}>
              {/* Booking summary */}
              <div style={{
                padding: '14px 16px', borderRadius: '12px',
                background: 'var(--ink3)', border: '1px solid var(--border2)',
                marginBottom: '20px',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span style={{ fontSize: '14px', color: 'var(--muted)' }}>Service</span>
                  <span style={{ fontSize: '14px', fontWeight: '600', color: 'var(--white)' }}>{booking.service_category}</span>
                </div>
                {booking.technician_name && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <span style={{ fontSize: '14px', color: 'var(--muted)' }}>Technician</span>
                    <span style={{ fontSize: '14px', fontWeight: '600', color: 'var(--white)' }}>{booking.technician_name}</span>
                  </div>
                )}
                <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '8px', borderTop: '1px solid var(--border2)' }}>
                  <span style={{ fontSize: '15px', fontWeight: '700', color: 'var(--white)' }}>Total</span>
                  <span style={{ fontFamily: 'Clash Display', fontSize: '16px', fontWeight: '700', color: 'var(--volt)' }}>
                    KES {Number(booking.amount).toLocaleString()}
                  </span>
                </div>
              </div>

              {/* Error */}
              {step === 'error' && (
                <div style={{
                  marginBottom: '16px', padding: '10px 14px', borderRadius: '10px',
                  background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)',
                  color: '#EF4444', fontSize: '14px',
                }}>
                  {errMsg}
                </div>
              )}

              {/* Phone input */}
              <label style={{ display: 'block', fontSize: '14px', color: 'var(--muted)', marginBottom: '6px' }}>
                M-Pesa Phone Number
              </label>
              <input
                type="tel"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                placeholder="0712 345 678"
                required
                style={{
                  width: '100%', padding: '13px 16px', borderRadius: '12px',
                  background: 'var(--ink3)', border: '1px solid var(--border2)',
                  color: 'var(--white)', fontSize: '17px', outline: 'none',
                  fontFamily: 'Cabinet Grotesk', boxSizing: 'border-box', marginBottom: '16px',
                }}
                onFocus={e => (e.target.style.borderColor = 'var(--volt)')}
                onBlur={e => (e.target.style.borderColor = 'var(--border2)')}
              />

              <div style={{ fontSize: '13px', color: 'var(--muted)', marginBottom: '20px', lineHeight: '1.5' }}>
                You will receive a push notification on your phone. Enter your M-Pesa PIN to complete the payment.
              </div>

              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  type="button"
                  onClick={onClose}
                  disabled={stkMutation.isPending}
                  style={{
                    flex: 1, padding: '13px', borderRadius: '10px',
                    border: '1px solid var(--border2)', background: 'transparent',
                    color: 'var(--muted)', fontSize: '15px', fontWeight: '600',
                    fontFamily: 'Cabinet Grotesk', cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
                <motion.button
                  type="submit"
                  disabled={stkMutation.isPending || !phone}
                  whileHover={!stkMutation.isPending ? { translateY: -1 } : {}}
                  whileTap={{ scale: 0.98 }}
                  animate={stkMutation.isPending ? { opacity: [0.75, 1, 0.75] } : { opacity: 1 }}
                  transition={stkMutation.isPending ? { repeat: Infinity, duration: 1.2 } : {}}
                  style={{
                    flex: 2, padding: '13px', borderRadius: '10px', border: 'none',
                    background: stkMutation.isPending ? '#16A34A' : 'var(--volt)',
                    color: stkMutation.isPending ? '#FFFFFF' : 'var(--ink)',
                    fontSize: '15px', fontWeight: '700', fontFamily: 'Cabinet Grotesk',
                    cursor: stkMutation.isPending ? 'not-allowed' : 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '7px',
                  }}
                >
                  {stkMutation.isPending ? (
                    <>
                      <motion.span
                        animate={{ rotate: 360 }}
                        transition={{ repeat: Infinity, duration: 0.75, ease: 'linear' }}
                        style={{ display: 'inline-block', fontSize: '17px', lineHeight: 1 }}
                      >⟳</motion.span>
                      Sending…
                    </>
                  ) : `Pay KES ${Number(booking.amount).toLocaleString()} →`}
                </motion.button>
              </div>
            </form>
          )}
        </div>
      </motion.div>
    </motion.div>
  )
}

// ── Notification helpers ───────────────────────────────────────────────────────

function notifIcon(status) {
  return { broadcasted: '📢', assigned: '✅', in_progress: '🔧', requested: '📋' }[status] ?? '📋'
}
function notifBg(status) {
  return {
    broadcasted: 'rgba(255,107,26,0.12)',
    assigned:    'rgba(232,80,26,0.1)',
    in_progress: 'rgba(22,163,74,0.1)',
    requested:   'rgba(107,122,85,0.12)',
  }[status] ?? 'var(--ink)'
}
function notifTitle(b) {
  return {
    broadcasted: 'Finding a technician near you',
    assigned:    `${b.technician_name || 'Technician'} has been assigned`,
    in_progress: `${b.technician_name || 'Technician'} is on the way`,
    requested:   'Job request submitted',
  }[b.status] ?? 'Job update'
}

// ── Skeleton helpers ──────────────────────────────────────────────────────────

function EmptyActive({ onBook }) {
  return (
    <div style={{
      background: 'var(--ink3)', border: '1px dashed var(--border2)',
      borderRadius: '20px', padding: '48px 24px', textAlign: 'center',
    }}>
      <div style={{ fontSize: '40px', marginBottom: '14px' }}>🔧</div>
      <div style={{ fontSize: '17px', fontWeight: '600', color: 'var(--white)', marginBottom: '8px' }}>No active jobs</div>
      <div style={{ fontSize: '14px', color: 'var(--muted)', marginBottom: '24px', lineHeight: '1.6' }}>
        Book a service and a nearby technician will be assigned to you
      </div>
      <motion.button whileHover={{ translateY: -1 }} whileTap={{ scale: 0.98 }} onClick={onBook}
        style={{
          padding: '12px 28px', borderRadius: '10px', border: 'none',
          background: 'var(--volt)', color: 'var(--ink)',
          fontSize: '15px', fontWeight: '700', fontFamily: 'Cabinet Grotesk', cursor: 'pointer',
        }}
      >
        Book a Service →
      </motion.button>
    </div>
  )
}

function Skeleton() {
  return (
    <div style={{ background: 'var(--ink3)', border: '1px solid var(--border2)', borderRadius: '20px', padding: '24px' }}>
      {[70, 45, 100, 60].map((w, i) => (
        <div key={i} style={{ height: i === 0 ? '18px' : '12px', width: `${w}%`, borderRadius: '6px', background: 'var(--ink)', marginBottom: '12px' }} />
      ))}
    </div>
  )
}

function RowSkeleton() {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 16px', borderBottom: '1px solid var(--border2)' }}>
      <div style={{ height: '12px', width: '40%', borderRadius: '4px', background: 'var(--ink)' }} />
      <div style={{ height: '12px', width: '20%', borderRadius: '4px', background: 'var(--ink)' }} />
    </div>
  )
}

// ── ReviewsSection ────────────────────────────────────────────────────────────

const CATEGORY_ICONS = { Electrical: '⚡', Plumbing: '🚿', Carpentry: '🪚', Cleaning: '🧹', Other: '🔧' }

function StarPicker({ value, onChange, shake }) {
  const [hovered, setHovered] = useState(null)
  const [filled, setFilled]   = useState(value)

  useEffect(() => {
    if (value === 0) { setFilled(0); return }
    let i = 0
    const iv = setInterval(() => {
      i++
      setFilled(i)
      if (i >= value) clearInterval(iv)
    }, 55)
    return () => clearInterval(iv)
  }, [value])

  return (
    <motion.div
      animate={shake ? { x: [0, -6, 6, -6, 6, 0] } : {}}
      transition={{ duration: 0.35 }}
      style={{ display: 'inline-flex', gap: '4px' }}
    >
      {[1, 2, 3, 4, 5].map(star => (
        <motion.span
          key={star}
          whileHover={{ scale: 1.2 }}
          whileTap={{ scale: 0.85 }}
          onClick={() => onChange(star)}
          onMouseEnter={() => setHovered(star)}
          onMouseLeave={() => setHovered(null)}
          style={{
            fontSize: '24px', cursor: 'pointer',
            color: star <= (hovered ?? filled) ? '#F59E0B' : '#CBD5E1',
            display: 'inline-block',
          }}
        >★</motion.span>
      ))}
    </motion.div>
  )
}

function ReviewsSection({ bookings, myReviews, reviewsLoading, qc }) {
  const [expandedId, setExpandedId] = useState(null)
  const [ratings, setRatings]       = useState({})
  const [comments, setComments]     = useState({})
  const [submitErrors, setSubmitErrors] = useState({})
  const [shakeIds, setShakeIds]     = useState(new Set())

  const completedBookings = bookings.filter(b => b.status === 'completed')
  const reviewedIds = new Set(myReviews.map(r => String(r.booking_id)))

  const reviewedBookings   = completedBookings.filter(b => reviewedIds.has(String(b.booking_id)))
  const unreviewedPaid     = completedBookings.filter(b => !reviewedIds.has(String(b.booking_id)) && b.payment_status === 'Successful')
  const unreviewedUnpaid   = completedBookings.filter(b => !reviewedIds.has(String(b.booking_id)) && b.payment_status !== 'Successful')

  const submitMutation = useMutation({
    mutationFn: (data) => reviewsApi.create(data),
    onSuccess: (_, vars) => {
      qc.invalidateQueries(['my-reviews'])
      setExpandedId(null)
      setRatings(r  => { const n = { ...r };  delete n[vars.booking_id]; return n })
      setComments(c => { const n = { ...c };  delete n[vars.booking_id]; return n })
      setSubmitErrors(e => { const n = { ...e }; delete n[vars.booking_id]; return n })
    },
    onError: (err, vars) => {
      const d = err.response?.data
      const msg = typeof d === 'string' ? d : Object.values(d || {}).flat()[0] || 'Submission failed.'
      setSubmitErrors(e => ({ ...e, [vars.booking_id]: msg }))
    },
  })

  const handleSubmit = (bookingId) => {
    const rating = ratings[bookingId]
    if (!rating) {
      setSubmitErrors(e => ({ ...e, [bookingId]: 'Please select a star rating.' }))
      setShakeIds(s => new Set([...s, bookingId]))
      setTimeout(() => setShakeIds(s => { const n = new Set(s); n.delete(bookingId); return n }), 500)
      return
    }
    setSubmitErrors(e => { const n = { ...e }; delete n[bookingId]; return n })
    submitMutation.mutate({ booking_id: bookingId, rating, comment: comments[bookingId] || '' })
  }

  const totalCompleted = completedBookings.length

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
        <div style={{ fontSize: '12px', fontWeight: '600', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '1px', fontFamily: 'DM Mono' }}>
          Reviews · Completed Jobs
        </div>
        <div style={{ display: 'flex', gap: '12px', fontSize: '12px', color: 'var(--muted)' }}>
          <span><span style={{ color: '#F59E0B', fontWeight: '700' }}>{myReviews.length}</span> reviewed</span>
          {unreviewedPaid.length > 0 && (
            <span><span style={{ color: 'var(--volt)', fontWeight: '700' }}>{unreviewedPaid.length}</span> pending review</span>
          )}
        </div>
      </div>

      {reviewsLoading && totalCompleted === 0 ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '14px' }}>
          {[0,1,2].map(i => <ReviewCardSkeleton key={i} />)}
        </div>
      ) : totalCompleted === 0 ? (
        <div style={{
          background: 'var(--ink3)', border: '1px dashed var(--border2)',
          borderRadius: '16px', padding: '36px 24px', textAlign: 'center',
        }}>
          <div style={{ fontSize: '36px', marginBottom: '10px' }}>💬</div>
          <div style={{ fontSize: '15px', fontWeight: '600', color: 'var(--white)', marginBottom: '4px' }}>No completed jobs yet</div>
          <div style={{ fontSize: '13px', color: 'var(--muted)' }}>Once a job is done you can rate your technician here</div>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '14px' }}>

          {/* Already reviewed */}
          {reviewedBookings.map(booking => {
            const review = myReviews.find(r => String(r.booking_id) === String(booking.booking_id))
            if (!review) return null
            return (
              <motion.div
                key={booking.booking_id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                style={{
                  background: 'var(--ink3)', border: '1px solid rgba(22,163,74,0.2)',
                  borderRadius: '16px', padding: '18px',
                }}
              >
                {/* Header */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
                  <div style={{
                    width: '40px', height: '40px', borderRadius: '10px', flexShrink: 0,
                    background: '#FFF7ED', border: '1px solid #FED7AA',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px',
                  }}>
                    {CATEGORY_ICONS[booking.service_category] ?? '🔧'}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '14px', fontWeight: '700', color: 'var(--white)' }}>{booking.service_category}</div>
                    {booking.technician_name && (
                      <div style={{ fontSize: '12px', color: 'var(--muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {booking.technician_name}
                      </div>
                    )}
                  </div>
                  <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '8px', background: 'rgba(22,163,74,0.1)', color: '#16A34A', fontWeight: '600', border: '1px solid rgba(22,163,74,0.2)', flexShrink: 0 }}>
                    Reviewed ✓
                  </span>
                </div>

                {/* Stars */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
                  {[1,2,3,4,5].map(s => (
                    <span key={s} style={{ fontSize: '18px', color: s <= review.rating ? '#F59E0B' : '#CBD5E1' }}>★</span>
                  ))}
                  <span style={{ fontSize: '13px', fontWeight: '700', color: '#F59E0B' }}>{review.rating}/5</span>
                </div>

                {/* Comment */}
                {review.comment ? (
                  <div style={{ fontSize: '13px', color: 'var(--muted)', lineHeight: '1.6', fontStyle: 'italic' }}>
                    "{review.comment}"
                  </div>
                ) : (
                  <div style={{ fontSize: '12px', color: 'var(--muted2)', fontStyle: 'italic' }}>No comment left</div>
                )}

                <div style={{ fontSize: '11px', color: 'var(--muted2)', fontFamily: 'DM Mono', marginTop: '10px' }}>
                  {new Date(review.created_at).toLocaleDateString('en-KE', { day: 'numeric', month: 'short', year: 'numeric' })}
                </div>
              </motion.div>
            )
          })}

          {/* Pending review (paid, not reviewed) */}
          {unreviewedPaid.map(booking => {
            const isOpen    = expandedId === booking.booking_id
            const isPending = submitMutation.isPending && submitMutation.variables?.booking_id === booking.booking_id

            return (
              <motion.div
                key={booking.booking_id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                style={{
                  background: 'var(--ink3)', border: `1px solid ${isOpen ? 'var(--volt)' : 'rgba(232,80,26,0.2)'}`,
                  borderRadius: '16px', padding: '18px', transition: 'border-color 0.2s',
                }}
              >
                {/* Header */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
                  <div style={{
                    width: '40px', height: '40px', borderRadius: '10px', flexShrink: 0,
                    background: '#FFF7ED', border: '1px solid #FED7AA',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px',
                  }}>
                    {CATEGORY_ICONS[booking.service_category] ?? '🔧'}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '14px', fontWeight: '700', color: 'var(--white)' }}>{booking.service_category}</div>
                    {booking.technician_name && (
                      <div style={{ fontSize: '12px', color: 'var(--muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {booking.technician_name}
                      </div>
                    )}
                  </div>
                  <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '8px', background: '#FFF7ED', color: 'var(--volt)', fontWeight: '600', border: '1px solid #FED7AA', flexShrink: 0 }}>
                    Rate this
                  </span>
                </div>

                <AnimatePresence>
                  {!isOpen ? (
                    <motion.button
                      key="btn"
                      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                      whileHover={{ translateY: -1 }} whileTap={{ scale: 0.98 }}
                      onClick={() => setExpandedId(booking.booking_id)}
                      style={{
                        width: '100%', padding: '10px', borderRadius: '10px', border: 'none',
                        background: 'rgba(232,80,26,0.08)', color: 'var(--volt)',
                        fontSize: '13px', fontWeight: '700', cursor: 'pointer',
                        border: '1px solid rgba(232,80,26,0.2)',
                      }}
                    >
                      ★ Leave a Review
                    </motion.button>
                  ) : (
                    <motion.div
                      key="form"
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      style={{ overflow: 'hidden' }}
                    >
                      {/* Star picker */}
                      <div style={{ marginBottom: '12px' }}>
                        <div style={{ fontSize: '12px', color: 'var(--muted)', marginBottom: '8px' }}>Your rating</div>
                        <StarPicker
                          value={ratings[booking.booking_id] || 0}
                          onChange={v => setRatings(r => ({ ...r, [booking.booking_id]: v }))}
                          shake={shakeIds.has(booking.booking_id)}
                        />
                      </div>

                      {/* Comment */}
                      <div style={{ marginBottom: '12px' }}>
                        <div style={{ fontSize: '12px', color: 'var(--muted)', marginBottom: '6px' }}>Comment <span style={{ color: 'var(--muted2)' }}>(optional)</span></div>
                        <textarea
                          value={comments[booking.booking_id] || ''}
                          onChange={e => setComments(c => ({ ...c, [booking.booking_id]: e.target.value }))}
                          placeholder="How was the service? What did they do well?"
                          rows={3}
                          style={{
                            width: '100%', borderRadius: '8px', padding: '10px 12px',
                            fontSize: '13px', outline: 'none', resize: 'vertical',
                            background: 'var(--ink)', border: '1px solid var(--border2)',
                            color: 'var(--white)', lineHeight: '1.6', boxSizing: 'border-box',
                          }}
                          onFocus={e => (e.target.style.borderColor = 'var(--volt)')}
                          onBlur={e => (e.target.style.borderColor = 'var(--border2)')}
                        />
                      </div>

                      {/* Error */}
                      {submitErrors[booking.booking_id] && (
                        <div style={{ fontSize: '12px', color: 'var(--red)', marginBottom: '10px' }}>
                          {submitErrors[booking.booking_id]}
                        </div>
                      )}

                      {/* Actions */}
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button
                          onClick={() => { setExpandedId(null); setSubmitErrors(e => { const n = { ...e }; delete n[booking.booking_id]; return n }) }}
                          style={{
                            flex: 1, padding: '9px', borderRadius: '8px',
                            border: '1px solid var(--border2)', background: 'transparent',
                            color: 'var(--muted)', fontSize: '13px', fontWeight: '600', cursor: 'pointer',
                          }}
                        >
                          Cancel
                        </button>
                        <motion.button
                          whileTap={{ scale: 0.97 }}
                          onClick={() => handleSubmit(booking.booking_id)}
                          disabled={isPending}
                          style={{
                            flex: 2, padding: '9px', borderRadius: '8px', border: 'none',
                            background: 'var(--volt)', color: '#FFFFFF',
                            fontSize: '13px', fontWeight: '700', cursor: isPending ? 'not-allowed' : 'pointer',
                            opacity: isPending ? 0.6 : 1,
                          }}
                        >
                          {isPending ? 'Submitting…' : 'Submit Review'}
                        </motion.button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            )
          })}

          {/* Completed but unpaid — can't review yet */}
          {unreviewedUnpaid.map(booking => (
            <motion.div
              key={booking.booking_id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              style={{
                background: 'var(--ink3)', border: '1px solid var(--border2)',
                borderRadius: '16px', padding: '18px', opacity: 0.7,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
                <div style={{
                  width: '40px', height: '40px', borderRadius: '10px', flexShrink: 0,
                  background: 'var(--ink)', border: '1px solid var(--border2)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px',
                }}>
                  {CATEGORY_ICONS[booking.service_category] ?? '🔧'}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '14px', fontWeight: '700', color: 'var(--white)' }}>{booking.service_category}</div>
                  {booking.technician_name && (
                    <div style={{ fontSize: '12px', color: 'var(--muted)' }}>{booking.technician_name}</div>
                  )}
                </div>
              </div>
              <div style={{ fontSize: '12px', color: 'var(--muted)', textAlign: 'center', padding: '8px 0' }}>
                💳 Complete payment to leave a review
              </div>
            </motion.div>
          ))}

        </div>
      )}
    </div>
  )
}

function ReviewCardSkeleton() {
  return (
    <div style={{ background: 'var(--ink3)', border: '1px solid var(--border2)', borderRadius: '16px', padding: '18px' }}>
      <div style={{ display: 'flex', gap: '10px', marginBottom: '12px' }}>
        <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'var(--ink)', flexShrink: 0 }} />
        <div style={{ flex: 1 }}>
          <div style={{ height: '13px', width: '55%', background: 'var(--ink)', borderRadius: '5px', marginBottom: '7px' }} />
          <div style={{ height: '11px', width: '35%', background: 'var(--ink)', borderRadius: '4px' }} />
        </div>
      </div>
      <div style={{ height: '18px', width: '45%', background: 'var(--ink)', borderRadius: '5px', marginBottom: '10px' }} />
      <div style={{ height: '11px', width: '90%', background: 'var(--ink)', borderRadius: '4px' }} />
    </div>
  )
}

// ── NotificationPanel ────────────────────────────────────────────────────────

const NOTIF_TYPE_META = {
  'New Booking':          { icon: '🔔', color: '#E8501A', bg: '#FFF7ED' },
  'Booking Accepted':     { icon: '✅', color: '#16A34A', bg: '#F0FDF4' },
  'Booking Broadcasted':  { icon: '📡', color: '#2563EB', bg: '#EFF6FF' },
  'Booking Completed':    { icon: '🎉', color: '#15803D', bg: '#F0FDF4' },
  'Booking Cancelled':    { icon: '❌', color: '#DC2626', bg: '#FEF2F2' },
  'Payment Successful':   { icon: '💳', color: '#16A34A', bg: '#F0FDF4' },
  'System':               { icon: 'ℹ️', color: '#64748B', bg: '#F1F5F9' },
}

function NotificationPanel({ notifications, user, navigate, qc }) {
  const profileIssues = []
  if (user && !user.verified_email) {
    profileIssues.push({ id: 'email', icon: '⚠️', bg: '#FFF7ED', color: '#92400E', title: 'Email not verified', sub: 'Verify to unlock bookings', link: null })
  }

  const recent = notifications.slice(0, 8)
  const allItems = [...profileIssues, ...recent]

  const markRead = (id) => {
    notificationsApi.markRead(id).then(() => qc.invalidateQueries({ queryKey: ['notifications'] }))
  }

  return (
    <>
      <div style={{ fontSize: '12px', fontWeight: '600', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '1px', fontFamily: 'DM Mono', marginBottom: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span>Notifications</span>
        {notifications.filter(n => !n.is_read).length > 0 && (
          <span style={{ fontSize: '11px', background: 'var(--volt)', color: 'var(--ink)', borderRadius: '10px', padding: '1px 7px', fontWeight: '700' }}>
            {notifications.filter(n => !n.is_read).length} new
          </span>
        )}
      </div>
      <div style={{ background: 'var(--ink3)', border: '1px solid var(--border2)', borderRadius: '16px', overflow: 'hidden' }}>
        {allItems.length === 0 ? (
          <div style={{ padding: '28px 20px', textAlign: 'center', color: 'var(--muted)', fontSize: '14px' }}>
            No new notifications
          </div>
        ) : allItems.map((item, i) => {
          const isIssue = !!item.icon && profileIssues.includes(item)
          const meta    = isIssue ? { icon: item.icon, bg: item.bg, color: item.color } : (NOTIF_TYPE_META[item.event_type] || NOTIF_TYPE_META['System'])
          const isUnread = !isIssue && !item.is_read

          return (
            <motion.div
              key={item.id || item.id}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.05, duration: 0.25 }}
              onClick={() => {
                if (!isIssue && isUnread) markRead(item.id)
                if (item.link) navigate(item.link)
              }}
              style={{
                display: 'flex', alignItems: 'flex-start', gap: '10px',
                padding: '12px 16px', cursor: 'pointer',
                borderBottom: i < allItems.length - 1 ? '1px solid var(--border2)' : 'none',
                background: isUnread ? 'rgba(232,80,26,0.03)' : 'transparent',
                transition: 'background 0.15s',
              }}
              onMouseEnter={e => (e.currentTarget.style.background = '#F8FAFC')}
              onMouseLeave={e => (e.currentTarget.style.background = isUnread ? 'rgba(232,80,26,0.03)' : 'transparent')}
            >
              <div style={{
                width: '30px', height: '30px', borderRadius: '8px', flexShrink: 0,
                background: meta.bg, display: 'flex', alignItems: 'center',
                justifyContent: 'center', fontSize: '15px',
              }}>
                {meta.icon}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: '14px', fontWeight: isUnread ? '700' : '600', color: 'var(--white)', marginBottom: '2px', lineHeight: '1.3' }}>
                  {isIssue ? item.title : item.title}
                </div>
                <div style={{ fontSize: '12px', color: 'var(--muted)', fontFamily: 'DM Mono', lineHeight: '1.4', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {isIssue ? item.sub : item.message}
                </div>
              </div>
              {isUnread && (
                <div style={{ width: '7px', height: '7px', borderRadius: '50%', background: 'var(--volt)', flexShrink: 0, marginTop: '5px' }} />
              )}
            </motion.div>
          )
        })}
      </div>
    </>
  )
}
