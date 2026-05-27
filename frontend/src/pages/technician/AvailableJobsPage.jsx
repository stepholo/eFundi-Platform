import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import { bookingsApi } from '../../api/bookings'

// ── Helpers ───────────────────────────────────────────────────────────────────

const CAT_ICONS = { Electrical: '⚡', Plumbing: '🚿', Carpentry: '🪚', Cleaning: '🧹', Other: '🔧' }
const catIcon = c => CAT_ICONS[c] ?? '🔧'

function fmtDate(raw) {
  const d = new Date(raw)
  return `${d.toLocaleDateString('en-KE', { weekday: 'short', day: 'numeric', month: 'short' })} · ${d.toLocaleTimeString('en-KE', { hour: '2-digit', minute: '2-digit' })}`
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function AvailableJobsPage() {
  const qc = useQueryClient()
  const [selectedId, setSelectedId] = useState(null)

  const { data: bookings = [], isLoading } = useQuery({
    queryKey: ['tech-bookings'],
    queryFn:  () => bookingsApi.list().then(r => r.data),
    refetchInterval: 15_000,
  })

  const available = bookings.filter(b => b.status === 'broadcasted')
  const selected  = available.find(b => b.booking_id === selectedId) ?? available[0] ?? null

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>

      {/* ── Topbar ──────────────────────────────────────────────────────────── */}
      <div style={{
        height: '60px', flexShrink: 0,
        background: 'var(--ink2)', borderBottom: '1px solid var(--border2)',
        display: 'flex', alignItems: 'center', padding: '0 24px', gap: '12px',
        zIndex: 10,
      }}>
        <span style={{ fontFamily: 'Clash Display', fontSize: '17px', fontWeight: '600', color: 'var(--white)' }}>
          Job Requests
        </span>
        {available.length > 0 && (
          <span style={{
            padding: '3px 10px', borderRadius: '20px', fontSize: '12px', fontWeight: '700',
            background: '#FF9A3C', color: '#fff', fontFamily: 'DM Mono',
          }}>
            {available.length} new
          </span>
        )}
      </div>

      {/* ── Two-column body ──────────────────────────────────────────────────── */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>

        {/* Left — compact list */}
        <div style={{
          width: '42%', flexShrink: 0, overflowY: 'auto',
          borderRight: '1px solid var(--border2)',
          background: 'var(--ink2)',
        }}>
          {isLoading ? (
            [0,1,2,3].map(i => <CompactSkeleton key={i} />)
          ) : available.length === 0 ? (
            <div style={{ padding: '60px 20px', textAlign: 'center' }}>
              <div style={{ fontSize: '40px', marginBottom: '12px' }}>📢</div>
              <div style={{ fontSize: '14px', fontWeight: '600', color: 'var(--white)', marginBottom: '6px' }}>No job requests</div>
              <div style={{ fontSize: '12px', color: 'var(--muted)', lineHeight: '1.6' }}>
                Make sure you are online. New requests appear automatically.
              </div>
            </div>
          ) : available.map((job, i) => {
            const isSel = selected?.booking_id === job.booking_id
            return (
              <div
                key={job.booking_id}
                onClick={() => setSelectedId(job.booking_id)}
                style={{
                  padding: '14px 16px', cursor: 'pointer',
                  borderBottom: '1px solid var(--border2)',
                  borderLeft: `3px solid ${isSel ? '#FF9A3C' : 'transparent'}`,
                  background: isSel ? 'rgba(255,154,60,0.07)' : 'transparent',
                  transition: 'all 0.15s',
                }}
                onMouseEnter={e => { if (!isSel) e.currentTarget.style.background = 'rgba(255,255,255,0.03)' }}
                onMouseLeave={e => { if (!isSel) e.currentTarget.style.background = 'transparent' }}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                  <div style={{
                    width: '38px', height: '38px', borderRadius: '10px', flexShrink: 0,
                    background: 'rgba(255,107,26,0.1)', border: '1px solid rgba(255,107,26,0.2)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '17px',
                  }}>
                    {catIcon(job.service_category)}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                      <span style={{ fontSize: '13px', fontWeight: '700', color: 'var(--white)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {job.service_category}
                      </span>
                      <span style={{
                        fontSize: '10px', fontWeight: '700', padding: '2px 6px', borderRadius: '20px', flexShrink: 0, marginLeft: '6px',
                        background: 'rgba(255,107,26,0.12)', color: '#FF9A3C', fontFamily: 'DM Mono',
                      }}>NEW</span>
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginBottom: '2px' }}>
                      📍 {job.location}
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--muted)', fontFamily: 'DM Mono' }}>
                      🗓 {fmtDate(job.scheduled_time)}
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        {/* Right — detail */}
        <div style={{ flex: 1, overflowY: 'auto', background: 'var(--ink)' }}>
          <AnimatePresence mode="wait">
            {selected ? (
              <motion.div
                key={selected.booking_id}
                initial={{ opacity: 0, x: 24 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -16 }}
                transition={{ duration: 0.22, ease: 'easeOut' }}
                style={{ height: '100%' }}
              >
                <JobDetailPanel
                  job={selected}
                  qc={qc}
                  onActioned={() => setSelectedId(null)}
                />
              </motion.div>
            ) : !isLoading && (
              <motion.div
                key="empty-right"
                initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '8px', color: 'var(--muted)' }}
              >
                <div style={{ fontSize: '36px' }}>📋</div>
                <div style={{ fontSize: '14px' }}>Select a job request to view details</div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

      </div>
    </div>
  )
}

// ── JobDetailPanel ────────────────────────────────────────────────────────────

function JobDetailPanel({ job, qc, onActioned }) {
  const [amount,   setAmount]   = useState('')
  const [amtError, setAmtError] = useState('')

  const acceptMutation = useMutation({
    mutationFn: () => bookingsApi.accept(job.booking_id, amount),
    onSuccess: () => { qc.invalidateQueries(['tech-bookings']); onActioned() },
    onError: (err) => {
      const d = err.response?.data
      setAmtError(d?.detail || d?.amount?.[0] || 'Accept failed. Try again.')
    },
  })

  const declineMutation = useMutation({
    mutationFn: () => bookingsApi.decline(job.booking_id),
    onSuccess:  () => { qc.invalidateQueries(['tech-bookings']); onActioned() },
  })

  const handleAccept = () => {
    setAmtError('')
    const val = parseFloat(amount)
    if (!amount || isNaN(val) || val <= 0) { setAmtError('Enter a valid amount in KES.'); return }
    acceptMutation.mutate()
  }

  const scheduled = new Date(job.scheduled_time)

  return (
    <div style={{ padding: '32px 28px 48px' }}>

      {/* ── Job header ──────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '18px', marginBottom: '28px' }}>
        <div style={{
          width: '62px', height: '62px', borderRadius: '16px', flexShrink: 0,
          background: 'rgba(255,107,26,0.12)', border: '1px solid rgba(255,107,26,0.25)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '28px',
        }}>
          {catIcon(job.service_category)}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
            <h2 style={{ fontFamily: 'Clash Display', fontSize: '22px', fontWeight: '700', color: 'var(--white)', margin: 0 }}>
              {job.service_category}
            </h2>
            <span style={{
              padding: '3px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: '700',
              background: 'rgba(255,107,26,0.12)', border: '1px solid rgba(255,107,26,0.25)',
              color: '#FF9A3C', fontFamily: 'DM Mono',
            }}>NEW REQUEST</span>
          </div>
          {job.customer_name && (
            <div style={{ fontSize: '13px', color: 'var(--muted)' }}>
              👤 Requested by <strong style={{ color: 'var(--white)' }}>{job.customer_name}</strong>
            </div>
          )}
        </div>
      </div>

      {/* ── Info tiles ──────────────────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '24px' }}>
        <InfoTile icon="📍" label="Location"   value={job.location} />
        <InfoTile
          icon="🗓" label="Scheduled"
          value={scheduled.toLocaleDateString('en-KE', { weekday: 'short', day: 'numeric', month: 'long' })}
          sub={scheduled.toLocaleTimeString('en-KE', { hour: '2-digit', minute: '2-digit' })}
        />
      </div>

      {/* ── Description ─────────────────────────────────────────────────── */}
      {job.description && (
        <div style={{
          padding: '16px', borderRadius: '14px', marginBottom: '24px',
          background: 'var(--ink3)', border: '1px solid var(--border2)',
        }}>
          <div style={{ fontSize: '11px', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '1px', fontFamily: 'DM Mono', marginBottom: '8px' }}>
            Customer note
          </div>
          <p style={{ fontSize: '14px', color: 'var(--white)', lineHeight: '1.6', margin: 0 }}>
            "{job.description}"
          </p>
        </div>
      )}

      {/* ── Quote + actions ──────────────────────────────────────────────── */}
      <div style={{
        padding: '20px', borderRadius: '16px',
        background: 'var(--ink3)', border: '1px solid rgba(255,107,26,0.2)',
      }}>
        <div style={{ fontSize: '13px', fontWeight: '600', color: 'var(--white)', marginBottom: '4px' }}>
          Set your quote
        </div>
        <div style={{ fontSize: '12px', color: 'var(--muted)', marginBottom: '14px' }}>
          Enter the amount you charge for this job. The customer will be notified.
        </div>

        {amtError && (
          <div style={{ fontSize: '13px', color: 'var(--red)', marginBottom: '10px', padding: '8px 12px', borderRadius: '8px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}>
            {amtError}
          </div>
        )}

        <div style={{ position: 'relative', marginBottom: '14px' }}>
          <span style={{
            position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)',
            fontSize: '14px', fontWeight: '700', color: 'var(--muted)', fontFamily: 'DM Mono',
          }}>KES</span>
          <input
            type="number"
            min="1"
            value={amount}
            onChange={e => setAmount(e.target.value)}
            placeholder="e.g. 2,500"
            style={{
              width: '100%', borderRadius: '12px', padding: '13px 16px 13px 56px',
              fontSize: '18px', fontWeight: '700', outline: 'none',
              background: 'var(--ink)', border: '1px solid var(--border2)',
              color: 'var(--white)', boxSizing: 'border-box', fontFamily: 'Clash Display',
            }}
            onFocus={e => (e.target.style.borderColor = '#FF9A3C')}
            onBlur={e => (e.target.style.borderColor = 'var(--border2)')}
          />
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <motion.button
            whileHover={{ translateY: -1 }} whileTap={{ scale: 0.97 }}
            disabled={acceptMutation.isPending || declineMutation.isPending}
            onClick={handleAccept}
            style={{
              flex: 2, padding: '13px', borderRadius: '12px', border: 'none',
              background: '#FF9A3C', color: '#fff',
              fontSize: '15px', fontWeight: '700', fontFamily: 'Cabinet Grotesk',
              cursor: acceptMutation.isPending ? 'not-allowed' : 'pointer',
              opacity: acceptMutation.isPending ? 0.6 : 1,
            }}
          >
            {acceptMutation.isPending ? 'Accepting…' : '✓ Accept Job'}
          </motion.button>
          <motion.button
            whileHover={{ translateY: -1 }} whileTap={{ scale: 0.97 }}
            disabled={acceptMutation.isPending || declineMutation.isPending}
            onClick={() => declineMutation.mutate()}
            style={{
              flex: 1, padding: '13px', borderRadius: '12px',
              border: '1px solid rgba(239,68,68,0.3)', background: 'rgba(239,68,68,0.06)',
              color: 'var(--red)', fontSize: '15px', fontWeight: '700',
              fontFamily: 'Cabinet Grotesk',
              cursor: declineMutation.isPending ? 'not-allowed' : 'pointer',
              opacity: declineMutation.isPending ? 0.6 : 1,
            }}
          >
            {declineMutation.isPending ? '…' : '✕ Decline'}
          </motion.button>
        </div>
      </div>

    </div>
  )
}

// ── Shared sub-components ─────────────────────────────────────────────────────

function InfoTile({ icon, label, value, sub }) {
  return (
    <div style={{
      padding: '14px', borderRadius: '12px',
      background: 'var(--ink3)', border: '1px solid var(--border2)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '5px', marginBottom: '6px' }}>
        <span style={{ fontSize: '13px' }}>{icon}</span>
        <span style={{ fontSize: '10px', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '1px', fontFamily: 'DM Mono' }}>{label}</span>
      </div>
      <div style={{ fontSize: '13px', fontWeight: '600', color: 'var(--white)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {value}
      </div>
      {sub && (
        <div style={{ fontSize: '12px', color: 'var(--muted)', marginTop: '2px', fontFamily: 'DM Mono' }}>{sub}</div>
      )}
    </div>
  )
}

function CompactSkeleton() {
  return (
    <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border2)', display: 'flex', gap: '10px' }}>
      <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: 'var(--ink)', flexShrink: 0 }} />
      <div style={{ flex: 1 }}>
        <div style={{ height: '12px', width: '50%', background: 'var(--ink)', borderRadius: '4px', marginBottom: '7px' }} />
        <div style={{ height: '10px', width: '70%', background: 'var(--ink)', borderRadius: '4px' }} />
      </div>
    </div>
  )
}
