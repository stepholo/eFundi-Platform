import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { useEffect, useRef, useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { bookingsApi } from '../../api/bookings'
import { technicianApi } from '../../api/technicians'
import useAuthStore from '../../store/authStore'

const ACCENT = 'var(--orange)'
const LOCATION_INTERVAL = 3 * 60 * 1000
const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

function useLocationSharing(isAvailable) {
  const [locState, setLocState] = useState('idle')
  const [lastPushed, setLastPushed] = useState(null)
  const intervalRef = useRef(null)

  const pushLocation = useCallback(() => {
    if (!navigator.geolocation) { setLocState('error'); return }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        technicianApi.pushLocation(pos.coords.latitude, pos.coords.longitude)
          .then(() => { setLocState('active'); setLastPushed(new Date()) })
          .catch(() => setLocState('error'))
      },
      (err) => setLocState(err.code === 1 ? 'denied' : 'error'),
      { timeout: 10_000, enableHighAccuracy: true },
    )
  }, [])

  useEffect(() => {
    if (isAvailable) {
      pushLocation()
      intervalRef.current = setInterval(pushLocation, LOCATION_INTERVAL)
    } else {
      clearInterval(intervalRef.current)
      setLocState('idle')
      setLastPushed(null)
    }
    return () => clearInterval(intervalRef.current)
  }, [isAvailable, pushLocation])

  return { locState, lastPushed, pushLocation }
}

function getMonthEarnings(bookings) {
  const now = new Date()
  return bookings
    .filter(b => {
      if (b.status !== 'completed' || !b.amount) return false
      const d = new Date(b.updated_at || b.created_at)
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
    })
    .reduce((s, b) => s + Number(b.amount), 0)
}

function getWeekEarnings(bookings) {
  const now = new Date()
  const dayOfWeek = now.getDay()
  const monday = new Date(now)
  monday.setDate(now.getDate() - ((dayOfWeek + 6) % 7))
  monday.setHours(0, 0, 0, 0)

  const byDay = Array(7).fill(0)
  bookings
    .filter(b => b.status === 'completed' && b.amount)
    .forEach(b => {
      const date = new Date(b.updated_at || b.created_at)
      const diff = Math.floor((date - monday) / (1000 * 60 * 60 * 24))
      if (diff >= 0 && diff < 7) byDay[diff] += Number(b.amount)
    })
  return byDay
}

