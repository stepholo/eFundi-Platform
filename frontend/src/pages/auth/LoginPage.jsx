import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useMutation } from '@tanstack/react-query'
import { authApi, decodeToken } from '../../api/auth'
import useAuthStore from '../../store/authStore'

const ROLE_REDIRECT = {
  Customer:      '/customer/dashboard',
  Technician:    '/technician/dashboard',
  Admin:         '/admin/dashboard',
  'Super Admin': '/admin/dashboard',
}

export default function LoginPage() {
  const navigate = useNavigate()
  const setAuth  = useAuthStore((s) => s.setAuth)
  const [form, setForm] = useState({ username: '', password: '' })
  const [error, setError] = useState('')
  const [showPw, setShowPw] = useState(false)

  const mutation = useMutation({
    mutationFn: authApi.login,
    onSuccess: async ({ data }) => {
      const payload = decodeToken(data.access)
      let user = { role: data.role }
      if (payload?.user_id) {
        try { user = (await authApi.getUser(payload.user_id)).data } catch { /* use minimal */ }
      }
      setAuth(user, data.access, data.refresh)
      navigate(ROLE_REDIRECT[data.role] || '/customer/dashboard')
    },
    onError: () => setError('Invalid username or password. Please try again.'),
  })

  const handle = (e) => setForm({ ...form, [e.target.name]: e.target.value })
  const submit = (e) => { e.preventDefault(); setError(''); mutation.mutate(form) }

  const inputStyle = {
    width: '100%', padding: '11px 14px', borderRadius: '8px',
    border: '1px solid #E2E8F0', background: '#FFFFFF',
    fontSize: '16px', color: '#0F172A', outline: 'none',
    fontFamily: 'Cabinet Grotesk', transition: 'border-color 0.15s',
  }

  return (
    <div style={{
      minHeight: '100vh', background: '#F1F5F9',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '40px 20px',
    }}>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
        style={{ width: '100%', maxWidth: '400px' }}
      >
        {/* Card */}
        <div style={{
          background: '#FFFFFF', borderRadius: '16px',
          border: '1px solid #E2E8F0',
          boxShadow: '0 4px 24px rgba(0,0,0,0.06)',
          padding: '40px 36px',
        }}>
          {/* Logo */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '32px' }}>
            <img src="/efundi_icon.svg" width="40" height="40" alt="eFundi" style={{ borderRadius: '8px' }} />
            <span style={{ fontFamily: 'Clash Display', fontSize: '22px', fontWeight: '700', color: '#1B2D5E' }}>
              <span style={{ color: '#E8501A' }}>e</span>Fundi
            </span>
          </div>

          <h1 style={{ fontFamily: 'Clash Display', fontSize: '24px', fontWeight: '700', color: '#0F172A', marginBottom: '6px' }}>
            Welcome back
          </h1>
          <p style={{ fontSize: '16px', color: '#64748B', marginBottom: '28px' }}>
            Sign in to your account
          </p>

          {/* Error */}
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              style={{
                marginBottom: '20px', padding: '12px 14px', borderRadius: '8px',
                background: '#FEF2F2', border: '1px solid #FECACA',
                color: '#DC2626', fontSize: '15px',
              }}
            >
              {error}
            </motion.div>
          )}

          <form onSubmit={submit}>
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '15px', fontWeight: '500', color: '#374151', marginBottom: '6px' }}>
                Username or Email Address
              </label>
              <input
                name="username" value={form.username} onChange={handle}
                placeholder="username or your@email.com" required style={inputStyle}
                onFocus={e => (e.target.style.borderColor = '#E8501A')}
                onBlur={e => (e.target.style.borderColor = '#E2E8F0')}
              />
            </div>

            <div style={{ marginBottom: '8px' }}>
              <label style={{ display: 'block', fontSize: '15px', fontWeight: '500', color: '#374151', marginBottom: '6px' }}>
                Password
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  name="password" type={showPw ? 'text' : 'password'} value={form.password} onChange={handle}
                  placeholder="••••••••" required
                  style={{ ...inputStyle, paddingRight: '44px' }}
                  onFocus={e => (e.target.style.borderColor = '#E8501A')}
                  onBlur={e => (e.target.style.borderColor = '#E2E8F0')}
                />
                <button
                  type="button"
                  onClick={() => setShowPw(v => !v)}
                  style={{
                    position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)',
                    background: 'none', border: 'none', cursor: 'pointer',
                    color: '#94A3B8', fontSize: '18px', padding: '2px', lineHeight: 1,
                  }}
                  aria-label={showPw ? 'Hide password' : 'Show password'}
                >
                  {showPw ? '🙈' : '👁️'}
                </button>
              </div>
            </div>

            <div style={{ textAlign: 'right', marginBottom: '24px' }}>
              <span style={{ fontSize: '15px', color: '#E8501A', cursor: 'pointer', fontWeight: '500' }}>
                Forgot password?
              </span>
            </div>

            <motion.button
              type="submit"
              disabled={mutation.isPending}
              whileHover={{ translateY: -1 }}
              whileTap={{ scale: 0.98 }}
              style={{
                width: '100%', padding: '12px', borderRadius: '8px', border: 'none',
                background: '#E8501A', color: '#FFFFFF', fontSize: '17px', fontWeight: '600',
                fontFamily: 'Cabinet Grotesk', cursor: mutation.isPending ? 'not-allowed' : 'pointer',
                opacity: mutation.isPending ? 0.7 : 1, transition: 'opacity 0.15s',
              }}
            >
              {mutation.isPending ? 'Signing in…' : 'Sign in'}
            </motion.button>
          </form>

          <div style={{
            display: 'flex', alignItems: 'center', gap: '10px',
            margin: '24px 0', fontSize: '14px', color: '#94A3B8',
          }}>
            <span style={{ flex: 1, height: '1px', background: '#E2E8F0' }} />
            or
            <span style={{ flex: 1, height: '1px', background: '#E2E8F0' }} />
          </div>

          <p style={{ fontSize: '15px', textAlign: 'center', color: '#64748B' }}>
            Don't have an account?{' '}
            <Link to="/register" style={{ color: '#E8501A', fontWeight: '600', textDecoration: 'none' }}>
              Create one →
            </Link>
          </p>
        </div>
      </motion.div>
    </div>
  )
}
