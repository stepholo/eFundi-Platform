import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useMutation } from '@tanstack/react-query'
import { bookingsApi } from '../../api/bookings'

const CATEGORIES = [
  { value: 'Electrical', icon: '⚡', desc: 'Wiring, sockets, fridge, lighting' },
  { value: 'Plumbing',   icon: '🚿', desc: 'Pipes, drains, taps, water heaters' },
  { value: 'Carpentry',  icon: '🪚', desc: 'Doors, furniture, cabinets, roofing' },
  { value: 'Cleaning',   icon: '🧹', desc: 'Deep clean, move-in/out, upholstery' },
  { value: 'Other',      icon: '🔧', desc: 'Any other home service' },
]

const baseInput = {
  width: '100%', borderRadius: '8px', padding: '10px 13px',
  fontSize: '14px', outline: 'none',
  background: '#FFFFFF', border: '1px solid #E2E8F0',
  color: '#0F172A', boxSizing: 'border-box', transition: 'border-color 0.15s',
}

const focusOn  = (e) => (e.target.style.borderColor = '#E8501A')
const focusOff = (e) => (e.target.style.borderColor = '#E2E8F0')

export default function BookingPage() {
  const navigate = useNavigate()
  const [params] = useSearchParams()

  const [category, setCategory] = useState(params.get('category') || '')
  const [form, setForm] = useState({
    location: '', latitude: '', longitude: '', scheduled_time: '', description: '',
  })
  const [locLoading, setLocLoading] = useState(false)
  const [error, setError]           = useState('')
  const [success, setSuccess]       = useState(false)

  useEffect(() => {
    const cat = params.get('category')
    if (cat && CATEGORIES.some(c => c.value === cat)) setCategory(cat)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const mutation = useMutation({
    mutationFn: (data) => bookingsApi.create(data),
    onSuccess: (res) => {
      setSuccess(true)
      setTimeout(() => navigate(`/customer/bookings`), 1200)
    },
    onError: (err) => {
      const d = err.response?.data
      if (!d) { setError('Booking failed. Please try again.'); return }
      if (typeof d === 'string') { setError(d); return }
      const lines = Object.entries(d).map(([field, msgs]) => {
        const label = field.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
        return `${label}: ${Array.isArray(msgs) ? msgs[0] : msgs}`
      })
      setError(lines.join('\n'))
    },
  })

  const handle = (e) => setForm(f => ({ ...f, [e.target.name]: e.target.value }))

  const detectLocation = () => {
    if (!navigator.geolocation) { setError('Geolocation not supported.'); return }
    setLocLoading(true)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setForm(f => ({ ...f, latitude: pos.coords.latitude.toString(), longitude: pos.coords.longitude.toString() }))
        setLocLoading(false)
      },
      () => { setError('Could not detect location. Enter coordinates manually.'); setLocLoading(false) },
      { timeout: 8000 },
    )
  }

  const submit = (e) => {
    e.preventDefault()
    setError('')
    if (!category)           { setError('Please select a service category first.'); return }
    if (!form.location)      { setError('Location is required.'); return }
    if (!form.scheduled_time) { setError('Please choose a scheduled time.'); return }
    mutation.mutate({
      service_category: category,
      location:         form.location,
      latitude:         form.latitude    || undefined,
      longitude:        form.longitude   || undefined,
      scheduled_time:   form.scheduled_time,
      description:      form.description || undefined,
    })
  }

  const minDateTime = new Date(Date.now() + 30 * 60 * 1000).toISOString().slice(0, 16)
  const selectedCat = CATEGORIES.find(c => c.value === category)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>

      {/* Topbar */}
      <div style={{
        height: '60px', background: 'var(--ink2)', borderBottom: '1px solid var(--border2)',
        display: 'flex', alignItems: 'center', padding: '0 28px', gap: '16px',
        flexShrink: 0, position: 'sticky', top: 0, zIndex: 100,
      }}>
        <button
          onClick={() => navigate('/customer/dashboard')}
          style={{ background: 'none', border: 'none', color: 'var(--muted)', fontSize: '20px', cursor: 'pointer', padding: '4px' }}
        >
          ←
        </button>
        <span style={{ fontFamily: 'Clash Display', fontSize: '17px', fontWeight: '600', color: 'var(--white)' }}>
          Book a Service
        </span>
      </div>

      {/* Two-column body */}
      <div style={{ display: 'flex', flex: 1, minHeight: 0 }}>

        {/* ── Left: service category picker ─────────────────────────── */}
        <div style={{
          width: '42%', flexShrink: 0,
          borderRight: '1px solid var(--border2)',
          overflowY: 'auto', padding: '24px 20px',
          background: 'var(--ink)',
        }}>
          <div style={{ marginBottom: '20px' }}>
            <div style={{ fontFamily: 'Clash Display', fontSize: '18px', fontWeight: '700', color: 'var(--white)', marginBottom: '4px' }}>
              What do you need?
            </div>
            <div style={{ fontSize: '13px', color: 'var(--muted)', lineHeight: '1.5' }}>
              Choose the service that best matches your issue.
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {CATEGORIES.map((cat) => {
              const isSelected = category === cat.value
              return (
                <motion.div
                  key={cat.value}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => { setCategory(cat.value); setError('') }}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '14px',
                    padding: '16px 16px', borderRadius: '14px', cursor: 'pointer',
                    border: `1.5px solid ${isSelected ? 'var(--volt)' : 'var(--border2)'}`,
                    background: isSelected ? 'rgba(232,80,26,0.07)' : 'var(--ink3)',
                    transition: 'all 0.15s',
                  }}
                  onMouseEnter={e => { if (!isSelected) e.currentTarget.style.background = '#F8FAFC' }}
                  onMouseLeave={e => { if (!isSelected) e.currentTarget.style.background = 'var(--ink3)' }}
                >
                  <div style={{
                    width: '44px', height: '44px', borderRadius: '12px', flexShrink: 0,
                    background: isSelected ? 'rgba(232,80,26,0.12)' : 'var(--ink)',
                    border: `1px solid ${isSelected ? 'rgba(232,80,26,0.3)' : 'var(--border2)'}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '22px',
                  }}>
                    {cat.icon}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '15px', fontWeight: '700', color: isSelected ? 'var(--volt)' : 'var(--white)', marginBottom: '2px' }}>
                      {cat.value}
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {cat.desc}
                    </div>
                  </div>
                  {isSelected && (
                    <div style={{ width: '20px', height: '20px', borderRadius: '50%', background: 'var(--volt)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <span style={{ color: '#FFFFFF', fontSize: '11px', fontWeight: '700' }}>✓</span>
                    </div>
                  )}
                </motion.div>
              )
            })}
          </div>
        </div>

        {/* ── Right: booking form ───────────────────────────────────── */}
        <div style={{ flex: 1, overflowY: 'auto', background: 'var(--ink)', padding: '24px 28px 60px' }}>
          <AnimatePresence mode="wait">
            {!category ? (
              <motion.div
                key="placeholder"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--muted)' }}
              >
                <div style={{ fontSize: '52px', marginBottom: '14px' }}>🔧</div>
                <div style={{ fontSize: '15px', fontWeight: '600', color: 'var(--white)', marginBottom: '6px' }}>Pick a service first</div>
                <div style={{ fontSize: '13px', color: 'var(--muted)' }}>Select a category on the left to continue</div>
              </motion.div>
            ) : success ? (
              <motion.div
                key="success"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%' }}
              >
                <div style={{ fontSize: '56px', marginBottom: '16px' }}>🎉</div>
                <div style={{ fontFamily: 'Clash Display', fontSize: '22px', fontWeight: '700', color: 'var(--white)', marginBottom: '8px' }}>
                  Booking submitted!
                </div>
                <div style={{ fontSize: '14px', color: 'var(--muted)' }}>Redirecting to your bookings…</div>
              </motion.div>
            ) : (
              <motion.div
                key={category}
                initial={{ opacity: 0, x: 16 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -16 }}
                transition={{ duration: 0.2 }}
              >
                {/* Selected category pill */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '5px 14px', borderRadius: '20px', background: '#FFF7ED', border: '1px solid #FED7AA' }}>
                    <span style={{ fontSize: '16px' }}>{selectedCat?.icon}</span>
                    <span style={{ fontSize: '14px', fontWeight: '600', color: '#E8501A' }}>{selectedCat?.value}</span>
                  </div>
                </div>

                <div style={{ fontFamily: 'Clash Display', fontSize: '18px', fontWeight: '700', color: 'var(--white)', marginBottom: '4px' }}>
                  Job details
                </div>
                <div style={{ fontSize: '13px', color: 'var(--muted)', marginBottom: '24px', lineHeight: '1.5' }}>
                  Tell us where and when — a nearby technician will be notified.
                </div>

                {/* Error */}
                <AnimatePresence>
                  {error && (
                    <motion.div
                      initial={{ opacity: 0, y: -8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      style={{
                        marginBottom: '20px', padding: '12px 14px', borderRadius: '10px',
                        background: 'rgba(255,59,59,0.1)', border: '1px solid rgba(255,59,59,0.3)',
                        color: 'var(--red)', fontSize: '13px', whiteSpace: 'pre-line', lineHeight: '1.7',
                      }}
                    >
                      {error}
                    </motion.div>
                  )}
                </AnimatePresence>

                <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>

                  {/* Location */}
                  <div>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', color: 'var(--muted)', marginBottom: '7px' }}>
                      Location / Address *
                    </label>
                    <input
                      name="location" value={form.location} onChange={handle}
                      placeholder="e.g. Westlands, Nairobi — flat 4B"
                      required style={baseInput} onFocus={focusOn} onBlur={focusOff}
                    />
                  </div>

                  {/* GPS coordinates */}
                  <div>
                    <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '13px', fontWeight: '500', color: 'var(--muted)', marginBottom: '7px' }}>
                      <span>GPS Coordinates <span style={{ fontWeight: '400', fontSize: '12px' }}>(optional — helps find nearest tech)</span></span>
                      <button
                        type="button"
                        onClick={detectLocation}
                        disabled={locLoading}
                        style={{
                          background: 'none', border: '1px solid var(--border2)', borderRadius: '6px',
                          color: 'var(--volt)', fontSize: '12px', fontWeight: '600', cursor: 'pointer',
                          padding: '3px 10px', opacity: locLoading ? 0.6 : 1,
                        }}
                      >
                        {locLoading ? 'Detecting…' : '📍 Detect'}
                      </button>
                    </label>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                      <input
                        name="latitude" value={form.latitude} onChange={handle}
                        placeholder="Latitude e.g. -1.2921"
                        style={baseInput} onFocus={focusOn} onBlur={focusOff}
                      />
                      <input
                        name="longitude" value={form.longitude} onChange={handle}
                        placeholder="Longitude e.g. 36.8219"
                        style={baseInput} onFocus={focusOn} onBlur={focusOff}
                      />
                    </div>
                  </div>

                  {/* Description */}
                  <div>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', color: 'var(--muted)', marginBottom: '7px' }}>
                      Describe the work <span style={{ fontWeight: '400', fontSize: '12px' }}>(optional but helps the technician)</span>
                    </label>
                    <textarea
                      name="description" value={form.description} onChange={handle}
                      placeholder="e.g. The kitchen socket stopped working after a power surge. There are 3 sockets on the same wall."
                      rows={3}
                      style={{ ...baseInput, resize: 'vertical', lineHeight: '1.6' }}
                      onFocus={focusOn} onBlur={focusOff}
                    />
                  </div>

                  {/* Scheduled time */}
                  <div>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', color: 'var(--muted)', marginBottom: '7px' }}>
                      When do you need this? *
                    </label>
                    <input
                      type="datetime-local" name="scheduled_time" value={form.scheduled_time} onChange={handle}
                      min={minDateTime} required
                      style={{ ...baseInput, colorScheme: 'light' }}
                      onFocus={focusOn} onBlur={focusOff}
                    />
                  </div>

                  {/* Summary card */}
                  {(form.location || form.scheduled_time) && (
                    <motion.div
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      style={{
                        background: 'var(--ink3)', border: '1px solid var(--border2)',
                        borderRadius: '12px', padding: '16px',
                        display: 'flex', flexDirection: 'column', gap: '10px',
                      }}
                    >
                      <div style={{ fontSize: '12px', fontWeight: '700', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '1px' }}>
                        Booking Summary
                      </div>
                      <SummaryRow icon={selectedCat?.icon} label="Service" value={selectedCat?.value} />
                      {form.location && <SummaryRow icon="📍" label="Location" value={form.location} />}
                      {form.scheduled_time && (
                        <SummaryRow
                          icon="🗓"
                          label="Scheduled"
                          value={new Date(form.scheduled_time).toLocaleString('en-KE', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                        />
                      )}
                      {form.description && <SummaryRow icon="📝" label="Description" value={form.description.slice(0, 80) + (form.description.length > 80 ? '…' : '')} />}
                    </motion.div>
                  )}

                  <motion.button
                    type="submit"
                    disabled={mutation.isPending}
                    whileHover={{ translateY: -2 }}
                    whileTap={{ scale: 0.98 }}
                    style={{
                      width: '100%', padding: '14px', borderRadius: '10px', border: 'none',
                      background: 'var(--volt)', color: '#FFFFFF', fontSize: '15px', fontWeight: '700',
                      fontFamily: 'Cabinet Grotesk', cursor: mutation.isPending ? 'not-allowed' : 'pointer',
                      opacity: mutation.isPending ? 0.6 : 1,
                    }}
                  >
                    {mutation.isPending ? 'Submitting…' : 'Request Technician →'}
                  </motion.button>
                </form>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  )
}

function SummaryRow({ icon, label, value }) {
  return (
    <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
      <span style={{ fontSize: '14px', flexShrink: 0, marginTop: '1px' }}>{icon}</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <span style={{ fontSize: '11px', color: 'var(--muted)', fontFamily: 'DM Mono', textTransform: 'uppercase', letterSpacing: '0.8px' }}>
          {label}{' '}
        </span>
        <span style={{ fontSize: '13px', fontWeight: '600', color: 'var(--white)' }}>{value}</span>
      </div>
    </div>
  )
}
