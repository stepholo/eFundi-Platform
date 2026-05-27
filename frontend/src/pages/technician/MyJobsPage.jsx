import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { bookingsApi } from '../../api/bookings'
import StatusBadge from '../../components/ui/StatusBadge'

// ── Constants ─────────────────────────────────────────────────────────────────

const STEPS       = ['assigned', 'in_progress', 'completed']
const STEP_LABELS = ['Assigned', 'In Progress', 'Done']
const FILTERS     = ['All', 'Active', 'Completed', 'Cancelled']
const ACTIVE      = ['assigned', 'in_progress']

function filterJobs(bookings, tab) {
  if (tab === 'Active')    return bookings.filter(b => ACTIVE.includes(b.status))
  if (tab === 'Completed') return bookings.filter(b => b.status === 'completed')
  if (tab === 'Cancelled') return bookings.filter(b => b.status === 'cancelled')
  return bookings // All
}

function catIcon(cat) {
  return { Electrical: '⚡', Plumbing: '🚿', Carpentry: '🪚', Cleaning: '🧹', Other: '🔧' }[cat] ?? '🔧'
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function MyJobsPage() {
  const qc = useQueryClient()
  const [tab, setTab]           = useState('Active')
  const [selectedId, setSelectedId] = useState(null)

  const { data: bookings = [], isLoading } = useQuery({
    queryKey: ['tech-bookings'],
    queryFn:  () => bookingsApi.list().then(r => r.data),
    refetchInterval: 30_000,
  })

  const visible = filterJobs(bookings, tab)

  // Auto-select first item on tab change or initial load
  useEffect(() => {
    if (visible.length > 0) setSelectedId(visible[0].booking_id)
    else setSelectedId(null)
  }, [tab, bookings.length])

  // Fetch full detail for selected job
  const { data: job, isLoading: detailLoading } = useQuery({
    queryKey: ['tech-job', selectedId],
    queryFn:  () => bookingsApi.get(selectedId).then(r => r.data),
    enabled:  !!selectedId,
    refetchInterval: 20_000,
  })

  const handleSelect = (id) => {
    if (id === selectedId) return
    setSelectedId(id)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>

      {/* ── Topbar ──────────────────────────────────────────────────────────── */}
      <div style={{
        height: '60px', background: 'var(--ink2)', borderBottom: '1px solid var(--border2)',
        display: 'flex', alignItems: 'center', padding: '0 28px', gap: '16px',
        flexShrink: 0, position: 'sticky', top: 0, zIndex: 100,
      }}>
        <span style={{ fontFamily: 'Clash Display', fontSize: '17px', fontWeight: '600', color: 'var(--white)' }}>
          My Jobs
        </span>
      </div>

      {/* ── Two-column body ──────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', flex: 1, minHeight: 0 }}>

        {/* ── Left: job list ─────────────────────────────────────────────── */}
        <div style={{
          width: '42%', flexShrink: 0,
          borderRight: '1px solid var(--border2)',
          overflowY: 'auto', padding: '20px 16px',
          background: 'var(--ink)',
        }}>
          {/* Filter tabs */}
          <div style={{ display: 'flex', gap: '6px', marginBottom: '16px', flexWrap: 'wrap' }}>
            {FILTERS.map(f => {
              const activeCount = filterJobs(bookings, 'Active').length
              return (
                <button
                  key={f}
                  onClick={() => setTab(f)}
                  style={{
                    padding: '5px 13px', borderRadius: '20px', border: 'none', cursor: 'pointer',
                    fontSize: '13px', fontWeight: '600', fontFamily: 'Cabinet Grotesk',
                    background: tab === f ? '#FF9A3C' : 'var(--ink3)',
                    color:      tab === f ? '#FFFFFF'  : 'var(--muted)',
                    transition: 'all 0.15s',
                    display: 'flex', alignItems: 'center', gap: '5px',
                  }}
                >
                  {f}
                  {f === 'Active' && activeCount > 0 && (
                    <span style={{
                      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                      width: '16px', height: '16px', borderRadius: '50%',
                      background: tab === f ? 'rgba(255,255,255,0.25)' : '#FF9A3C',
                      color: '#FFFFFF', fontSize: '10px', fontWeight: '700',
                    }}>
                      {activeCount}
                    </span>
                  )}
                </button>
              )
            })}
          </div>

          {/* Job cards */}
          {isLoading ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {[0,1,2,3].map(i => <SkeletonRow key={i} />)}
            </div>
          ) : visible.length === 0 ? (
            <EmptyLeft tab={tab} />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {visible.map((b, i) => (
                <CompactRow
                  key={b.booking_id}
                  job={b}
                  index={i}
                  isSelected={b.booking_id === selectedId}
                  onClick={() => handleSelect(b.booking_id)}
                />
              ))}
            </div>
          )}
        </div>

        {/* ── Right: job detail ──────────────────────────────────────────── */}
        <div style={{ flex: 1, overflowY: 'auto', background: 'var(--ink)', padding: '24px 28px 60px' }}>
          {!selectedId ? (
            <PlaceholderEmpty />
          ) : detailLoading && !job ? (
            <DetailSkeleton />
          ) : job ? (
            <JobDetail job={job} qc={qc} />
          ) : null}
        </div>

      </div>
    </div>
  )
}

