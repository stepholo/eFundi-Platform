import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { bookingsApi } from '../../api/bookings'
import { paymentsApi } from '../../api/payments'
import useAuthStore from '../../store/authStore'
import StatusBadge from '../../components/ui/StatusBadge'

const STEPS       = ['requested', 'broadcasted', 'assigned', 'in_progress', 'completed']
const STEP_LABELS = ['Submitted', 'Finding Tech', 'Assigned', 'In Progress', 'Done']

export default function BookingDetailPage() {
  const { id }         = useParams()
  const navigate       = useNavigate()
  const { user }       = useAuthStore()
  const queryClient    = useQueryClient()

  const [phone, setPhone]   = useState(user?.phone_number || '')
  const [payError, setPayError] = useState('')
  const [paySuccess, setPaySuccess] = useState(false)
  const [cancelConfirm, setCancelConfirm] = useState(false)

  const { data: booking, isLoading, isError } = useQuery({
    queryKey: ['booking', id],
    queryFn: () => bookingsApi.get(id).then(r => r.data),
    refetchInterval: 20_000,
  })

  const trackingEnabled = booking && booking.status === 'in_progress' && booking.technician_id
  const { data: techLocation } = useQuery({
    queryKey: ['tech-location', booking?.technician_id],
    queryFn: () => bookingsApi.trackTechnician(booking.technician_id).then(r => r.data),
    enabled: !!trackingEnabled,
    refetchInterval: 10_000,
  })

  const payMutation = useMutation({
    mutationFn: (data) => paymentsApi.stkPush(data),
    onSuccess: () => {
      setPaySuccess(true)
      setPayError('')
      queryClient.invalidateQueries(['bookings'])
    },
    onError: (err) => {
      const d = err.response?.data
      if (!d) { setPayError('Payment failed. Please try again.'); return }
      if (typeof d === 'string') { setPayError(d); return }
      const msgs = Object.values(d).flat()
      setPayError(msgs[0] || 'Payment initiation failed.')
    },
  })

  const cancelMutation = useMutation({
    mutationFn: () => bookingsApi.cancel(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['bookings'])
      queryClient.invalidateQueries(['booking', id])
      setCancelConfirm(false)
    },
  })

  const handlePay = (e) => {
    e.preventDefault()
    setPayError('')
    if (!phone) { setPayError('Enter your M-Pesa phone number.'); return }
    payMutation.mutate({ booking_id: id, payer_phone_number: phone })
  }

  if (isLoading) return <LoadingState />
  if (isError || !booking) return <ErrorState onBack={() => navigate('/customer/bookings')} />

  const stepIdx     = STEPS.indexOf(booking.status)
  const isPaid      = booking.payment_status === 'Successful'
  const canPay      = ['assigned', 'completed'].includes(booking.status) && booking.amount && !isPaid
  const canCancel   = ['requested', 'broadcasted'].includes(booking.status)
  const scheduledAt = new Date(booking.scheduled_time)

  return (
    <div>
      {/* Topbar */}
      <div style={{
        height: '60px', background: 'var(--ink2)', borderBottom: '1px solid var(--border2)',
        display: 'flex', alignItems: 'center', padding: '0 32px', gap: '16px',
        position: 'sticky', top: 0, zIndex: 100,
      }}>
        <button
          onClick={() => navigate('/customer/bookings')}
          style={{ background: 'none', border: 'none', color: 'var(--muted)', fontSize: '20px', cursor: 'pointer', padding: '4px' }}
        >
          ←
        </button>
        <span style={{ fontFamily: 'Clash Display', fontSize: '17px', fontWeight: '600', color: 'var(--white)' }}>
          Booking Details
        </span>
        <div style={{ flex: 1 }} />
        <StatusBadge status={booking.status} />
      </div>

      <div style={{ padding: '32px 32px 60px', maxWidth: '700px', margin: '0 auto' }}>

        {/* Header card */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          style={{
            background: 'var(--ink3)', border: '1px solid var(--border2)',
            borderRadius: '22px', padding: '28px', marginBottom: '20px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px', marginBottom: '24px' }}>
            <div style={{
              width: '56px', height: '56px', borderRadius: '14px', flexShrink: 0,
              background: '#FFF7ED', border: '1px solid #FED7AA',
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '26px',
            }}>
              {categoryIcon(booking.service_category)}
            </div>
            <div>
              <div style={{ fontFamily: 'Clash Display', fontSize: '22px', fontWeight: '700', color: 'var(--white)', marginBottom: '4px' }}>
                {booking.service_category}
              </div>
              <div style={{ fontSize: '15px', color: 'var(--muted)' }}>
                Booking #{booking.booking_id?.slice(-8) || id}
              </div>
            </div>
          </div>

          {/* Progress bar */}
          <div style={{ marginBottom: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center' }}>
              {STEPS.map((s, i) => (
                <div key={s} style={{ display: 'flex', alignItems: 'center', flex: i < STEPS.length - 1 ? 1 : 'none' }}>
                  <motion.div
                    initial={{ scale: 0.8 }}
                    animate={{ scale: 1 }}
                    style={{
                      width: '26px', height: '26px', borderRadius: '50%', flexShrink: 0,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '13px', fontWeight: '700',
                      background: i <= stepIdx ? 'var(--volt)' : 'var(--ink)',
                      border: i <= stepIdx ? 'none' : '2px solid var(--border2)',
                      color: i <= stepIdx ? 'var(--ink)' : 'var(--muted)',
                    }}
                  >
                    {i < stepIdx ? '✓' : i + 1}
                  </motion.div>
                  {i < STEPS.length - 1 && (
                    <motion.div
                      initial={{ scaleX: 0 }}
                      animate={{ scaleX: 1 }}
                      style={{
                        flex: 1, height: '3px',
                        background: i < stepIdx ? 'var(--volt)' : 'var(--border2)',
                        transition: 'background 0.4s', transformOrigin: 'left',
                      }}
                    />
                  )}
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '8px' }}>
              {STEP_LABELS.map((l, i) => (
                <div key={l} style={{
                  fontSize: '11px', fontFamily: 'DM Mono', flex: 1, textAlign: 'center',
                  color: i <= stepIdx ? 'var(--volt)' : 'var(--muted)',
                  fontWeight: i === stepIdx ? '700' : '400',
                }}>
                  {l}
                </div>
              ))}
            </div>
          </div>
        </motion.div>

        {/* Info grid */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          style={{
            background: 'var(--ink3)', border: '1px solid var(--border2)',
            borderRadius: '20px', padding: '24px', marginBottom: '20px',
            display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px',
          }}
        >
          <InfoItem icon="📍" label="Location" value={booking.location} />
          <InfoItem icon="🗓" label="Scheduled" value={`${scheduledAt.toLocaleDateString('en-KE', { weekday: 'short', day: 'numeric', month: 'short' })} at ${scheduledAt.toLocaleTimeString('en-KE', { hour: '2-digit', minute: '2-digit' })}`} />
          <InfoItem icon="💳" label="Amount" value={booking.amount ? `KES ${Number(booking.amount).toLocaleString()}` : 'Pending quote'} highlight={!!booking.amount} />
          <InfoItem icon="📅" label="Booked On" value={new Date(booking.created_at).toLocaleDateString('en-KE', { day: 'numeric', month: 'short', year: 'numeric' })} />
        </motion.div>

        {/* Technician card */}
        {booking.technician_name && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            style={{
              background: 'var(--ink3)', border: '1px solid var(--border2)',
              borderRadius: '20px', padding: '20px 24px', marginBottom: '20px',
              display: 'flex', alignItems: 'center', gap: '16px',
            }}
          >
            <div style={{
              width: '52px', height: '52px', borderRadius: '50%', flexShrink: 0,
              background: 'var(--volt)', color: 'var(--ink)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '16px', fontWeight: '700',
            }}>
              {booking.technician_name.split(' ').map(n => n[0]).join('').slice(0, 2)}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '16px', fontWeight: '700', color: 'var(--white)', marginBottom: '3px' }}>
                {booking.technician_name}
              </div>
              <div style={{ fontSize: '14px', color: 'var(--muted)' }}>Assigned technician</div>
            </div>
            <div style={{ fontSize: '14px', color: 'var(--volt)', fontFamily: 'DM Mono' }}>Verified ✓</div>
          </motion.div>
        )}

        {/* Static job location — completed bookings */}
        {booking.status === 'completed' && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.18 }}
            style={{
              background: 'var(--ink3)', border: '1px solid var(--border2)',
              borderRadius: '20px', padding: '20px 24px', marginBottom: '20px',
            }}
          >
            <div style={{ fontFamily: 'Clash Display', fontSize: '16px', fontWeight: '700', color: 'var(--white)', marginBottom: '14px' }}>
              Job Location
            </div>
            <div style={{
              height: '100px', borderRadius: '12px', marginBottom: '14px',
              background: 'linear-gradient(135deg, #EFF6FF 0%, #DBEAFE 100%)',
              border: '1px solid #BFDBFE',
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '6px',
            }}>
              <div style={{ fontSize: '26px' }}>📍</div>
              <div style={{ fontSize: '14px', fontWeight: '600', color: '#1D4ED8' }}>{booking.location}</div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <div style={{ background: 'var(--ink)', borderRadius: '10px', padding: '10px 14px' }}>
                <div style={{ fontSize: '11px', color: 'var(--muted)', fontFamily: 'DM Mono', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.8px' }}>Latitude</div>
                <div style={{ fontSize: '14px', fontWeight: '700', color: 'var(--white)', fontFamily: 'DM Mono' }}>{Number(booking.latitude).toFixed(6)}</div>
              </div>
              <div style={{ background: 'var(--ink)', borderRadius: '10px', padding: '10px 14px' }}>
                <div style={{ fontSize: '11px', color: 'var(--muted)', fontFamily: 'DM Mono', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.8px' }}>Longitude</div>
                <div style={{ fontSize: '14px', fontWeight: '700', color: 'var(--white)', fontFamily: 'DM Mono' }}>{Number(booking.longitude).toFixed(6)}</div>
              </div>
            </div>
          </motion.div>
        )}

        {/* Technician live location tracking — in_progress only */}
        {trackingEnabled && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.18 }}
            style={{
              background: 'var(--ink3)', border: '1px solid var(--border2)',
              borderRadius: '20px', padding: '20px 24px', marginBottom: '20px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
              <div style={{ fontFamily: 'Clash Display', fontSize: '16px', fontWeight: '700', color: 'var(--white)' }}>
                Technician Location
              </div>
              {techLocation && (
                <span style={{
                  display: 'inline-flex', alignItems: 'center', gap: '5px',
                  padding: '3px 10px', borderRadius: '12px', fontSize: '12px', fontWeight: '700',
                  background: techLocation.is_online ? 'rgba(22,163,74,0.12)' : 'rgba(100,116,139,0.12)',
                  color: techLocation.is_online ? '#16A34A' : '#64748B',
                  border: `1px solid ${techLocation.is_online ? 'rgba(22,163,74,0.3)' : 'rgba(100,116,139,0.2)'}`,
                }}>
                  <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'currentColor', display: 'inline-block' }} />
                  {techLocation.is_online ? 'Online' : 'Last seen'}
                </span>
              )}
            </div>

            {techLocation ? (
              <>
                {/* Visual map placeholder with coordinates */}
                <div style={{
                  height: '120px', borderRadius: '12px', marginBottom: '14px',
                  background: 'linear-gradient(135deg, #EFF6FF 0%, #DBEAFE 100%)',
                  border: '1px solid #BFDBFE',
                  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                  position: 'relative', overflow: 'hidden',
                }}>
                  <div style={{ fontSize: '28px', marginBottom: '6px' }}>📍</div>
                  <div style={{ fontSize: '13px', fontWeight: '600', color: '#1D4ED8', fontFamily: 'DM Mono' }}>
                    {Number(techLocation.latitude).toFixed(5)}, {Number(techLocation.longitude).toFixed(5)}
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <div style={{ background: 'var(--ink)', borderRadius: '10px', padding: '10px 14px' }}>
                    <div style={{ fontSize: '11px', color: 'var(--muted)', fontFamily: 'DM Mono', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.8px' }}>Latitude</div>
                    <div style={{ fontSize: '15px', fontWeight: '700', color: 'var(--white)', fontFamily: 'DM Mono' }}>{Number(techLocation.latitude).toFixed(6)}</div>
                  </div>
                  <div style={{ background: 'var(--ink)', borderRadius: '10px', padding: '10px 14px' }}>
                    <div style={{ fontSize: '11px', color: 'var(--muted)', fontFamily: 'DM Mono', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.8px' }}>Longitude</div>
                    <div style={{ fontSize: '15px', fontWeight: '700', color: 'var(--white)', fontFamily: 'DM Mono' }}>{Number(techLocation.longitude).toFixed(6)}</div>
                  </div>
                </div>
                <div style={{ marginTop: '10px', fontSize: '12px', color: 'var(--muted)', fontFamily: 'DM Mono', textAlign: 'right' }}>
                  Updated {new Date(techLocation.updated_at).toLocaleTimeString('en-KE', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                  {' · '}refreshes every 10s
                </div>
              </>
            ) : (
              <div style={{ textAlign: 'center', padding: '20px 0', color: 'var(--muted)', fontSize: '15px' }}>
                Waiting for technician location…
              </div>
            )}
          </motion.div>
        )}

        {/* Payment status card — visible on completed bookings */}
        {booking.status === 'completed' && booking.amount && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            style={{
              background: 'var(--ink3)', border: `1px solid ${isPaid ? 'rgba(22,163,74,0.3)' : 'rgba(239,68,68,0.2)'}`,
              borderRadius: '20px', padding: '20px 24px', marginBottom: '20px',
              display: 'flex', alignItems: 'center', gap: '16px',
            }}
          >
            <div style={{
              width: '44px', height: '44px', borderRadius: '12px', flexShrink: 0,
              background: isPaid ? 'rgba(22,163,74,0.1)' : 'rgba(239,68,68,0.08)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px',
            }}>
              {isPaid ? '✅' : '💳'}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '15px', fontWeight: '700', color: 'var(--white)', marginBottom: '3px' }}>
                Payment {isPaid ? 'Received' : booking.payment_status === 'Processing' ? 'Processing' : 'Pending'}
              </div>
              <div style={{ fontSize: '13px', color: 'var(--muted)' }}>
                {isPaid
                  ? `KES ${Number(booking.amount).toLocaleString()} paid via M-Pesa`
                  : booking.payment_status === 'Processing'
                    ? 'Your M-Pesa payment is being confirmed…'
                    : `KES ${Number(booking.amount).toLocaleString()} — payment not yet received`}
              </div>
            </div>
            <PaymentStatusBadge status={booking.payment_status} />
          </motion.div>
        )}

        {/* M-Pesa payment section */}
        {canPay && !paySuccess && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            style={{
              background: '#FFF7ED', border: '1px solid #FED7AA',
              borderRadius: '20px', padding: '24px', marginBottom: '20px',
            }}
          >
            <div style={{ fontFamily: 'Clash Display', fontSize: '18px', fontWeight: '700', color: 'var(--volt)', marginBottom: '4px' }}>
              {booking.status === 'completed' ? 'Complete Your Payment' : 'Ready to Pay'}
            </div>
            <div style={{ fontSize: '15px', color: 'var(--muted)', marginBottom: '20px', lineHeight: '1.5' }}>
              {booking.payment_status === 'Failed'
                ? 'Your previous payment failed. Enter your Safaricom number to try again.'
                : `Enter your Safaricom number to receive an M-Pesa STK push for KES ${Number(booking.amount).toLocaleString()}.`}
            </div>

            {payError && (
              <div style={{
                marginBottom: '16px', padding: '12px 16px', borderRadius: '10px',
                background: 'rgba(255,59,59,0.1)', border: '1px solid rgba(255,59,59,0.3)',
                color: 'var(--red)', fontSize: '15px',
              }}>
                {payError}
              </div>
            )}

            <form onSubmit={handlePay}>
              <label style={{ display: 'block', fontSize: '14px', color: 'var(--muted)', marginBottom: '8px', letterSpacing: '0.4px' }}>
                M-Pesa Phone Number
              </label>
              <div style={{ display: 'flex', gap: '10px' }}>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="0712345678"
                  required
                  style={{
                    flex: 1, borderRadius: '12px', padding: '14px 16px',
                    fontSize: '16px', outline: 'none', fontFamily: 'Cabinet Grotesk',
                    background: 'var(--ink3)', border: '1px solid var(--border2)',
                    color: 'var(--white)',
                  }}
                  onFocus={(e) => (e.target.style.borderColor = 'var(--volt)')}
                  onBlur={(e) => (e.target.style.borderColor = 'var(--border2)')}
                />
                <motion.button
                  type="submit"
                  disabled={payMutation.isPending}
                  whileHover={{ translateY: -1 }}
                  whileTap={{ scale: 0.98 }}
                  style={{
                    padding: '14px 20px', borderRadius: '12px', border: 'none',
                    background: 'var(--volt)', color: 'var(--ink)', fontSize: '16px',
                    fontWeight: '700', fontFamily: 'Cabinet Grotesk',
                    cursor: payMutation.isPending ? 'not-allowed' : 'pointer',
                    opacity: payMutation.isPending ? 0.6 : 1, whiteSpace: 'nowrap',
                  }}
                >
                  {payMutation.isPending ? 'Sending…' : '📱 Pay Now'}
                </motion.button>
              </div>
            </form>
          </motion.div>
        )}

        {/* STK push sent confirmation */}
        {paySuccess && (
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            style={{
              background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.3)',
              borderRadius: '20px', padding: '28px', marginBottom: '20px', textAlign: 'center',
            }}
          >
            <div style={{ fontSize: '40px', marginBottom: '12px' }}>📲</div>
            <div style={{ fontSize: '16px', fontWeight: '700', color: '#22C55E', marginBottom: '8px' }}>M-Pesa prompt sent!</div>
            <div style={{ fontSize: '15px', color: 'var(--muted)', lineHeight: '1.6' }}>
              Check your phone for the Safaricom STK push and enter your PIN to complete payment.
            </div>
          </motion.div>
        )}

        {/* Cancel button */}
        {canCancel && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.25 }}>
            {!cancelConfirm ? (
              <button
                onClick={() => setCancelConfirm(true)}
                style={{
                  background: 'none', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '12px',
                  color: 'var(--red)', fontSize: '15px', fontWeight: '600', cursor: 'pointer',
                  padding: '12px 20px', width: '100%', fontFamily: 'Cabinet Grotesk', transition: 'border-color 0.2s',
                }}
                onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--red)')}
                onMouseLeave={e => (e.currentTarget.style.borderColor = 'rgba(239,68,68,0.3)')}
              >
                Cancel Booking
              </button>
            ) : (
              <div style={{
                background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.3)',
                borderRadius: '16px', padding: '20px', textAlign: 'center',
              }}>
                <div style={{ fontSize: '16px', fontWeight: '600', color: 'var(--white)', marginBottom: '6px' }}>
                  Cancel this booking?
                </div>
                <div style={{ fontSize: '14px', color: 'var(--muted)', marginBottom: '16px' }}>
                  This cannot be undone. A technician may already be on their way.
                </div>
                <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
                  <button
                    onClick={() => setCancelConfirm(false)}
                    style={{
                      padding: '10px 20px', borderRadius: '10px', border: '1px solid var(--border2)',
                      background: 'transparent', color: 'var(--muted)', fontSize: '15px', fontWeight: '600',
                      fontFamily: 'Cabinet Grotesk', cursor: 'pointer',
                    }}
                  >
                    Keep Booking
                  </button>
                  <button
                    onClick={() => cancelMutation.mutate()}
                    disabled={cancelMutation.isPending}
                    style={{
                      padding: '10px 20px', borderRadius: '10px', border: 'none',
                      background: '#EF4444', color: 'white', fontSize: '15px', fontWeight: '700',
                      fontFamily: 'Cabinet Grotesk', cursor: cancelMutation.isPending ? 'not-allowed' : 'pointer',
                      opacity: cancelMutation.isPending ? 0.7 : 1,
                    }}
                  >
                    {cancelMutation.isPending ? 'Cancelling…' : 'Yes, Cancel'}
                  </button>
                </div>
              </div>
            )}
          </motion.div>
        )}
      </div>
    </div>
  )
}