export default function TechnicianDashboard() {
  const { user } = useAuthStore()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [withdrawModal, setWithdrawModal] = useState(false)

  const { data: profile } = useQuery({
    queryKey: ['tech-profile', user?.user_id],
    queryFn: () => technicianApi.getProfile(user.user_id).then(r => r.data),
    enabled: !!user?.user_id,
  })

  const { data: wallets = [] } = useQuery({
    queryKey: ['wallet'],
    queryFn: () => technicianApi.getWallet().then(r => r.data),
  })

  const { data: bookings = [], isLoading } = useQuery({
    queryKey: ['tech-bookings'],
    queryFn: () => bookingsApi.list().then(r => r.data),
    refetchInterval: 30_000,
  })

  const wallet     = wallets[0] ?? null

  const [displayBalance, setDisplayBalance] = useState(0)
  useEffect(() => {
    const target = wallet ? Number(wallet.balance) : 0
    if (!target) { setDisplayBalance(0); return }
    const steps = 30, dur = 600
    let step = 0
    const iv = setInterval(() => {
      step++
      const eased = 1 - Math.pow(1 - step / steps, 2)
      setDisplayBalance(Math.round(target * eased))
      if (step >= steps) clearInterval(iv)
    }, dur / steps)
    return () => clearInterval(iv)
  }, [wallet?.balance])

  const available  = bookings.filter(b => b.status === 'broadcasted')
  const active     = bookings.filter(b => ['assigned', 'in_progress'].includes(b.status))
  const completed  = bookings.filter(b => b.status === 'completed')
  const isVerified = profile?.verification_status === 'Verified'
  const isAvailable = profile?.is_available ?? false

  const todayStr = new Date().toDateString()
  const todayBookings = [...active, ...available]
    .filter(b => b.scheduled_time && new Date(b.scheduled_time).toDateString() === todayStr)
    .sort((a, b) => new Date(a.scheduled_time) - new Date(b.scheduled_time))

  const monthEarnings = getMonthEarnings(bookings)
  const weekEarnings  = getWeekEarnings(bookings)
  const maxWeek       = Math.max(...weekEarnings, 1)
  const avgRating     = profile?.average_rating ? Number(profile.average_rating).toFixed(1) : '–'
  const totalOffered  = completed.length + active.length + available.length
  const responseRate  = totalOffered > 0
    ? Math.round((completed.length + active.length) / totalOffered * 100)
    : 0

  const { locState, lastPushed, pushLocation } = useLocationSharing(isAvailable)

  const locLabel = (() => {
    if (!isAvailable || locState === 'idle') return null
    if (locState === 'denied') return { icon: '🚫', text: 'Location denied', color: '#EF4444' }
    if (locState === 'error')  return { icon: '⚠️', text: 'Location error',  color: '#FF6B1A' }
    if (locState === 'active' && lastPushed) {
      const mins = Math.round((Date.now() - lastPushed) / 60_000)
      return { icon: '📡', text: mins < 1 ? 'Location sent' : `Location · ${mins}m ago`, color: '#22C55E' }
    }
    return { icon: '📡', text: 'Locating…', color: 'var(--muted)' }
  })()

  return (
    <div>
      {/* ── Topbar ──────────────────────────────────────────────────────────── */}
      <div style={{
        height: '64px', background: 'var(--ink2)', borderBottom: '1px solid var(--border2)',
        display: 'flex', alignItems: 'center', padding: '0 32px', gap: '16px',
        position: 'sticky', top: 0, zIndex: 100,
      }}>
        <div>
          <div style={{ fontFamily: 'Clash Display', fontSize: '18px', fontWeight: '700', color: 'var(--white)' }}>
            Technician Dashboard
          </div>
          {isAvailable && (
            <div style={{ fontSize: '13px', color: '#22C55E', fontFamily: 'DM Mono' }}>
              ● Online — Accepting Jobs
            </div>
          )}
        </div>
        <div style={{ flex: 1 }} />

        {locLabel && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '15px' }}>{locLabel.icon}</span>
            <span style={{ fontSize: '14px', color: locLabel.color, fontFamily: 'DM Mono' }}>{locLabel.text}</span>
            <button
              onClick={pushLocation}
              title="Refresh location"
              style={{ background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer', fontSize: '16px', padding: '2px 6px', borderRadius: '6px' }}
            >↻</button>
          </div>
        )}

        {available.length > 0 && (
          <motion.button
            whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
            onClick={() => navigate('/technician/available')}
            style={{
              display: 'flex', alignItems: 'center', gap: '8px',
              padding: '9px 18px', borderRadius: '12px', border: 'none',
              background: 'rgba(255,107,26,0.12)', cursor: 'pointer',
              fontSize: '16px', fontWeight: '700', fontFamily: 'Cabinet Grotesk', color: ACCENT,
            }}
          >
            🔔
            <span style={{
              background: ACCENT, color: 'var(--ink)', borderRadius: '20px',
              padding: '1px 9px', fontSize: '15px', fontWeight: '800',
            }}>{available.length}</span>
            New Requests
          </motion.button>
        )}
      </div>

      <div style={{ padding: '28px 32px 60px' }}>

        {/* Verification warning */}
        {!isVerified && profile && (
          <motion.div
            initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
            style={{
              padding: '16px 20px', borderRadius: '14px', marginBottom: '28px',
              background: 'rgba(255,107,26,0.08)', border: '1px solid rgba(255,107,26,0.25)',
              display: 'flex', alignItems: 'center', gap: '14px',
            }}
          >
            <span style={{ fontSize: '26px' }}>⏳</span>
            <div>
              <div style={{ fontSize: '17px', fontWeight: '700', color: 'var(--orange)', marginBottom: '4px' }}>
                Account {profile.verification_status}
              </div>
              <div style={{ fontSize: '15px', color: 'var(--muted)', lineHeight: '1.5' }}>
                {profile.verification_status === 'Pending'
                  ? 'Awaiting admin verification. You will be able to accept jobs once approved.'
                  : 'Your account has been rejected. Contact support for assistance.'}
              </div>
            </div>
          </motion.div>
        )}

        {/* Greeting */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} style={{ marginBottom: '32px' }}>
          <div style={{ fontSize: '14px', letterSpacing: '2.5px', color: ACCENT, textTransform: 'uppercase', fontFamily: 'DM Mono', marginBottom: '8px' }}>
            Welcome back
          </div>
          <h1 style={{ fontFamily: 'Clash Display', fontSize: '32px', fontWeight: '700', color: 'var(--white)', margin: '0 0 8px' }}>
            Hi {user?.first_name} 👋
          </h1>
          <p style={{ fontSize: '17px', color: 'var(--muted)', margin: 0, fontFamily: 'Cabinet Grotesk' }}>
            {isAvailable
              ? "You're online — ready to receive job requests"
              : "Go online from the sidebar to start receiving jobs"}
          </p>
        </motion.div>

        {/* ── 4 Stat Cards ─────────────────────────────────────────────────── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '36px' }}>
          {[
            { label: 'This Month',     value: `KES ${monthEarnings.toLocaleString()}`, icon: '💰', color: '#22C55E',      delay: 0    },
            { label: 'Jobs Completed', value: completed.length,                        icon: '✅', color: ACCENT,         delay: 0.07 },
            { label: 'Avg Rating',     value: avgRating === '–' ? '–' : `${avgRating} ⭐`, icon: '⭐', color: '#FFD700', delay: 0.14 },
            { label: 'Response Rate',  value: `${responseRate}%`,                      icon: '📊', color: '#1AADFF',      delay: 0.21 },
          ].map(({ label, value, icon, color, delay }) => (
            <motion.div
              key={label}
              initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }}
              transition={{ delay, duration: 0.4 }}
              style={{ background: 'var(--ink3)', border: '1px solid var(--border2)', borderRadius: '20px', padding: '24px' }}
            >
              <div style={{
                width: '48px', height: '48px', borderRadius: '14px',
                background: `${color}1a`, display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '22px', marginBottom: '16px',
              }}>{icon}</div>
              <div style={{ fontSize: '13px', letterSpacing: '1.5px', color: 'var(--muted)', textTransform: 'uppercase', fontFamily: 'DM Mono', marginBottom: '10px' }}>
                {label}
              </div>
              <div style={{ fontFamily: 'Clash Display', fontSize: '36px', fontWeight: '700', color: 'var(--white)', lineHeight: 1 }}>
                {value}
              </div>
            </motion.div>
          ))}
        </div>

        {/* ── Two-column: Job Requests + Wallet/Schedule ───────────────────── */}
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '24px', marginBottom: '32px' }}>

          {/* Left — Incoming Job Requests */}
          <div>
            <div style={{ fontSize: '15px', fontWeight: '700', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '1.5px', fontFamily: 'DM Mono', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '10px' }}>
              Incoming Job Requests
              {available.length > 0 && (
                <span style={{
                  background: ACCENT, color: 'var(--ink)', borderRadius: '20px',
                  padding: '1px 8px', fontSize: '13px', fontWeight: '800',
                }}>{available.length}</span>
              )}
            </div>

            {isLoading ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {[0, 1].map(i => (
                  <div key={i} style={{ height: '140px', background: 'var(--ink3)', borderRadius: '18px', border: '1px solid var(--border2)' }} />
                ))}
              </div>
            ) : available.length === 0 ? (
              <div style={{
                background: 'var(--ink3)', border: '1px dashed var(--border2)', borderRadius: '20px',
                padding: '60px 24px', textAlign: 'center',
              }}>
                <div style={{ fontSize: '44px', marginBottom: '14px' }}>😴</div>
                <div style={{ fontSize: '17px', fontWeight: '700', color: 'var(--white)', marginBottom: '8px' }}>
                  No incoming requests
                </div>
                <div style={{ fontSize: '16px', color: 'var(--muted)' }}>
                  {isAvailable ? 'Waiting for job requests…' : 'Go online to start receiving jobs'}
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <AnimatePresence>
                  {available.map((job, i) => (
                    <JobRequestCard key={job.booking_id} job={job} qc={qc} delay={i * 0.06} />
                  ))}
                </AnimatePresence>
              </div>
            )}
          </div>

          {/* Right — Wallet + Today's Schedule */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

            {/* Wallet */}
            <motion.div
              initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.28 }}
              style={{
                background: 'linear-gradient(135deg, rgba(255,107,26,0.14) 0%, var(--ink3) 100%)',
                border: '1px solid rgba(255,107,26,0.25)', borderRadius: '20px', padding: '24px',
              }}
            >
              <div style={{ fontSize: '14px', letterSpacing: '1.5px', color: 'var(--muted)', textTransform: 'uppercase', fontFamily: 'DM Mono', marginBottom: '10px' }}>
                Wallet Balance
              </div>
              <div style={{ fontFamily: 'Clash Display', fontSize: '34px', fontWeight: '700', color: 'var(--white)', marginBottom: '22px' }}>
                KES {displayBalance.toLocaleString()}
              </div>
              <motion.button
                whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
                onClick={() => setWithdrawModal(true)}
                style={{
                  width: '100%', padding: '13px', borderRadius: '12px', border: 'none',
                  background: ACCENT, color: 'var(--ink)', fontSize: '17px',
                  fontWeight: '700', fontFamily: 'Cabinet Grotesk', cursor: 'pointer',
                }}
              >
                💸 Withdraw via M-Pesa
              </motion.button>
            </motion.div>

            {/* Today's Schedule */}
            <motion.div
              initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}
              style={{ background: 'var(--ink3)', border: '1px solid var(--border2)', borderRadius: '20px', padding: '22px', flex: 1 }}
            >
              <div style={{ fontSize: '14px', letterSpacing: '1.5px', color: 'var(--muted)', textTransform: 'uppercase', fontFamily: 'DM Mono', marginBottom: '16px' }}>
                Today's Schedule
              </div>
              {todayBookings.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '28px 0', color: 'var(--muted)', fontSize: '16px' }}>
                  No jobs scheduled today
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
                  {todayBookings.map((b, i) => (
                    <div key={b.booking_id} style={{
                      display: 'flex', gap: '14px', padding: '12px 0',
                      borderBottom: i < todayBookings.length - 1 ? '1px solid var(--border2)' : 'none',
                    }}>
                      <div style={{
                        width: '44px', flexShrink: 0, textAlign: 'right',
                        fontSize: '14px', fontFamily: 'DM Mono', color: ACCENT, paddingTop: '2px',
                      }}>
                        {new Date(b.scheduled_time).toLocaleTimeString('en-KE', { hour: '2-digit', minute: '2-digit' })}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: '16px', fontWeight: '600', color: 'var(--white)', marginBottom: '3px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {b.service_category}
                        </div>
                        <div style={{ fontSize: '14px', color: 'var(--muted)', fontFamily: 'DM Mono', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          📍 {b.location}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          </div>
        </div>

        {/* ── Weekly Earnings Chart ────────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.42 }}
          style={{ background: 'var(--ink3)', border: '1px solid var(--border2)', borderRadius: '20px', padding: '26px' }}
        >
          <div style={{ fontSize: '15px', fontWeight: '700', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '1.5px', fontFamily: 'DM Mono', marginBottom: '22px' }}>
            Weekly Earnings
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {DAYS.map((day, i) => {
              const amount = weekEarnings[i]
              const pct = (amount / maxWeek) * 100
              return (
                <div key={day} style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                  <div style={{ width: '36px', fontSize: '15px', fontFamily: 'DM Mono', color: 'var(--muted)', textAlign: 'right', flexShrink: 0 }}>
                    {day}
                  </div>
                  <div style={{ flex: 1, height: '30px', background: 'var(--ink2)', borderRadius: '8px', overflow: 'hidden' }}>
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${pct}%` }}
                      transition={{ delay: 0.55 + i * 0.06, duration: 0.65, ease: 'easeOut' }}
                      style={{
                        height: '100%', borderRadius: '8px',
                        background: pct > 0 ? 'linear-gradient(90deg, var(--orange), #FF9F4A)' : 'transparent',
                      }}
                    />
                  </div>
                  <div style={{ width: '100px', fontSize: '15px', fontFamily: 'DM Mono', color: amount > 0 ? 'var(--white)' : 'var(--muted)', flexShrink: 0, textAlign: 'right' }}>
                    {amount > 0 ? `KES ${amount.toLocaleString()}` : '—'}
                  </div>
                </div>
              )
            })}
          </div>
        </motion.div>
      </div>

      {/* Withdraw Modal */}
      <AnimatePresence>
        {withdrawModal && (
          <WithdrawModal
            wallet={wallet}
            user={user}
            onClose={() => setWithdrawModal(false)}
            qc={qc}
          />
        )}
      </AnimatePresence>
    </div>
  )
}

function JobRequestCard({ job, qc, delay }) {
  const [amount, setAmount]   = useState(job.amount ? String(job.amount) : '')
  const [errMsg, setErrMsg]   = useState('')
  const [exitDir, setExitDir] = useState('accept')
  const [accepted, setAccepted] = useState(false)

  const acceptMutation = useMutation({
    mutationFn: () => bookingsApi.accept(job.booking_id, Number(amount)),
    onSuccess: () => {
      setExitDir('accept')
      setAccepted(true)
      setTimeout(() => qc.invalidateQueries(['tech-bookings']), 500)
    },
    onError: (e) => setErrMsg(e?.response?.data?.detail || 'Failed to accept job'),
  })

  const declineMutation = useMutation({
    mutationFn: () => bookingsApi.decline(job.booking_id),
    onSuccess: () => {
      setExitDir('decline')
      qc.invalidateQueries(['tech-bookings'])
    },
    onError: () => setErrMsg('Failed to decline job'),
  })

  const isBusy = acceptMutation.isPending || declineMutation.isPending

  function handleAccept() {
    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
      setErrMsg('Enter a valid quote amount first')
      return
    }
    setErrMsg('')
    acceptMutation.mutate()
  }

  return (
    <motion.div
      initial={{ opacity: 0, x: 60 }}
      animate={{ opacity: 1, x: 0 }}
      exit={exitDir === 'decline'
        ? { x: -120, opacity: 0, transition: { duration: 0.28 } }
        : { scale: 0.9, opacity: 0, transition: { duration: 0.28 } }}
      transition={{ delay, duration: 0.35 }}
      style={{
        position: 'relative', overflow: 'hidden',
        background: 'var(--ink3)', border: '1px solid var(--border2)',
        borderRadius: '18px', padding: '22px',
      }}
    >
      <AnimatePresence>
        {accepted && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            style={{
              position: 'absolute', inset: 0, borderRadius: '18px',
              background: 'rgba(34,197,94,0.22)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              zIndex: 10, pointerEvents: 'none',
            }}
          >
            <motion.span
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 300, damping: 15 }}
              style={{ fontSize: '52px' }}
            >✅</motion.span>
          </motion.div>
        )}
      </AnimatePresence>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '14px' }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontFamily: 'Clash Display', fontSize: '20px', fontWeight: '700', color: 'var(--white)', marginBottom: '5px' }}>
            {job.service_category}
          </div>
          <div style={{ fontSize: '16px', color: 'var(--muted)', marginBottom: '3px' }}>
            📍 {job.location}
          </div>
          {job.scheduled_time && (
            <div style={{ fontSize: '14px', color: 'var(--muted)', fontFamily: 'DM Mono' }}>
              🕐 {new Date(job.scheduled_time).toLocaleString('en-KE', {
                weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
              })}
            </div>
          )}
        </div>
        <div style={{
          padding: '4px 12px', borderRadius: '20px', fontSize: '13px', fontWeight: '700',
          background: 'rgba(255,107,26,0.12)', color: ACCENT, fontFamily: 'DM Mono', flexShrink: 0, marginLeft: '12px',
        }}>
          New
        </div>
      </div>

      {job.description && (
        <div style={{
          fontSize: '16px', color: 'var(--muted)', lineHeight: '1.6', marginBottom: '16px',
          padding: '12px 16px', background: 'var(--ink2)', borderRadius: '10px',
        }}>
          {job.description}
        </div>
      )}

      <div style={{ marginBottom: '16px' }}>
        <label style={{ fontSize: '15px', color: 'var(--muted)', fontFamily: 'DM Mono', display: 'block', marginBottom: '7px' }}>
          Your Quote (KES)
        </label>
        <input
          type="number"
          value={amount}
          onChange={e => { setAmount(e.target.value); setErrMsg('') }}
          placeholder="Enter your price"
          style={{
            width: '100%', padding: '11px 16px', borderRadius: '10px',
            border: `1px solid ${errMsg ? '#EF4444' : 'var(--border2)'}`,
            background: 'var(--ink2)', color: 'var(--white)', fontSize: '16px',
            fontFamily: 'Cabinet Grotesk', outline: 'none', boxSizing: 'border-box',
          }}
        />
        {errMsg && (
          <div style={{ fontSize: '15px', color: '#EF4444', marginTop: '5px' }}>{errMsg}</div>
        )}
      </div>

      <div style={{ display: 'flex', gap: '10px' }}>
        <motion.button
          whileTap={{ scale: 0.97 }}
          disabled={isBusy}
          onClick={handleAccept}
          style={{
            flex: 1, padding: '13px', borderRadius: '12px', border: 'none',
            background: ACCENT, color: 'var(--ink)', fontSize: '17px',
            fontWeight: '700', fontFamily: 'Cabinet Grotesk',
            cursor: isBusy ? 'not-allowed' : 'pointer', opacity: isBusy ? 0.6 : 1,
          }}
        >
          {acceptMutation.isPending ? 'Accepting…' : '✓ Accept Job'}
        </motion.button>
        <motion.button
          whileTap={{ scale: 0.97 }}
          disabled={isBusy}
          onClick={() => declineMutation.mutate()}
          style={{
            padding: '13px 22px', borderRadius: '12px',
            border: '1px solid rgba(239,68,68,0.35)', background: 'transparent',
            color: '#EF4444', fontSize: '17px', fontWeight: '700',
            fontFamily: 'Cabinet Grotesk',
            cursor: isBusy ? 'not-allowed' : 'pointer', opacity: isBusy ? 0.6 : 1,
          }}
        >
          {declineMutation.isPending ? '…' : 'Decline'}
        </motion.button>
      </div>
    </motion.div>
  )
}

