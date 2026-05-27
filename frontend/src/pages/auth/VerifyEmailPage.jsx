import { useEffect, useState } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { authApi } from '../../api/auth'

export default function VerifyEmailPage() {
  const [params] = useSearchParams()
  const [state, setState] = useState('loading') // 'loading' | 'success' | 'error'
  const [message, setMessage] = useState('')

  useEffect(() => {
    const uid   = params.get('uid')
    const token = params.get('token')
    if (!uid || !token) {
      setState('error')
      setMessage('Verification link is invalid or incomplete. Please use the link from your email.')
      return
    }
    authApi.verifyEmail(uid, token)
      .then(() => setState('success'))
      .catch((err) => {
        const msg = err.response?.data?.error || 'Verification failed. The link may have expired.'
        setMessage(msg)
        setState('error')
      })
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div style={{
      minHeight: '100vh', background: '#F7F8FC',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '40px 20px',
    }}>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        style={{ width: '100%', maxWidth: '440px' }}
      >
        <div style={{
          background: '#FFFFFF', borderRadius: '20px',
          border: '1px solid #E2E8F0',
          boxShadow: '0 4px 24px rgba(0,0,0,0.06)',
          padding: '48px 40px', textAlign: 'center',
        }}>
          {/* Logo */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', marginBottom: '32px' }}>
            <img src="/efundi_icon.svg" width="40" height="40" alt="eFundi" style={{ borderRadius: '8px' }} />
            <span style={{ fontFamily: 'Clash Display', fontSize: '22px', fontWeight: '700', color: '#1B2D5E' }}>
              <span style={{ color: '#E8501A' }}>e</span>Fundi
            </span>
          </div>

          {state === 'loading' && (
            <>
              <div style={{ fontSize: '40px', marginBottom: '20px' }}>⏳</div>
              <h2 style={{ fontFamily: 'Clash Display', fontSize: '22px', fontWeight: '700', color: '#0F172A', marginBottom: '10px' }}>
                Verifying your email…
              </h2>
              <p style={{ fontSize: '16px', color: '#64748B' }}>Just a moment.</p>
            </>
          )}

          {state === 'success' && (
            <>
              <motion.div
                initial={{ scale: 0 }} animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                style={{
                  width: '72px', height: '72px', borderRadius: '50%',
                  background: 'rgba(34,197,94,0.1)', border: '2px solid rgba(34,197,94,0.3)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '32px', margin: '0 auto 24px',
                }}
              >
                ✓
              </motion.div>
              <h2 style={{ fontFamily: 'Clash Display', fontSize: '24px', fontWeight: '700', color: '#0F172A', marginBottom: '10px' }}>
                Email Verified!
              </h2>
              <p style={{ fontSize: '16px', color: '#64748B', marginBottom: '32px', lineHeight: '1.6' }}>
                Your account is now active. You can log in and start booking services.
              </p>
              <Link to="/login" style={{ textDecoration: 'none' }}>
                <motion.button
                  whileHover={{ translateY: -1 }} whileTap={{ scale: 0.98 }}
                  style={{
                    width: '100%', padding: '13px', borderRadius: '10px', border: 'none',
                    background: '#E8501A', color: '#FFFFFF', fontSize: '17px',
                    fontWeight: '700', fontFamily: 'Cabinet Grotesk', cursor: 'pointer',
                  }}
                >
                  Go to Login →
                </motion.button>
              </Link>
            </>
          )}

          {state === 'error' && (
            <>
              <div style={{
                width: '72px', height: '72px', borderRadius: '50%',
                background: 'rgba(239,68,68,0.1)', border: '2px solid rgba(239,68,68,0.3)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '32px', margin: '0 auto 24px',
              }}>
                ✕
              </div>
              <h2 style={{ fontFamily: 'Clash Display', fontSize: '24px', fontWeight: '700', color: '#0F172A', marginBottom: '10px' }}>
                Verification Failed
              </h2>
              <p style={{ fontSize: '16px', color: '#64748B', marginBottom: '32px', lineHeight: '1.6' }}>
                {message}
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <Link to="/login" style={{ textDecoration: 'none' }}>
                  <button style={{
                    width: '100%', padding: '13px', borderRadius: '10px', border: 'none',
                    background: '#E8501A', color: '#FFFFFF', fontSize: '16px',
                    fontWeight: '700', fontFamily: 'Cabinet Grotesk', cursor: 'pointer',
                  }}>
                    Back to Login
                  </button>
                </Link>
                <p style={{ fontSize: '15px', color: '#64748B' }}>
                  Need a new link?{' '}
                  <Link to="/login" style={{ color: '#E8501A', fontWeight: '600', textDecoration: 'none' }}>
                    Sign in and request one →
                  </Link>
                </p>
              </div>
            </>
          )}
        </div>
      </motion.div>
    </div>
  )
}