function InfoItem({ icon, label, value, highlight }) {
  return (
    <div>
      <div style={{ fontSize: '12px', color: 'var(--muted)', letterSpacing: '1px', textTransform: 'uppercase', fontFamily: 'DM Mono', marginBottom: '6px' }}>
        {icon} {label}
      </div>
      <div style={{ fontSize: '16px', fontWeight: '600', color: highlight ? 'var(--volt)' : 'var(--white)', lineHeight: '1.4' }}>
        {value}
      </div>
    </div>
  )
}

function PaymentStatusBadge({ status }) {
  if (!status) return null
  const cfg = {
    Successful:  { bg: 'rgba(22,163,74,0.1)',   border: 'rgba(22,163,74,0.3)',   color: '#16A34A', label: 'Paid' },
    Processing:  { bg: 'rgba(37,99,235,0.1)',   border: 'rgba(37,99,235,0.3)',   color: '#2563EB', label: 'Processing' },
    Pending:     { bg: 'rgba(234,179,8,0.1)',   border: 'rgba(234,179,8,0.3)',   color: '#CA8A04', label: 'Unpaid' },
    Failed:      { bg: 'rgba(239,68,68,0.1)',   border: 'rgba(239,68,68,0.3)',   color: '#DC2626', label: 'Failed' },
    Cancelled:   { bg: 'rgba(100,116,139,0.1)', border: 'rgba(100,116,139,0.3)', color: '#64748B', label: 'Cancelled' },
  }
  const c = cfg[status] || cfg.Pending
  return (
    <span style={{
      padding: '4px 12px', borderRadius: '12px', fontSize: '12px', fontWeight: '700',
      background: c.bg, border: `1px solid ${c.border}`, color: c.color,
      whiteSpace: 'nowrap',
    }}>
      {c.label}
    </span>
  )
}

