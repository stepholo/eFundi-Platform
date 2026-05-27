import { useState } from 'react'
import { motion } from 'framer-motion'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { authApi } from '../../api/auth'
import useAuthStore from '../../store/authStore'

const baseInput = {
  width: '100%', borderRadius: '12px', padding: '13px 16px',
  fontSize: '16px', outline: 'none', fontFamily: 'Cabinet Grotesk',
  background: 'var(--ink3)', border: '1px solid var(--border2)',
  color: 'var(--white)', boxSizing: 'border-box',
}
const baseInputDisabled = {
  ...baseInput,
  background: 'var(--ink)', color: 'var(--muted)', cursor: 'not-allowed',
}
const focusOn  = (e) => (e.target.style.borderColor = 'var(--volt)')
const focusOff = (e) => (e.target.style.borderColor = 'var(--border2)')

function Field({ label, sub, children }) {
  return (
    <div style={{ marginBottom: '20px' }}>
      <label style={{ display: 'block', fontSize: '14px', color: 'var(--muted)', marginBottom: '6px', letterSpacing: '0.4px' }}>
        {label}
        {sub && <span style={{ marginLeft: '6px', fontSize: '12px', color: 'var(--muted2)' }}>{sub}</span>}
      </label>
      {children}
    </div>
  )
}

function SectionCard({ children, delay = 0 }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.4 }}
      style={{
        background: 'var(--ink3)', border: '1px solid var(--border2)',
        borderRadius: '20px', padding: '28px', marginBottom: '20px',
      }}
    >
      {children}
    </motion.div>
  )
}

function SectionTitle({ children }) {
  return (
    <div style={{
      fontSize: '13px', fontWeight: '600', color: 'var(--muted)', textTransform: 'uppercase',
      letterSpacing: '1.2px', fontFamily: 'DM Mono', marginBottom: '20px',
    }}>
      {children}
    </div>
  )
}