function WithdrawModal({ wallet, user, onClose, qc }) {
  const [amount, setAmount] = useState('')
  const [phone, setPhone]   = useState(user?.phone_number || '')
  const [stage, setStage]   = useState('form') // form | success
  const [errMsg, setErrMsg] = useState('')

  const mutation = useMutation({
    mutationFn: () => technicianApi.requestWithdrawal({ amount: Number(amount), phone_number: phone }),
    onSuccess: () => { setStage('success'); qc.invalidateQueries(['wallet']) },
    onError: (e) => setErrMsg(e?.response?.data?.detail || 'Withdrawal request failed'),
  })

  const max = wallet ? Number(wallet.balance) : 0

  function handleSubmit() {
    if (!amount || Number(amount) <= 0) { setErrMsg('Enter a valid amount'); return }
    if (Number(amount) > max) { setErrMsg('Amount exceeds your wallet balance'); return }
    if (!phone) { setErrMsg('Enter your M-Pesa phone number'); return }
    setErrMsg('')
    mutation.mutate()
  }

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 300,
      }}
      onClick={() => !mutation.isPending && onClose()}
    >
      <motion.div
        initial={{ scale: 0.92, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.92, opacity: 0 }}
        onClick={e => e.stopPropagation()}
        style={{
          background: 'var(--ink2)', border: '1px solid var(--border2)',
          borderRadius: '22px', padding: '30px', width: '420px',
        }}
      >
        {stage === 'success' ? (
          <div style={{ textAlign: 'center', padding: '16px 0' }}>
            <div style={{ fontSize: '52px', marginBottom: '16px' }}>✅</div>
            <div style={{ fontSize: '19px', fontWeight: '700', color: 'var(--white)', marginBottom: '10px', fontFamily: 'Clash Display' }}>
              Request Submitted!
            </div>
            <div style={{ fontSize: '16px', color: 'var(--muted)', lineHeight: '1.7', marginBottom: '26px' }}>
              Your withdrawal is being processed by admin. Funds will arrive via M-Pesa shortly.
            </div>
            <button
              onClick={onClose}
              style={{
                padding: '12px 36px', borderRadius: '12px', background: ACCENT, border: 'none',
                color: 'var(--ink)', fontSize: '17px', fontWeight: '700', fontFamily: 'Cabinet Grotesk', cursor: 'pointer',
              }}
            >
              Done
            </button>
          </div>
        ) : (
          <>
            <div style={{ fontSize: '28px', marginBottom: '14px' }}>💸</div>
            <div style={{ fontFamily: 'Clash Display', fontSize: '18px', fontWeight: '700', color: 'var(--white)', marginBottom: '6px' }}>
              Withdraw via M-Pesa
            </div>
            <div style={{ fontSize: '16px', color: 'var(--muted)', marginBottom: '26px' }}>
              Available:{' '}
              <span style={{ color: ACCENT, fontFamily: 'DM Mono', fontWeight: '700' }}>
                KES {max.toLocaleString()}
              </span>
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ fontSize: '15px', color: 'var(--muted)', fontFamily: 'DM Mono', display: 'block', marginBottom: '7px' }}>
                Amount (KES)
              </label>
              <input
                type="number" value={amount} max={max}
                onChange={e => { setAmount(e.target.value); setErrMsg('') }}
                placeholder="0"
                style={{
                  width: '100%', padding: '12px 16px', borderRadius: '10px',
                  border: '1px solid var(--border2)', background: 'var(--ink)',
                  color: 'var(--white)', fontSize: '16px', fontFamily: 'Cabinet Grotesk',
                  outline: 'none', boxSizing: 'border-box',
                }}
              />
            </div>

            <div style={{ marginBottom: '22px' }}>
              <label style={{ fontSize: '15px', color: 'var(--muted)', fontFamily: 'DM Mono', display: 'block', marginBottom: '7px' }}>
                M-Pesa Phone Number
              </label>
              <input
                type="tel" value={phone}
                onChange={e => { setPhone(e.target.value); setErrMsg('') }}
                placeholder="07XXXXXXXX"
                style={{
                  width: '100%', padding: '12px 16px', borderRadius: '10px',
                  border: '1px solid var(--border2)', background: 'var(--ink)',
                  color: 'var(--white)', fontSize: '16px', fontFamily: 'Cabinet Grotesk',
                  outline: 'none', boxSizing: 'border-box',
                }}
              />
            </div>

            {errMsg && (
              <div style={{
                padding: '11px 16px', borderRadius: '10px', marginBottom: '16px',
                background: 'rgba(239,68,68,0.1)', color: '#EF4444', fontSize: '15px',
              }}>
                {errMsg}
              </div>
            )}

            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                onClick={onClose}
                disabled={mutation.isPending}
                style={{
                  flex: 1, padding: '12px', borderRadius: '10px',
                  border: '1px solid var(--border2)', background: 'transparent',
                  color: 'var(--muted)', fontSize: '16px', fontWeight: '600',
                  fontFamily: 'Cabinet Grotesk', cursor: 'pointer',
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={mutation.isPending}
                style={{
                  flex: 1, padding: '12px', borderRadius: '10px', border: 'none',
                  background: ACCENT, color: 'var(--ink)', fontSize: '16px',
                  fontWeight: '700', fontFamily: 'Cabinet Grotesk',
                  cursor: mutation.isPending ? 'not-allowed' : 'pointer',
                  opacity: mutation.isPending ? 0.6 : 1,
                }}
              >
                {mutation.isPending ? 'Submitting…' : 'Request Withdrawal'}
              </button>
            </div>
          </>
        )}
      </motion.div>
    </motion.div>
  )
}