function categoryIcon(cat) {
  const map = { Electrical: '⚡', Plumbing: '🚿', Carpentry: '🪚', Cleaning: '🧹', Other: '🔧' }
  return map[cat] ?? '🔧'
}

function LoadingState() {
  return (
    <div style={{ padding: '32px 32px', maxWidth: '700px' }}>
      <div style={{ height: '60px', background: 'var(--ink2)', marginBottom: '32px' }} />
      {[120, 80, 60].map((h, i) => (
        <div key={i} style={{ height: `${h}px`, background: 'var(--ink3)', border: '1px solid var(--border2)', borderRadius: '20px', marginBottom: '16px' }} />
      ))}
    </div>
  )
}

function ErrorState({ onBack }) {
  return (
    <div style={{ padding: '80px 32px', textAlign: 'center' }}>
      <div style={{ fontSize: '40px', marginBottom: '16px' }}>⚠️</div>
      <div style={{ fontSize: '16px', fontWeight: '700', color: 'var(--white)', marginBottom: '8px' }}>Booking not found</div>
      <div style={{ fontSize: '15px', color: 'var(--muted)', marginBottom: '24px' }}>This booking may have been removed or you don't have access.</div>
      <button
        onClick={onBack}
        style={{
          padding: '12px 24px', borderRadius: '10px', border: 'none',
          background: 'var(--volt)', color: 'var(--ink)', fontSize: '16px',
          fontWeight: '700', fontFamily: 'Cabinet Grotesk', cursor: 'pointer',
        }}
      >
        ← Back to Bookings
      </button>
    </div>
  )
}
