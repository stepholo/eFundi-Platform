import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useMutation } from '@tanstack/react-query'
import { authApi, decodeToken } from '../../api/auth'
import useAuthStore from '../../store/authStore'

const ROLES = [
  { value: 'Customer',   label: 'Customer',   icon: '🏠', desc: 'Book home services',  accent: '#E8501A' },
  { value: 'Technician', label: 'Technician', icon: '🔧', desc: 'Accept jobs & earn',  accent: '#1B2D5E' },
]

const SPECS = ['Electrical', 'Plumbing', 'Carpentry', 'Cleaning', 'Other']

export default function RegisterPage() {
  const navigate   = useNavigate()
  const [params]   = useSearchParams()
  const setAuth    = useAuthStore((s) => s.setAuth)

  const [role, setRole] = useState(params.get('role') === 'Technician' ? 'Technician' : 'Customer')
  const [form, setForm] = useState({
    first_name: '', last_name: '', email: '', phone_number: '',
    username: '', password: '', password2: '',
    years_of_experience: '',
  })
  const [selectedSpecs, setSelectedSpecs] = useState([])
  const [error, setError] = useState('')

  const accent = role === 'Technician' ? '#1B2D5E' : '#E8501A'

  const inputStyle = {
    width: '100%', padding: '11px 14px', borderRadius: '8px',
    border: '1px solid #E2E8F0', background: '#FFFFFF',
    fontSize: '16px', color: '#0F172A', outline: 'none',
    fontFamily: 'Cabinet Grotesk', transition: 'border-color 0.15s',
    boxSizing: 'border-box',
  }
  const focusOn  = (e) => (e.target.style.borderColor = accent)
  const focusOff = (e) => (e.target.style.borderColor = '#E2E8F0')

  const toggleSpec = (spec) => {
    setSelectedSpecs(prev =>
      prev.includes(spec) ? prev.filter(s => s !== spec) : [...prev, spec]
    )
  }

  const mutation = useMutation({
    mutationFn: (data) => authApi.register(data),
    onSuccess: async () => {
      const login = await authApi.login({ username: form.username, password: form.password })
      const { access, refresh } = login.data
      const payload = decodeToken(access)
      let user = { role }
      if (payload?.user_id) {
        try { user = (await authApi.getUser(payload.user_id)).data } catch { /* minimal */ }
      }
      setAuth(user, access, refresh)
      navigate(role === 'Technician' ? '/technician/dashboard' : '/customer/dashboard')
    },
    onError: (err) => {
      const d = err.response?.data
      if (!d) { setError('Registration failed. Please try again.'); return }
      if (typeof d === 'string') { setError(d); return }
      const lines = Object.entries(d).map(([field, msgs]) => {
        const label = field.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
        return `${label}: ${Array.isArray(msgs) ? msgs[0] : msgs}`
      })
      setError(lines.join('\n'))
    },
  })

  const handle = (e) => setForm({ ...form, [e.target.name]: e.target.value })
  const submit = (e) => {
    e.preventDefault()
    setError('')
    if (form.password !== form.password2) { setError('Passwords do not match.'); return }
    if (role === 'Technician' && selectedSpecs.length === 0) {
      setError('Please select at least one specialization.')
      return
    }
    const payload = { ...form, role }
    if (role === 'Technician') {
      payload.specialization = selectedSpecs.join(', ')
    } else {
      delete payload.years_of_experience
    }
    mutation.mutate(payload)
  }

  const Label = ({ children }) => (
    <label style={{ display: 'block', fontSize: '15px', fontWeight: '500', color: '#374151', marginBottom: '6px' }}>
      {children}
    </label>
  )

  return (
    <div style={{
      minHeight: '100vh', background: '#F1F5F9',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '48px 20px',
    }}>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
        style={{ width: '100%', maxWidth: '480px' }}
      >
        <div style={{
          background: '#FFFFFF', borderRadius: '16px',
          border: '1px solid #E2E8F0',
          boxShadow: '0 4px 24px rgba(0,0,0,0.06)',
          padding: '40px 36px',
        }}>
          {/* Logo */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '28px' }}>
            <img src="/efundi_icon.svg" width="40" height="40" alt="eFundi" style={{ borderRadius: '8px' }} />
            <span style={{ fontFamily: 'Clash Display', fontSize: '22px', fontWeight: '700', color: '#1B2D5E' }}>
              <span style={{ color: '#E8501A' }}>e</span>Fundi
            </span>
          </div>

          <h1 style={{ fontFamily: 'Clash Display', fontSize: '24px', fontWeight: '700', color: '#0F172A', marginBottom: '6px' }}>
            Create account
          </h1>
          <p style={{ fontSize: '16px', color: '#64748B', marginBottom: '24px' }}>
            Choose your role to get started
          </p>

          {/* Role selector */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '24px' }}>
            {ROLES.map((r) => (
              <motion.button
                key={r.value} type="button" whileTap={{ scale: 0.98 }}
                onClick={() => { setRole(r.value); setSelectedSpecs([]) }}
                style={{
                  padding: '16px 14px', textAlign: 'left', borderRadius: '10px',
                  border: `2px solid ${role === r.value ? r.accent : '#E2E8F0'}`,
                  background: role === r.value ? `${r.accent}08` : '#FFFFFF',
                  cursor: 'pointer', transition: 'all 0.2s',
                }}
              >
                <div style={{ fontSize: '22px', marginBottom: '8px' }}>{r.icon}</div>
                <div style={{ fontSize: '16px', fontWeight: '700', marginBottom: '2px', color: role === r.value ? r.accent : '#0F172A' }}>
                  {r.label}
                </div>
                <div style={{ fontSize: '14px', color: '#64748B' }}>{r.desc}</div>
              </motion.button>
            ))}
          </div>

          {/* Error */}
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
              style={{
                marginBottom: '20px', padding: '12px 14px', borderRadius: '8px',
                background: '#FEF2F2', border: '1px solid #FECACA',
                color: '#DC2626', fontSize: '15px', whiteSpace: 'pre-line', lineHeight: '1.7',
              }}
            >
              {error}
            </motion.div>
          )}

          <form onSubmit={submit}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
              {[['first_name', 'First Name', 'Jane'], ['last_name', 'Last Name', 'Wanjiku']].map(([name, label, ph]) => (
                <div key={name}>
                  <Label>{label}</Label>
                  <input name={name} value={form[name]} onChange={handle}
                    placeholder={ph} required style={inputStyle} onFocus={focusOn} onBlur={focusOff} />
                </div>
              ))}
            </div>

            <div style={{ marginBottom: '16px' }}>
              <Label>Email</Label>
              <input name="email" type="email" value={form.email} onChange={handle}
                placeholder="jane@email.com" required style={inputStyle} onFocus={focusOn} onBlur={focusOff} />
            </div>

            <div style={{ marginBottom: '16px' }}>
              <Label>Phone Number</Label>
              <input name="phone_number" type="tel" value={form.phone_number} onChange={handle}
                placeholder="0712345678" required style={inputStyle} onFocus={focusOn} onBlur={focusOff} />
            </div>

            <div style={{ marginBottom: '16px' }}>
              <Label>Username</Label>
              <input name="username" value={form.username} onChange={handle}
                placeholder="jane_wanjiku" required style={inputStyle} onFocus={focusOn} onBlur={focusOff} />
            </div>

            {/* Technician-only fields */}
            <AnimatePresence>
              {role === 'Technician' && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }} style={{ overflow: 'hidden' }}
                >
                  {/* Specialization chip picker */}
                  <div style={{ marginBottom: '16px' }}>
                    <Label>Specialization</Label>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '8px' }}>
                      {SPECS.map(spec => {
                        const selected = selectedSpecs.includes(spec)
                        return (
                          <button
                            key={spec} type="button"
                            onClick={() => toggleSpec(spec)}
                            style={{
                              padding: '7px 14px', borderRadius: '20px', border: 'none',
                              fontSize: '14px', fontWeight: selected ? '700' : '500',
                              fontFamily: 'Cabinet Grotesk', cursor: 'pointer',
                              background: selected ? accent : '#F1F5F9',
                              color: selected ? '#FFFFFF' : '#374151',
                              transition: 'all 0.15s',
                            }}
                          >
                            {spec}
                          </button>
                        )
                      })}
                    </div>
                    <p style={{ fontSize: '13px', color: '#94A3B8', margin: 0 }}>
                      Select all that apply. If your skills don't match the above, select <strong>Other</strong>.
                    </p>
                  </div>

                  <div style={{ marginBottom: '16px' }}>
                    <Label>Years of Experience</Label>
                    <input name="years_of_experience" type="number" min="0" value={form.years_of_experience}
                      onChange={handle} placeholder="3" style={inputStyle} onFocus={focusOn} onBlur={focusOff} />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '20px' }}>
              {[['password', 'Password'], ['password2', 'Confirm Password']].map(([name, label]) => (
                <div key={name}>
                  <Label>{label}</Label>
                  <input name={name} type="password" value={form[name]} onChange={handle}
                    placeholder="••••••••" required style={inputStyle} onFocus={focusOn} onBlur={focusOff} />
                </div>
              ))}
            </div>

            <motion.button
              type="submit" disabled={mutation.isPending}
              whileHover={{ translateY: -1 }} whileTap={{ scale: 0.98 }}
              style={{
                width: '100%', padding: '12px', borderRadius: '8px', border: 'none',
                background: accent, color: '#FFFFFF', fontSize: '17px', fontWeight: '600',
                fontFamily: 'Cabinet Grotesk', cursor: mutation.isPending ? 'not-allowed' : 'pointer',
                opacity: mutation.isPending ? 0.7 : 1, transition: 'background 0.3s, opacity 0.15s',
              }}
            >
              {mutation.isPending ? 'Creating account…' : 'Create Account'}
            </motion.button>
          </form>

          <p style={{ fontSize: '15px', textAlign: 'center', color: '#64748B', marginTop: '20px' }}>
            Already have an account?{' '}
            <Link to="/login" style={{ color: accent, fontWeight: '600', textDecoration: 'none' }}>
              Sign in →
            </Link>
          </p>
        </div>
      </motion.div>
    </div>
  )
}
