import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { technicianApi } from '../../api/technicians'
import useAuthStore from '../../store/authStore'

const STATUS_CFG = {
  Pending:    { color: '#FF6B1A', bg: 'rgba(255,107,26,0.12)', label: 'Pending'    },
  Processing: { color: '#1AADFF', bg: 'rgba(26,173,255,0.12)', label: 'Processing' },
  Completed:  { color: '#22C55E', bg: 'rgba(34,197,94,0.12)',  label: 'Paid'       },
  Failed:     { color: '#EF4444', bg: 'rgba(239,68,68,0.12)',  label: 'Failed'     },
  Rejected:   { color: '#6B7A55', bg: 'rgba(107,122,85,0.12)', label: 'Rejected'   },
}

export default function EarningsPage() {
  const { user } = useAuthStore()
  const qc = useQueryClient()

  const [showWithdraw, setShowWithdraw] = useState(false)
  const [wForm, setWForm]   = useState({ phone_number: user?.phone_number || '', amount: '' })
  const [wError, setWError] = useState('')
  const [wSuccess, setWSuccess] = useState(false)

  const { data: wallets = [] } = useQuery({
    queryKey: ['wallet'],
    queryFn:  () => technicianApi.getWallet().then(r => r.data),
  })

  const { data: withdrawals = [], isLoading: wLoading } = useQuery({
    queryKey: ['withdrawals'],
    queryFn:  () => technicianApi.getWithdrawals().then(r => r.data),
  })

  const withdrawMutation = useMutation({
    mutationFn: (data) => technicianApi.requestWithdrawal(data),
    onSuccess: () => {
      setWSuccess(true)
      setWForm(f => ({ ...f, amount: '' }))
      qc.invalidateQueries(['wallet'])
      qc.invalidateQueries(['withdrawals'])
    },
    onError: (err) => {
      const d = err.response?.data
      if (!d) { setWError('Withdrawal failed. Try again.'); return }
      if (typeof d === 'string') { setWError(d); return }
      const msgs = Object.values(d).flat()
      setWError(msgs[0] || 'Validation error.')
    },
  })

  const handleWithdraw = (e) => {
    e.preventDefault()
    setWError('')
    setWSuccess(false)
    const amt = parseFloat(wForm.amount)
    if (!wForm.phone_number) { setWError('Phone number is required.'); return }
    if (!wForm.amount || isNaN(amt) || amt <= 0) { setWError('Enter a valid amount.'); return }
    withdrawMutation.mutate({ phone_number: wForm.phone_number, amount: amt })
  }

  const wallet = wallets[0] ?? null
  const balance = wallet ? Number(wallet.balance) : 0

  return (
    <div>
      <div style={{
        height: '60px', background: 'var(--ink2)', borderBottom: '1px solid var(--border2)',
        display: 'flex', alignItems: 'center', padding: '0 32px',
        position: 'sticky', top: 0, zIndex: 100,
      }}>
        <span style={{ fontFamily: 'Clash Display', fontSize: '17px', fontWeight: '600', color: 'var(--white)' }}>
          Earnings
        </span>
      </div>

      <div style={{ padding: '32px 32px 60px' }}>

        {/* Wallet cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '28px' }}>
          <WalletCard icon="💰" label="Available Balance" value={`KES ${balance.toLocaleString()}`} highlight color="var(--orange)" delay={0} />
          <WalletCard icon="📈" label="Total Earned"      value={wallet ? `KES ${Number(wallet.total_earned).toLocaleString()}` : '—'} delay={0.07} />
          <WalletCard icon="📤" label="Total Withdrawn"   value={wallet ? `KES ${Number(wallet.total_withdrawn).toLocaleString()}` : '—'} delay={0.14} />
        </div>

        {/* Withdraw section */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.18 }}
          style={{
            background: 'var(--ink3)', border: '1px solid var(--border2)',
            borderRadius: '20px', padding: '24px', marginBottom: '28px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: showWithdraw ? '20px' : 0 }}>
            <div>
              <div style={{ fontSize: '17px', fontWeight: '700', color: 'var(--white)', marginBottom: '3px' }}>
                Withdraw Earnings
              </div>
              <div style={{ fontSize: '14px', color: 'var(--muted)' }}>
                Withdraw from your eFundi wallet to M-Pesa
              </div>
            </div>
            <motion.button
              whileHover={{ translateY: -1 }} whileTap={{ scale: 0.97 }}
              onClick={() => { setShowWithdraw(s => !s); setWError(''); setWSuccess(false) }}
              style={{
                padding: '10px 20px', borderRadius: '10px', border: 'none',
                background: showWithdraw ? 'var(--ink)' : 'var(--orange)',
                color: showWithdraw ? 'var(--muted)' : 'var(--ink)',
                border: showWithdraw ? '1px solid var(--border2)' : 'none',
                fontSize: '15px', fontWeight: '700', fontFamily: 'Cabinet Grotesk', cursor: 'pointer',
              }}
            >
              {showWithdraw ? 'Cancel' : '📤 Withdraw'}
            </motion.button>
          </div>

          {showWithdraw && (
            <motion.form
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              onSubmit={handleWithdraw}
            >
              {wError && (
                <div style={{ marginBottom: '16px', padding: '12px 16px', borderRadius: '10px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: 'var(--red)', fontSize: '15px' }}>
                  {wError}
                </div>
              )}
              {wSuccess && (
                <div style={{ marginBottom: '16px', padding: '12px 16px', borderRadius: '10px', background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.3)', color: '#22C55E', fontSize: '15px' }}>
                  Withdrawal request submitted. You will receive an M-Pesa prompt shortly.
                </div>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '14px', color: 'var(--muted)', marginBottom: '6px' }}>M-Pesa Phone Number</label>
                  <input
                    type="tel" value={wForm.phone_number}
                    onChange={e => setWForm(f => ({ ...f, phone_number: e.target.value }))}
                    placeholder="0712345678" required
                    style={{ width: '100%', borderRadius: '10px', padding: '12px 14px', fontSize: '16px', outline: 'none', fontFamily: 'Cabinet Grotesk', background: 'var(--ink)', border: '1px solid var(--border2)', color: 'var(--white)', boxSizing: 'border-box' }}
                    onFocus={e => (e.target.style.borderColor = 'var(--orange)')}
                    onBlur={e => (e.target.style.borderColor = 'var(--border2)')}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '14px', color: 'var(--muted)', marginBottom: '6px' }}>
                    Amount (KES) — Balance: KES {balance.toLocaleString()}
                  </label>
                  <input
                    type="number" min="5" max={balance} value={wForm.amount}
                    onChange={e => setWForm(f => ({ ...f, amount: e.target.value }))}
                    placeholder="e.g. 500" required
                    style={{ width: '100%', borderRadius: '10px', padding: '12px 14px', fontSize: '16px', outline: 'none', fontFamily: 'Cabinet Grotesk', background: 'var(--ink)', border: '1px solid var(--border2)', color: 'var(--white)', boxSizing: 'border-box' }}
                    onFocus={e => (e.target.style.borderColor = 'var(--orange)')}
                    onBlur={e => (e.target.style.borderColor = 'var(--border2)')}
                  />
                </div>
              </div>

              <motion.button
                type="submit"
                disabled={withdrawMutation.isPending}
                whileHover={{ translateY: -1 }} whileTap={{ scale: 0.97 }}
                style={{
                  padding: '13px 28px', borderRadius: '10px', border: 'none',
                  background: 'var(--orange)', color: 'var(--ink)', fontSize: '16px',
                  fontWeight: '700', fontFamily: 'Cabinet Grotesk',
                  cursor: withdrawMutation.isPending ? 'not-allowed' : 'pointer',
                  opacity: withdrawMutation.isPending ? 0.6 : 1,
                }}
              >
                {withdrawMutation.isPending ? 'Submitting…' : 'Request Withdrawal →'}
              </motion.button>
            </motion.form>
          )}
        </motion.div>

        {/* Withdrawal history */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.22 }}>
          <div style={{ fontSize: '13px', fontWeight: '600', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '1px', fontFamily: 'DM Mono', marginBottom: '16px' }}>
            Withdrawal History
          </div>
          <div style={{ background: 'var(--ink3)', border: '1px solid var(--border2)', borderRadius: '20px', overflow: 'hidden' }}>
            {wLoading ? (
              [0,1,2].map(i => <WithdrawalSkeleton key={i} />)
            ) : withdrawals.length === 0 ? (
              <div style={{ padding: '48px 24px', textAlign: 'center', color: 'var(--muted)', fontSize: '15px' }}>
                No withdrawal history yet
              </div>
            ) : (
              withdrawals.map((w, i) => <WithdrawalRow key={w.id} w={w} last={i === withdrawals.length - 1} />)
            )}
          </div>
        </motion.div>
      </div>
    </div>
  )
}

function WithdrawalRow({ w, last }) {
  const cfg = STATUS_CFG[w.status] ?? STATUS_CFG.Pending
  return (
    <div style={{
      display: 'flex', alignItems: 'center', padding: '16px 24px',
      borderBottom: last ? 'none' : '1px solid var(--border2)',
    }}>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: '16px', fontWeight: '600', color: 'var(--white)', marginBottom: '3px' }}>
          KES {Number(w.amount).toLocaleString()}
        </div>
        <div style={{ fontSize: '13px', color: 'var(--muted)', fontFamily: 'DM Mono' }}>
          {w.phone_number} · {new Date(w.created_at).toLocaleDateString('en-KE', { day: 'numeric', month: 'short', year: 'numeric' })}
        </div>
      </div>
      <span style={{
        display: 'inline-block', padding: '3px 10px', borderRadius: '20px',
        fontSize: '13px', fontWeight: '600', fontFamily: 'DM Mono',
        background: cfg.bg, color: cfg.color,
      }}>
        {cfg.label}
      </span>
    </div>
  )
}