export default function SettingsPage() {
  const { user, setUser } = useAuthStore()

  const [profileForm, setProfileForm] = useState({
    first_name:   user?.first_name   || '',
    last_name:    user?.last_name    || '',
    email:        user?.email        || '',
    phone_number: user?.phone_number || '',
  })

  const [locForm, setLocForm]   = useState({
    default_location:  user?.default_location  || '',
    default_latitude:  user?.default_latitude  || '',
    default_longitude: user?.default_longitude || '',
  })
  const [locMsg, setLocMsg]     = useState(null)
  const [locLoading, setLocLoading] = useState(false)
  const [profileMsg, setProfileMsg]     = useState(null) // { type: 'success'|'error', text }

  const [pwForm, setPwForm] = useState({ password: '', password2: '' })
  const [pwMsg, setPwMsg]   = useState(null)

  const handleProfile = (e) => setProfileForm(f => ({ ...f, [e.target.name]: e.target.value }))
  const handlePw      = (e) => setPwForm(f => ({ ...f, [e.target.name]: e.target.value }))
  const handleLoc     = (e) => setLocForm(f => ({ ...f, [e.target.name]: e.target.value }))

  const detectLocation = () => {
    if (!navigator.geolocation) { setLocMsg({ type: 'error', text: 'Geolocation not supported.' }); return }
    setLocLoading(true)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocForm(f => ({
          ...f,
          default_latitude:  pos.coords.latitude.toString(),
          default_longitude: pos.coords.longitude.toString(),
        }))
        setLocLoading(false)
      },
      () => { setLocMsg({ type: 'error', text: 'Could not detect location.' }); setLocLoading(false) },
      { timeout: 8000 },
    )
  }

  const locationMutation = useMutation({
    mutationFn: (data) => authApi.updateUser(user.user_id, data),
    onSuccess: (res) => {
      setUser(res.data)
      setLocMsg({ type: 'success', text: 'Default location saved.' })
    },
    onError: () => setLocMsg({ type: 'error', text: 'Failed to save location.' }),
  })

  const submitLocation = (e) => {
    e.preventDefault()
    setLocMsg(null)
    locationMutation.mutate(locForm)
  }

  const profileMutation = useMutation({
    mutationFn: (data) => authApi.updateUser(user.user_id, data),
    onSuccess: (res) => {
      setUser(res.data)
      setProfileMsg({ type: 'success', text: 'Profile updated successfully.' })
    },
    onError: (err) => {
      const d = err.response?.data
      if (!d) { setProfileMsg({ type: 'error', text: 'Update failed. Please try again.' }); return }
      if (typeof d === 'string') { setProfileMsg({ type: 'error', text: d }); return }
      const lines = Object.entries(d).map(([field, msgs]) => {
        const label = field.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
        return `${label}: ${Array.isArray(msgs) ? msgs[0] : msgs}`
      })
      setProfileMsg({ type: 'error', text: lines.join('\n') })
    },
  })

  const pwMutation = useMutation({
    mutationFn: (data) => authApi.updateUser(user.user_id, data),
    onSuccess: () => {
      setPwForm({ password: '', password2: '' })
      setPwMsg({ type: 'success', text: 'Password changed successfully.' })
    },
    onError: (err) => {
      const d = err.response?.data
      if (!d) { setPwMsg({ type: 'error', text: 'Password change failed.' }); return }
      if (typeof d === 'string') { setPwMsg({ type: 'error', text: d }); return }
      const msgs = Object.values(d).flat()
      setPwMsg({ type: 'error', text: msgs[0] || 'Validation failed.' })
    },
  })

  const submitProfile = (e) => {
    e.preventDefault()
    setProfileMsg(null)
    profileMutation.mutate(profileForm)
  }

  const submitPassword = (e) => {
    e.preventDefault()
    setPwMsg(null)
    if (pwForm.password !== pwForm.password2) {
      setPwMsg({ type: 'error', text: 'Passwords do not match.' })
      return
    }
    if (pwForm.password.length < 8) {
      setPwMsg({ type: 'error', text: 'Password must be at least 8 characters.' })
      return
    }
    pwMutation.mutate({ password: pwForm.password, password2: pwForm.password2 })
  }

  const initials = user
    ? `${user.first_name?.[0] ?? ''}${user.last_name?.[0] ?? ''}`.toUpperCase() || '?'
    : '?'

  return (
    <div>
      {/* Topbar */}
      <div style={{
        height: '60px', background: 'var(--ink2)', borderBottom: '1px solid var(--border2)',
        display: 'flex', alignItems: 'center', padding: '0 32px',
        position: 'sticky', top: 0, zIndex: 100,
      }}>
        <span style={{ fontFamily: 'Clash Display', fontSize: '17px', fontWeight: '600', color: 'var(--white)' }}>
          Account Settings
        </span>
      </div>

      <div style={{ padding: '32px 32px 60px', maxWidth: '640px', margin: '0 auto' }}>

        {/* Avatar section */}
        <SectionCard delay={0}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
            <div style={{
              width: '64px', height: '64px', borderRadius: '18px',
              background: 'var(--volt)', color: 'var(--ink)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '22px', fontWeight: '700', flexShrink: 0,
            }}>
              {initials}
            </div>
            <div>
              <div style={{ fontFamily: 'Clash Display', fontSize: '18px', fontWeight: '700', color: 'var(--white)', marginBottom: '4px' }}>
                {user?.first_name} {user?.last_name}
              </div>
              <div style={{ fontSize: '15px', color: 'var(--muted)', marginBottom: '4px' }}>
                @{user?.username}
              </div>
              <span style={{
                display: 'inline-block', padding: '2px 10px', borderRadius: '20px',
                background: '#FFF7ED', border: '1px solid #FED7AA',
                fontSize: '13px', fontWeight: '600', color: 'var(--volt)', fontFamily: 'DM Mono',
              }}>
                {user?.role}
              </span>
            </div>
          </div>
        </SectionCard>

        {/* Profile form */}
        <SectionCard delay={0.08}>
          <SectionTitle>Personal Information</SectionTitle>

          {profileMsg && (
            <motion.div
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              style={{
                marginBottom: '20px', padding: '12px 16px', borderRadius: '10px',
                background: profileMsg.type === 'success' ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)',
                border: `1px solid ${profileMsg.type === 'success' ? 'rgba(34,197,94,0.3)' : 'rgba(239,68,68,0.3)'}`,
                color: profileMsg.type === 'success' ? '#22C55E' : 'var(--red)',
                fontSize: '15px', whiteSpace: 'pre-line', lineHeight: '1.6',
              }}
            >
              {profileMsg.text}
            </motion.div>
          )}

          <form onSubmit={submitProfile}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '20px' }}>
              <Field label="First Name">
                <input
                  name="first_name" value={profileForm.first_name} onChange={handleProfile}
                  required style={baseInput} onFocus={focusOn} onBlur={focusOff}
                />
              </Field>
              <Field label="Last Name">
                <input
                  name="last_name" value={profileForm.last_name} onChange={handleProfile}
                  required style={baseInput} onFocus={focusOn} onBlur={focusOff}
                />
              </Field>
            </div>

            <Field label="Email Address">
              <input
                name="email" type="email" value={profileForm.email} onChange={handleProfile}
                required style={baseInput} onFocus={focusOn} onBlur={focusOff}
              />
            </Field>

            <Field label="Phone Number">
              <input
                name="phone_number" type="tel" value={profileForm.phone_number} onChange={handleProfile}
                required style={baseInput} onFocus={focusOn} onBlur={focusOff}
              />
            </Field>

            <Field label="Username" sub="(cannot be changed)">
              <input value={user?.username || ''} disabled style={baseInputDisabled} />
            </Field>

            <motion.button
              type="submit"
              disabled={profileMutation.isPending}
              whileHover={{ translateY: -1 }}
              whileTap={{ scale: 0.98 }}
              style={{
                padding: '13px 28px', borderRadius: '10px', border: 'none',
                background: 'var(--volt)', color: 'var(--ink)', fontSize: '16px',
                fontWeight: '700', fontFamily: 'Cabinet Grotesk',
                cursor: profileMutation.isPending ? 'not-allowed' : 'pointer',
                opacity: profileMutation.isPending ? 0.6 : 1,
              }}
            >
              {profileMutation.isPending ? 'Saving…' : 'Save Changes'}
            </motion.button>
          </form>
        </SectionCard>

        {/* Password change */}
        <SectionCard delay={0.14}>
          <SectionTitle>Change Password</SectionTitle>

          {pwMsg && (
            <motion.div
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              style={{
                marginBottom: '20px', padding: '12px 16px', borderRadius: '10px',
                background: pwMsg.type === 'success' ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)',
                border: `1px solid ${pwMsg.type === 'success' ? 'rgba(34,197,94,0.3)' : 'rgba(239,68,68,0.3)'}`,
                color: pwMsg.type === 'success' ? '#22C55E' : 'var(--red)',
                fontSize: '15px',
              }}
            >
              {pwMsg.text}
            </motion.div>
          )}

          <form onSubmit={submitPassword}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '24px' }}>
              <Field label="New Password">
                <input
                  name="password" type="password" value={pwForm.password} onChange={handlePw}
                  placeholder="••••••••" required style={baseInput}
                  onFocus={focusOn} onBlur={focusOff}
                />
              </Field>
              <Field label="Confirm Password">
                <input
                  name="password2" type="password" value={pwForm.password2} onChange={handlePw}
                  placeholder="••••••••" required style={baseInput}
                  onFocus={focusOn} onBlur={focusOff}
                />
              </Field>
            </div>

            <motion.button
              type="submit"
              disabled={pwMutation.isPending}
              whileHover={{ translateY: -1 }}
              whileTap={{ scale: 0.98 }}
              style={{
                padding: '13px 28px', borderRadius: '10px',
                background: 'var(--ink)', color: 'var(--white)',
                border: '1px solid var(--border2)',
                fontSize: '16px', fontWeight: '700', fontFamily: 'Cabinet Grotesk',
                cursor: pwMutation.isPending ? 'not-allowed' : 'pointer',
                opacity: pwMutation.isPending ? 0.6 : 1,
              }}
            >
              {pwMutation.isPending ? 'Changing…' : 'Change Password'}
            </motion.button>
          </form>
        </SectionCard>

        {/* Default location */}
        <SectionCard delay={0.18}>
          <SectionTitle>Default Location</SectionTitle>
          <p style={{ fontSize: '15px', color: 'var(--muted)', marginBottom: '20px', lineHeight: '1.5' }}>
            Pre-fill your address and coordinates when creating a booking.
          </p>

          {locMsg && (
            <motion.div
              initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }}
              style={{
                marginBottom: '20px', padding: '12px 16px', borderRadius: '10px',
                background: locMsg.type === 'success' ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)',
                border: `1px solid ${locMsg.type === 'success' ? 'rgba(34,197,94,0.3)' : 'rgba(239,68,68,0.3)'}`,
                color: locMsg.type === 'success' ? '#22C55E' : 'var(--red)',
                fontSize: '15px',
              }}
            >
              {locMsg.text}
            </motion.div>
          )}

          <form onSubmit={submitLocation}>
            <Field label="Address">
              <input
                name="default_location" value={locForm.default_location} onChange={handleLoc}
                placeholder="e.g. Westlands, Nairobi — Flat 4B"
                style={baseInput} onFocus={focusOn} onBlur={focusOff}
              />
            </Field>

            <Field label="GPS Coordinates" sub="(optional)">
              <div style={{ display: 'flex', gap: '10px', marginBottom: '8px' }}>
                <input
                  name="default_latitude" value={locForm.default_latitude} onChange={handleLoc}
                  placeholder="Latitude e.g. -1.2921"
                  style={{ ...baseInput, flex: 1 }} onFocus={focusOn} onBlur={focusOff}
                />
                <input
                  name="default_longitude" value={locForm.default_longitude} onChange={handleLoc}
                  placeholder="Longitude e.g. 36.8219"
                  style={{ ...baseInput, flex: 1 }} onFocus={focusOn} onBlur={focusOff}
                />
              </div>
              <button
                type="button" onClick={detectLocation} disabled={locLoading}
                style={{
                  background: 'none', border: '1px solid var(--border2)', borderRadius: '6px',
                  color: 'var(--volt)', fontSize: '14px', fontWeight: '600', cursor: 'pointer',
                  padding: '4px 12px', fontFamily: 'Cabinet Grotesk',
                  opacity: locLoading ? 0.6 : 1,
                }}
              >
                {locLoading ? 'Detecting…' : '📍 Detect my location'}
              </button>
            </Field>

            <motion.button
              type="submit" disabled={locationMutation.isPending}
              whileHover={{ translateY: -1 }} whileTap={{ scale: 0.98 }}
              style={{
                padding: '13px 28px', borderRadius: '10px', border: 'none',
                background: 'var(--volt)', color: 'var(--ink)', fontSize: '16px',
                fontWeight: '700', fontFamily: 'Cabinet Grotesk',
                cursor: locationMutation.isPending ? 'not-allowed' : 'pointer',
                opacity: locationMutation.isPending ? 0.6 : 1,
              }}
            >
              {locationMutation.isPending ? 'Saving…' : 'Save Location'}
            </motion.button>
          </form>
        </SectionCard>

        {/* Account info (read-only) */}
        <SectionCard delay={0.2}>
          <SectionTitle>Account Info</SectionTitle>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <InfoRow label="Account ID" value={user?.user_id?.slice(-12) || '—'} mono />
            <InfoRow label="Role" value={user?.role || '—'} />
          </div>
        </SectionCard>

      </div>
    </div>
  )
}

function InfoRow({ label, value, mono }) {
  return (
    <div>
      <div style={{ fontSize: '12px', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '1px', fontFamily: 'DM Mono', marginBottom: '6px' }}>
        {label}
      </div>
      <div style={{ fontSize: '15px', fontWeight: '600', color: 'var(--white)', fontFamily: mono ? 'DM Mono' : 'Cabinet Grotesk' }}>
        {value}
      </div>
    </div>
  )
}
