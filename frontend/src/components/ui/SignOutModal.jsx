import { motion, AnimatePresence } from 'framer-motion'

export default function SignOutModal({ onConfirm, onCancel }) {
  return (
    <AnimatePresence>
      {/* Backdrop */}
      <motion.div
        key="backdrop"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onCancel}
        style={{
          position: 'fixed', inset: 0, zIndex: 1000,
          background: 'rgba(15,23,42,0.55)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: '20px',
        }}
      >
        {/* Dialog */}
        <motion.div
          key="dialog"
          initial={{ opacity: 0, scale: 0.93, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.93, y: 12 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
          onClick={e => e.stopPropagation()}
          style={{
            background: '#FFFFFF', borderRadius: '18px',
            border: '1px solid #E2E8F0',
            boxShadow: '0 20px 60px rgba(0,0,0,0.18)',
            padding: '32px 28px 24px',
            width: '100%', maxWidth: '360px',
            textAlign: 'center',
          }}
        >
          {/* Icon */}
          <div style={{
            width: '52px', height: '52px', borderRadius: '14px',
            background: '#FEF2F2', border: '1px solid #FECACA',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '24px', margin: '0 auto 16px',
          }}>
            🚪
          </div>

          <h2 style={{
            fontFamily: 'Clash Display', fontSize: '18px', fontWeight: '700',
            color: '#0F172A', marginBottom: '8px',
          }}>
            Sign out?
          </h2>
          <p style={{
            fontSize: '14px', color: '#64748B', lineHeight: '1.6', marginBottom: '24px',
          }}>
            You will be signed out of your account and returned to the login page.
          </p>

          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              onClick={onCancel}
              style={{
                flex: 1, padding: '11px', borderRadius: '10px',
                border: '1px solid #E2E8F0', background: '#F8FAFC',
                fontSize: '14px', fontWeight: '600', color: '#475569',
                cursor: 'pointer', fontFamily: 'inherit',
              }}
            >
              Cancel
            </button>
            <button
              onClick={onConfirm}
              style={{
                flex: 1, padding: '11px', borderRadius: '10px',
                border: 'none', background: '#DC2626',
                fontSize: '14px', fontWeight: '700', color: '#FFFFFF',
                cursor: 'pointer', fontFamily: 'inherit',
              }}
            >
              Sign out
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