function WalletCard({ icon, label, value, highlight, color = 'var(--muted)', delay = 0 }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.4 }}
      style={{
        background: highlight ? 'rgba(255,107,26,0.06)' : 'var(--ink3)',
        border: `1px solid ${highlight ? 'rgba(255,107,26,0.25)' : 'var(--border2)'}`,
        borderRadius: '20px', padding: '22px',
      }}
    >
      <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: `${color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', marginBottom: '12px' }}>{icon}</div>
      <div style={{ fontSize: '12px', letterSpacing: '1.5px', color: 'var(--muted)', textTransform: 'uppercase', fontFamily: 'DM Mono', marginBottom: '6px' }}>{label}</div>
      <div style={{ fontFamily: 'Clash Display', fontSize: '26px', fontWeight: '700', color: highlight ? 'var(--orange)' : 'var(--white)' }}>{value}</div>
    </motion.div>
  )
}

function WithdrawalSkeleton() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', padding: '16px 24px', borderBottom: '1px solid var(--border2)' }}>
      <div style={{ flex: 1 }}>
        <div style={{ height: '14px', width: '30%', background: 'var(--ink)', borderRadius: '4px', marginBottom: '8px' }} />
        <div style={{ height: '11px', width: '50%', background: 'var(--ink)', borderRadius: '4px' }} />
      </div>
      <div style={{ height: '22px', width: '70px', background: 'var(--ink)', borderRadius: '20px' }} />
    </div>
  )
}
