import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import { adminApi } from '../../api/admin'

const ADMIN = '#7C3AED'

const STATUS_CFG = {
  Pending:    { color: '#FF6B1A', bg: 'rgba(255,107,26,0.12)',  label: 'Pending'    },
  Processing: { color: '#1AADFF', bg: 'rgba(26,173,255,0.12)', label: 'Processing' },
  Approved:   { color: '#22C55E', bg: 'rgba(34,197,94,0.12)',  label: 'Paid'       },
  Rejected:   { color: '#EF4444', bg: 'rgba(239,68,68,0.12)',  label: 'Rejected'   },
  Failed:     { color: '#EF4444', bg: 'rgba(239,68,68,0.12)',  label: 'Failed'     },
}

export default function WithdrawalManagementPage() {
  const qc = useQueryClient()
  const [tab, setTab] = useState('Pending')
  const [confirm, setConfirm] = useState(null) // { id, action: 'approve'|'reject', amount, name }

  const { data: withdrawals = [], isLoading } = useQuery({
    queryKey: ['admin-withdrawals'],
    queryFn: () => adminApi.listWithdrawals().then(r => r.data),
    refetchInterval: 30_000,
  })

  const approveMutation = useMutation({
    mutationFn: (id) => adminApi.approveWithdrawal(id),
    onSuccess: () => { qc.invalidateQueries(['admin-withdrawals']); setConfirm(null) },
  })
  const rejectMutation = useMutation({
    mutationFn: (id) => adminApi.rejectWithdrawal(id),
    onSuccess: () => { qc.invalidateQueries(['admin-withdrawals']); setConfirm(null) },
  })

  const isPending = approveMutation.isPending || rejectMutation.isPending

  const filtered = withdrawals.filter(w => tab === 'All' || w.status === tab)

  const counts = {
    Pending:    withdrawals.filter(w => w.status === 'Pending').length,
    Processing: withdrawals.filter(w => w.status === 'Processing').length,
    Approved:   withdrawals.filter(w => w.status === 'Approved').length,
    Rejected:   withdrawals.filter(w => w.status === 'Rejected' || w.status === 'Failed').length,
    All:        withdrawals.length,
  }

  const totalPending = withdrawals
    .filter(w => w.status === 'Pending')
    .reduce((s, w) => s + Number(w.amount), 0)

  return (
    <div>
      <div style={{
        height: '60px', background: 'var(--ink2)', borderBottom: '1px solid var(--border2)',
        display: 'flex', alignItems: 'center', padding: '0 32px', gap: '16px',
        position: 'sticky', top: 0, zIndex: 100,
      }}>
        <span style={{ fontFamily: 'Clash Display', fontSize: '17px', fontWeight: '600', color: 'var(--white)' }}>
          Withdrawals
        </span>
        {counts.Pending > 0 && (
          <span style={{
            padding: '2px 10px', borderRadius: '20px', fontSize: '13px', fontWeight: '700',
            background: 'rgba(255,107,26,0.15)', color: '#FF6B1A', fontFamily: 'DM Mono',
          }}>
            {counts.Pending} pending · KES {totalPending.toLocaleString()}
          </span>
        )}
      </div>

      <div style={{ padding: '32px 32px 60px' }}>
        {/* Tabs */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '24px' }}>
          {['Pending', 'Processing', 'Approved', 'Rejected', 'All'].map(t => (
            <button key={t} onClick={() => setTab(t)} style={{
              padding: '7px 18px', borderRadius: '20px', border: 'none', cursor: 'pointer',
              fontSize: '15px', fontWeight: '600', fontFamily: 'Cabinet Grotesk',
              background: tab === t ? ADMIN : 'var(--ink3)',
              color:      tab === t ? 'white' : 'var(--muted)',
              transition: 'all 0.15s', display: 'flex', alignItems: 'center', gap: '6px',
            }}>
              {t}
              {counts[t] > 0 && (
                <span style={{
                  width: '18px', height: '18px', borderRadius: '50%', fontSize: '12px', fontWeight: '700',
                  background: tab === t ? 'rgba(255,255,255,0.25)' : ADMIN, color: 'white',
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                }}>{counts[t]}</span>
              )}
            </button>
          ))}
        </div>

        {isLoading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {[0,1,2,3].map(i => (
              <div key={i} style={{ height: '76px', background: 'var(--ink3)', borderRadius: '16px', border: '1px solid var(--border2)' }} />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '80px 24px', background: 'var(--ink3)', border: '1px dashed var(--border2)', borderRadius: '20px' }}>
            <div style={{ fontSize: '40px', marginBottom: '12px' }}>💸</div>
            <div style={{ fontSize: '17px', fontWeight: '600', color: 'var(--white)' }}>
              No {tab === 'All' ? '' : tab.toLowerCase()} withdrawal requests
            </div>
          </div>
        ) : (
          <div style={{ background: 'var(--ink3)', border: '1px solid var(--border2)', borderRadius: '20px', overflow: 'hidden' }}>
            {filtered.map((w, i) => {
              const cfg = STATUS_CFG[w.status] || STATUS_CFG.Pending
              const techName = w.technician_name || w.technician_id?.toString() || '—'
              return (
                <motion.div
                  key={w.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: i * 0.03 }}
                  style={{
                    display: 'flex', alignItems: 'center', padding: '16px 24px', gap: '16px',
                    borderBottom: i < filtered.length - 1 ? '1px solid var(--border2)' : 'none',
                  }}
                >
                  {/* Amount */}
                  <div style={{ width: '120px', flexShrink: 0 }}>
                    <div style={{ fontFamily: 'Clash Display', fontSize: '18px', fontWeight: '700', color: 'var(--white)' }}>
                      KES {Number(w.amount).toLocaleString()}
                    </div>
                  </div>

                  {/* Info */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '15px', fontWeight: '600', color: 'var(--white)', marginBottom: '3px' }}>
                      {techName}
                    </div>
                    <div style={{ fontSize: '13px', color: 'var(--muted)', fontFamily: 'DM Mono' }}>
                      📱 {w.phone_number} · {new Date(w.created_at).toLocaleDateString('en-KE', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </div>
                    {w.notes && (
                      <div style={{ fontSize: '13px', color: 'var(--muted)', marginTop: '2px', fontStyle: 'italic' }}>{w.notes}</div>
                    )}
                  </div>

                  {/* Status badge */}
                  <span style={{
                    padding: '3px 10px', borderRadius: '20px', fontSize: '12px', fontWeight: '600',
                    fontFamily: 'DM Mono', background: cfg.bg, color: cfg.color, flexShrink: 0,
                  }}>
                    {cfg.label}
                  </span>

                  {/* Actions */}
                  {w.status === 'Pending' && (
                    <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
                      <button
                        onClick={() => setConfirm({ id: w.id, action: 'approve', amount: w.amount, name: techName })}
                        style={{
                          padding: '6px 14px', borderRadius: '8px', border: 'none',
                          background: '#22C55E', color: 'var(--ink)', fontSize: '14px',
                          fontWeight: '700', fontFamily: 'Cabinet Grotesk', cursor: 'pointer',
                        }}
                      >
                        ✓ Approve
                      </button>
                      <button
                        onClick={() => setConfirm({ id: w.id, action: 'reject', amount: w.amount, name: techName })}
                        style={{
                          padding: '6px 14px', borderRadius: '8px',
                          border: '1px solid rgba(239,68,68,0.4)', background: 'transparent',
                          color: '#EF4444', fontSize: '14px', fontWeight: '700',
                          fontFamily: 'Cabinet Grotesk', cursor: 'pointer',
                        }}
                      >
                        ✕ Reject
                      </button>
                    </div>
                  )}
                </motion.div>
              )
            })}
          </div>
        )}
      </div>

      {/* Confirm modal */}
      <AnimatePresence>
        {confirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200,
            }}
            onClick={() => !isPending && setConfirm(null)}
          >
            <motion.div
              initial={{ scale: 0.92, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.92, opacity: 0 }}
              onClick={e => e.stopPropagation()}
              style={{
                background: 'var(--ink2)', border: '1px solid var(--border2)',
                borderRadius: '20px', padding: '28px', width: '400px',
              }}
            >
              <div style={{ fontSize: '24px', marginBottom: '12px' }}>
                {confirm.action === 'approve' ? '💸' : '❌'}
              </div>
              <div style={{ fontSize: '16px', fontWeight: '700', color: 'var(--white)', marginBottom: '8px' }}>
                {confirm.action === 'approve' ? 'Approve Withdrawal' : 'Reject Withdrawal'}
              </div>
              <div style={{ fontSize: '15px', color: 'var(--muted)', marginBottom: '24px', lineHeight: '1.6' }}>
                {confirm.action === 'approve'
                  ? `This will send KES ${Number(confirm.amount).toLocaleString()} to ${confirm.name} via Intasend M-Pesa. This action cannot be undone.`
                  : `${confirm.name}'s withdrawal of KES ${Number(confirm.amount).toLocaleString()} will be rejected. The funds remain in their wallet.`}
              </div>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  onClick={() => !isPending && setConfirm(null)}
                  style={{
                    flex: 1, padding: '11px', borderRadius: '10px',
                    border: '1px solid var(--border2)', background: 'transparent',
                    color: 'var(--muted)', fontSize: '15px', fontWeight: '600',
                    fontFamily: 'Cabinet Grotesk', cursor: isPending ? 'not-allowed' : 'pointer',
                  }}
                >
                  Cancel
                </button>
                <button
                  disabled={isPending}
                  onClick={() => {
                    if (confirm.action === 'approve') approveMutation.mutate(confirm.id)
                    else rejectMutation.mutate(confirm.id)
                  }}
                  style={{
                    flex: 1, padding: '11px', borderRadius: '10px', border: 'none',
                    background: confirm.action === 'approve' ? '#22C55E' : '#EF4444',
                    color: 'var(--ink)', fontSize: '15px', fontWeight: '700',
                    fontFamily: 'Cabinet Grotesk', cursor: isPending ? 'not-allowed' : 'pointer',
                    opacity: isPending ? 0.6 : 1,
                  }}
                >
                  {isPending ? 'Processing…' : confirm.action === 'approve' ? 'Approve & Send' : 'Confirm Reject'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