// ── Compact list card ─────────────────────────────────────────────────────────

function CompactRow({ job: b, index, isSelected, onClick }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04 }}
      onClick={onClick}
      style={{
        background: isSelected ? 'rgba(255,154,60,0.07)' : 'var(--ink3)',
        border: `1.5px solid ${isSelected ? '#FF9A3C' : 'var(--border2)'}`,
        borderRadius: '14px', padding: '14px', cursor: 'pointer',
        transition: 'border-color 0.15s, background 0.15s',
      }}
      onMouseEnter={e => { if (!isSelected) e.currentTarget.style.background = '#F8FAFC' }}
      onMouseLeave={e => { if (!isSelected) e.currentTarget.style.background = 'var(--ink3)' }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
        {/* Category icon */}
        <div style={{
          width: '40px', height: '40px', borderRadius: '10px', flexShrink: 0,
          background: ACTIVE.includes(b.status) ? '#FFF7ED' : 'var(--ink)',
          border: '1px solid var(--border2)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px',
        }}>
          {catIcon(b.service_category)}
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          {/* Service + status */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '3px' }}>
            <div style={{ fontSize: '14px', fontWeight: '700', color: 'var(--white)' }}>
              {b.service_category}
            </div>
            <StatusBadge status={b.status} />
          </div>

          {/* Location */}
          <div style={{ fontSize: '12px', color: 'var(--muted)', marginBottom: '6px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            📍 {b.location}
          </div>

          {/* Amount + payment pill */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            {b.amount ? (
              <span style={{ fontSize: '13px', fontWeight: '700', color: '#FF9A3C' }}>
                KES {Number(b.amount).toLocaleString()}
              </span>
            ) : (
              <span style={{ fontSize: '12px', color: 'var(--muted)', fontStyle: 'italic' }}>No quote set</span>
            )}
            {b.status === 'completed' && <PaymentPill status={b.payment_status || 'Pending'} />}
          </div>
        </div>
      </div>
    </motion.div>
  )
}

// ── Full detail panel ─────────────────────────────────────────────────────────

function JobDetail({ job, qc }) {
  const startMutation = useMutation({
    mutationFn: () => bookingsApi.start(job.booking_id),
    onSuccess:  () => {
      qc.invalidateQueries(['tech-bookings'])
      qc.invalidateQueries(['tech-job', job.booking_id])
    },
  })
  const completeMutation = useMutation({
    mutationFn: () => bookingsApi.complete(job.booking_id),
    onSuccess:  () => {
      qc.invalidateQueries(['tech-bookings'])
      qc.invalidateQueries(['tech-job', job.booking_id])
    },
  })

  const stepIdx    = STEPS.indexOf(job.status)
  const scheduledAt = new Date(job.scheduled_time)
  const isActive   = ACTIVE.includes(job.status)

  return (
    <div>
      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '14px', marginBottom: '20px' }}>
        <div style={{
          width: '52px', height: '52px', borderRadius: '14px', flexShrink: 0,
          background: isActive ? '#FFF7ED' : 'var(--ink3)',
          border: `1px solid ${isActive ? '#FED7AA' : 'var(--border2)'}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px',
        }}>
          {catIcon(job.service_category)}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontFamily: 'Clash Display', fontSize: '20px', fontWeight: '700', color: 'var(--white)', marginBottom: '2px' }}>
            {job.service_category}
          </div>
          <div style={{ fontSize: '13px', color: 'var(--muted)' }}>
            Booking #{job.booking_id?.slice(-8).toUpperCase()}
          </div>
        </div>
        <StatusBadge status={job.status} />
      </div>

      {/* ── Progress stepper ────────────────────────────────────────────── */}
      {job.status !== 'cancelled' && (
        <div style={{
          background: 'var(--ink3)', border: '1px solid var(--border2)',
          borderRadius: '16px', padding: '20px', marginBottom: '16px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            {STEPS.map((s, i) => (
              <div key={s} style={{ display: 'flex', alignItems: 'center', flex: i < STEPS.length - 1 ? 1 : 'none' }}>
                <div style={{
                  width: '24px', height: '24px', borderRadius: '50%', flexShrink: 0,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '11px', fontWeight: '700',
                  background: i <= stepIdx ? '#FF9A3C' : 'var(--ink)',
                  border: i <= stepIdx ? 'none' : '2px solid var(--border2)',
                  color: i <= stepIdx ? '#FFFFFF' : 'var(--muted)',
                }}>
                  {i < stepIdx ? '✓' : i + 1}
                </div>
                {i < STEPS.length - 1 && (
                  <div style={{
                    flex: 1, height: '3px',
                    background: i < stepIdx ? '#FF9A3C' : 'var(--border2)',
                  }} />
                )}
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '8px' }}>
            {STEP_LABELS.map((l, i) => (
              <div key={l} style={{
                fontSize: '10px', fontFamily: 'DM Mono', flex: 1, textAlign: 'center',
                color: i <= stepIdx ? '#FF9A3C' : 'var(--muted)',
                fontWeight: i === stepIdx ? '700' : '400',
              }}>
                {l}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Info grid ───────────────────────────────────────────────────── */}
      <div style={{
        background: 'var(--ink3)', border: '1px solid var(--border2)',
        borderRadius: '16px', padding: '20px', marginBottom: '16px',
        display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px',
      }}>
        <InfoItem icon="📍" label="Location" value={job.location} />
        <InfoItem
          icon="🗓" label="Scheduled"
          value={`${scheduledAt.toLocaleDateString('en-KE', { weekday: 'short', day: 'numeric', month: 'short' })} at ${scheduledAt.toLocaleTimeString('en-KE', { hour: '2-digit', minute: '2-digit' })}`}
        />
        <InfoItem
          icon="💰" label="Quoted Amount"
          value={job.amount ? `KES ${Number(job.amount).toLocaleString()}` : '—'}
          highlight={!!job.amount}
        />
        <InfoItem
          icon="📅" label="Accepted On"
          value={job.accepted_at
            ? new Date(job.accepted_at).toLocaleDateString('en-KE', { day: 'numeric', month: 'short', year: 'numeric' })
            : '—'}
        />
        {job.completion_duration && (
          <InfoItem icon="⏱" label="Duration" value={job.completion_duration} />
        )}
        {job.payment_status && (
          <InfoItem icon="💳" label="Payment" value={job.payment_status} />
        )}
      </div>

      {/* ── Customer card ────────────────────────────────────────────────── */}
      {job.customer_name && (
        <div style={{
          background: 'var(--ink3)', border: '1px solid var(--border2)',
          borderRadius: '16px', padding: '16px 20px', marginBottom: '16px',
          display: 'flex', alignItems: 'center', gap: '14px',
        }}>
          <div style={{
            width: '44px', height: '44px', borderRadius: '50%', flexShrink: 0,
            background: '#FF9A3C', color: '#FFFFFF',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '15px', fontWeight: '700',
          }}>
            {job.customer_name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: '15px', fontWeight: '700', color: 'var(--white)', marginBottom: '2px' }}>
              {job.customer_name}
            </div>
            <div style={{ fontSize: '13px', color: 'var(--muted)' }}>Customer</div>
          </div>
        </div>
      )}

      {/* ── Job location (in_progress / completed) ───────────────────────── */}
      {['in_progress', 'completed'].includes(job.status) && (
        <div style={{
          background: 'var(--ink3)', border: '1px solid var(--border2)',
          borderRadius: '16px', padding: '16px 20px', marginBottom: '16px',
        }}>
          <div style={{ fontSize: '14px', fontWeight: '700', color: 'var(--white)', marginBottom: '12px' }}>
            Job Location
          </div>
          <div style={{
            height: '76px', borderRadius: '10px', marginBottom: '12px',
            background: 'linear-gradient(135deg, #EFF6FF 0%, #DBEAFE 100%)',
            border: '1px solid #BFDBFE',
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '4px',
          }}>
            <span style={{ fontSize: '20px' }}>📍</span>
            <span style={{ fontSize: '13px', fontWeight: '600', color: '#1D4ED8' }}>{job.location}</span>
          </div>
          {job.latitude && job.longitude && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
              <div style={{ background: 'var(--ink)', borderRadius: '8px', padding: '8px 12px' }}>
                <div style={{ fontSize: '10px', color: 'var(--muted)', fontFamily: 'DM Mono', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: '3px' }}>Latitude</div>
                <div style={{ fontSize: '13px', fontWeight: '600', color: 'var(--white)', fontFamily: 'DM Mono' }}>{Number(job.latitude).toFixed(5)}</div>
              </div>
              <div style={{ background: 'var(--ink)', borderRadius: '8px', padding: '8px 12px' }}>
                <div style={{ fontSize: '10px', color: 'var(--muted)', fontFamily: 'DM Mono', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: '3px' }}>Longitude</div>
                <div style={{ fontSize: '13px', fontWeight: '600', color: 'var(--white)', fontFamily: 'DM Mono' }}>{Number(job.longitude).toFixed(5)}</div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Description ─────────────────────────────────────────────────── */}
      {job.description && (
        <div style={{
          background: 'var(--ink3)', border: '1px solid var(--border2)',
          borderRadius: '16px', padding: '16px 20px', marginBottom: '16px',
        }}>
          <div style={{ fontSize: '11px', color: 'var(--muted)', letterSpacing: '1px', textTransform: 'uppercase', fontFamily: 'DM Mono', marginBottom: '8px' }}>
            📝 Customer Note
          </div>
          <p style={{ fontSize: '14px', color: 'var(--white)', lineHeight: '1.6', margin: 0, fontStyle: 'italic' }}>
            "{job.description}"
          </p>
        </div>
      )}

      {/* ── Action buttons ───────────────────────────────────────────────── */}
      {job.status === 'assigned' && (
        <motion.button
          whileHover={{ translateY: -1 }} whileTap={{ scale: 0.97 }}
          disabled={startMutation.isPending}
          onClick={() => startMutation.mutate()}
          style={{
            width: '100%', padding: '14px', borderRadius: '12px', border: 'none',
            background: '#FF9A3C', color: '#FFFFFF',
            fontSize: '15px', fontWeight: '700', fontFamily: 'Cabinet Grotesk',
            cursor: startMutation.isPending ? 'not-allowed' : 'pointer',
            opacity: startMutation.isPending ? 0.6 : 1,
          }}
        >
          {startMutation.isPending ? 'Starting…' : '▶ Start Job'}
        </motion.button>
      )}

      {job.status === 'in_progress' && (
        <motion.button
          whileHover={{ translateY: -1 }} whileTap={{ scale: 0.97 }}
          disabled={completeMutation.isPending}
          onClick={() => completeMutation.mutate()}
          style={{
            width: '100%', padding: '14px', borderRadius: '12px', border: 'none',
            background: '#22C55E', color: '#FFFFFF',
            fontSize: '15px', fontWeight: '700', fontFamily: 'Cabinet Grotesk',
            cursor: completeMutation.isPending ? 'not-allowed' : 'pointer',
            opacity: completeMutation.isPending ? 0.6 : 1,
          }}
        >
          {completeMutation.isPending ? 'Completing…' : '✓ Mark as Complete'}
        </motion.button>
      )}

      {job.status === 'completed' && (
        <div style={{
          padding: '16px 20px', borderRadius: '14px',
          background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.25)',
          display: 'flex', alignItems: 'center', gap: '12px',
        }}>
          <span style={{ fontSize: '22px' }}>🎉</span>
          <div>
            <div style={{ fontSize: '14px', fontWeight: '700', color: '#22C55E', marginBottom: '2px' }}>Job Completed</div>
            <div style={{ fontSize: '12px', color: 'var(--muted)' }}>
              {job.completion_duration ? `Duration: ${job.completion_duration}` : 'Marked as complete'}
            </div>
          </div>
        </div>
      )}

      {job.status === 'cancelled' && (
        <div style={{
          padding: '16px 20px', borderRadius: '14px',
          background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)',
          display: 'flex', alignItems: 'center', gap: '12px',
        }}>
          <span style={{ fontSize: '22px' }}>❌</span>
          <div style={{ fontSize: '14px', color: 'var(--red)', fontWeight: '600' }}>
            This booking was cancelled
          </div>
        </div>
      )}
    </div>
  )
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function InfoItem({ icon, label, value, highlight }) {
  return (
    <div>
      <div style={{ fontSize: '11px', color: 'var(--muted)', letterSpacing: '1px', textTransform: 'uppercase', fontFamily: 'DM Mono', marginBottom: '5px' }}>
        {icon} {label}
      </div>
      <div style={{ fontSize: '14px', fontWeight: '600', color: highlight ? '#FF9A3C' : 'var(--white)', lineHeight: '1.4' }}>
        {value}
      </div>
    </div>
  )
}

function PlaceholderEmpty() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--muted)' }}>
      <div style={{ fontSize: '48px', marginBottom: '12px' }}>🔧</div>
      <div style={{ fontSize: '15px' }}>Select a job to view details</div>
    </div>
  )
}

function EmptyLeft({ tab }) {
  const msgs = {
    All:       { icon: '📋', title: 'No jobs yet',       sub: 'Accepted jobs will appear here.' },
    Active:    { icon: '🔧', title: 'No active jobs',    sub: 'Jobs you accept will appear here.' },
    Completed: { icon: '✅', title: 'No completed jobs', sub: 'Finished jobs will show here after you mark them complete.' },
    Cancelled: { icon: '❌', title: 'No cancelled jobs', sub: 'Cancelled bookings will appear here.' },
  }
  const m = msgs[tab] ?? msgs.All
  return (
    <div style={{ textAlign: 'center', padding: '48px 16px' }}>
      <div style={{ fontSize: '40px', marginBottom: '12px' }}>{m.icon}</div>
      <div style={{ fontSize: '15px', fontWeight: '700', color: 'var(--white)', marginBottom: '6px' }}>{m.title}</div>
      <div style={{ fontSize: '13px', color: 'var(--muted)', lineHeight: '1.6' }}>{m.sub}</div>
    </div>
  )
}

function SkeletonRow() {
  return (
    <div style={{
      background: 'var(--ink3)', border: '1px solid var(--border2)',
      borderRadius: '14px', padding: '14px', display: 'flex', gap: '12px',
    }}>
      <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'var(--ink)', flexShrink: 0 }} />
      <div style={{ flex: 1 }}>
        <div style={{ height: '13px', width: '45%', borderRadius: '5px', background: 'var(--ink)', marginBottom: '8px' }} />
        <div style={{ height: '11px', width: '70%', borderRadius: '4px', background: 'var(--ink)' }} />
      </div>
    </div>
  )
}

function DetailSkeleton() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {[80, 120, 100, 80].map((h, i) => (
        <div key={i} style={{ height: `${h}px`, background: 'var(--ink3)', border: '1px solid var(--border2)', borderRadius: '16px' }} />
      ))}
    </div>
  )
}

function PaymentPill({ status }) {
  const cfg = {
    Successful: { color: '#16A34A', bg: 'rgba(22,163,74,0.1)',   border: 'rgba(22,163,74,0.3)',   label: '✓ Paid'       },
    Processing: { color: '#2563EB', bg: 'rgba(37,99,235,0.1)',   border: 'rgba(37,99,235,0.3)',   label: '⏳ Processing' },
    Pending:    { color: '#CA8A04', bg: 'rgba(234,179,8,0.1)',   border: 'rgba(234,179,8,0.3)',   label: '⚠ Unpaid'     },
    Failed:     { color: '#DC2626', bg: 'rgba(239,68,68,0.1)',   border: 'rgba(239,68,68,0.3)',   label: '✕ Pay Failed' },
    Cancelled:  { color: '#64748B', bg: 'rgba(100,116,139,0.1)', border: 'rgba(100,116,139,0.3)', label: 'Cancelled'    },
  }
  const c = cfg[status] ?? cfg.Pending
  return (
    <span style={{
      fontSize: '11px', fontWeight: '700', padding: '2px 9px', borderRadius: '10px',
      background: c.bg, border: `1px solid ${c.border}`, color: c.color, whiteSpace: 'nowrap',
    }}>
      {c.label}
    </span>
  )
}
