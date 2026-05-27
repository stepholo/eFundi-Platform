import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import { adminApi } from '../../api/admin'

const ADMIN = '#7C3AED'

const STATUS_CFG = {
  Verified: { color: '#22C55E', bg: 'rgba(34,197,94,0.12)'   },
  Pending:  { color: '#FF6B1A', bg: 'rgba(255,107,26,0.12)'  },
  Rejected: { color: '#EF4444', bg: 'rgba(239,68,68,0.12)'   },
}

export default function TechnicianManagementPage() {
  const qc = useQueryClient()
  const [tab, setTab] = useState('Pending')
  const [confirm, setConfirm] = useState(null) // { id, action: 'verify' | 'reject', name }
  const [search, setSearch] = useState('')

  const { data: technicians = [], isLoading } = useQuery({
    queryKey: ['admin-techs'],
    queryFn: () => adminApi.listTechnicians().then(r => r.data),
    refetchInterval: 60_000,
  })

  const verifyMutation = useMutation({
    mutationFn: (id) => adminApi.verifyTechnician(id),
    onSuccess: () => { qc.invalidateQueries(['admin-techs']); setConfirm(null) },
  })
  const rejectMutation = useMutation({
    mutationFn: (id) => adminApi.rejectTechnician(id),
    onSuccess: () => { qc.invalidateQueries(['admin-techs']); setConfirm(null) },
  })

  const isPending = verifyMutation.isPending || rejectMutation.isPending

  const filtered = technicians
    .filter(t => tab === 'All' || t.verification_status === tab)
    .filter(t => {
      if (!search) return true
      const q = search.toLowerCase()
      return (
        t.first_name?.toLowerCase().includes(q) ||
        t.last_name?.toLowerCase().includes(q) ||
        t.email?.toLowerCase().includes(q) ||
        t.specialization?.toLowerCase().includes(q)
      )
    })

  const counts = {
    All:      technicians.length,
    Pending:  technicians.filter(t => t.verification_status === 'Pending').length,
    Verified: technicians.filter(t => t.verification_status === 'Verified').length,
    Rejected: technicians.filter(t => t.verification_status === 'Rejected').length,
  }

  return (
    <div>
      <div style={{
        height: '60px', background: 'var(--ink2)', borderBottom: '1px solid var(--border2)',
        display: 'flex', alignItems: 'center', padding: '0 32px', gap: '16px',
        position: 'sticky', top: 0, zIndex: 100,
      }}>
        <span style={{ fontFamily: 'Clash Display', fontSize: '17px', fontWeight: '600', color: 'var(--white)' }}>
          Technicians
        </span>
        <div style={{ flex: 1 }} />
        <input
          placeholder="Search name, email, specialization…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{
            width: '280px', padding: '8px 14px', borderRadius: '10px',
            background: 'var(--ink3)', border: '1px solid var(--border2)',
            color: 'var(--white)', fontSize: '15px', outline: 'none', fontFamily: 'Cabinet Grotesk',
          }}
          onFocus={e => (e.target.style.borderColor = ADMIN)}
          onBlur={e => (e.target.style.borderColor = 'var(--border2)')}
        />
      </div>

      <div style={{ padding: '32px 32px 60px' }}>
        {/* Tabs */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '24px' }}>
          {['Pending', 'Verified', 'Rejected', 'All'].map(t => (
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
            <div style={{ fontSize: '40px', marginBottom: '12px' }}>👷</div>
            <div style={{ fontSize: '17px', fontWeight: '600', color: 'var(--white)', marginBottom: '6px' }}>
              No {tab === 'All' ? '' : tab.toLowerCase()} technicians
            </div>
          </div>
        ) : (
          <div style={{ background: 'var(--ink3)', border: '1px solid var(--border2)', borderRadius: '20px', overflow: 'hidden' }}>
            {filtered.map((t, i) => {
              const cfg = STATUS_CFG[t.verification_status] || STATUS_CFG.Pending
              return (
                <motion.div
                  key={t.user_id || t.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: i * 0.03 }}
                  style={{
                    display: 'flex', alignItems: 'center', padding: '16px 24px', gap: '16px',
                    borderBottom: i < filtered.length - 1 ? '1px solid var(--border2)' : 'none',
                  }}
                >
                  {/* Avatar */}
                  <div style={{
                    width: '40px', height: '40px', borderRadius: '10px', flexShrink: 0,
                    background: `${ADMIN}20`, border: `1px solid ${ADMIN}30`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '15px', fontWeight: '700', color: ADMIN,
                  }}>
                    {`${t.first_name?.[0] ?? ''}${t.last_name?.[0] ?? ''}`.toUpperCase() || '?'}
                  </div>

                  {/* Info */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '16px', fontWeight: '700', color: 'var(--white)', marginBottom: '2px' }}>
                      {t.first_name} {t.last_name}
                    </div>
                    <div style={{ fontSize: '13px', color: 'var(--muted)', fontFamily: 'DM Mono', display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                      <span>{t.email}</span>
                      {t.specialization && <span>· {t.specialization}</span>}
                      {t.years_of_experience != null && <span>· {t.years_of_experience}yr exp</span>}
                    </div>
                  </div>

                  {/* Joined */}
                  <div style={{ fontSize: '13px', color: 'var(--muted)', fontFamily: 'DM Mono', flexShrink: 0 }}>
                    {t.created_at ? new Date(t.created_at).toLocaleDateString('en-KE', { day: 'numeric', month: 'short', year: 'numeric' }) : ''}
                  </div>

                  {/* Status badge */}
                  <span style={{
                    padding: '3px 10px', borderRadius: '20px', fontSize: '12px', fontWeight: '600',
                    fontFamily: 'DM Mono', background: cfg.bg, color: cfg.color, flexShrink: 0,
                  }}>
                    {t.verification_status}
                  </span>

                  {/* Actions */}
                  {t.verification_status === 'Pending' && (
                    <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
                      <button
                        onClick={() => setConfirm({ id: t.user_id || t.id, action: 'verify', name: `${t.first_name} ${t.last_name}` })}
                        style={{
                          padding: '6px 14px', borderRadius: '8px', border: 'none',
                          background: '#22C55E', color: 'var(--ink)', fontSize: '14px',
                          fontWeight: '700', fontFamily: 'Cabinet Grotesk', cursor: 'pointer',
                        }}
                      >
                        ✓ Verify
                      </button>
                      <button
                        onClick={() => setConfirm({ id: t.user_id || t.id, action: 'reject', name: `${t.first_name} ${t.last_name}` })}
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
                  {t.verification_status === 'Verified' && (
                    <button
                      onClick={() => setConfirm({ id: t.user_id || t.id, action: 'reject', name: `${t.first_name} ${t.last_name}` })}
                      style={{
                        padding: '6px 14px', borderRadius: '8px',
                        border: '1px solid rgba(239,68,68,0.3)', background: 'transparent',
                        color: '#EF4444', fontSize: '14px', fontWeight: '600',
                        fontFamily: 'Cabinet Grotesk', cursor: 'pointer', flexShrink: 0,
                      }}
                    >
                      Revoke
                    </button>
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
                borderRadius: '20px', padding: '28px', width: '380px',
              }}
            >
              <div style={{ fontSize: '24px', marginBottom: '12px' }}>
                {confirm.action === 'verify' ? '✅' : '❌'}
              </div>
              <div style={{ fontSize: '16px', fontWeight: '700', color: 'var(--white)', marginBottom: '8px' }}>
                {confirm.action === 'verify' ? 'Verify Technician' : 'Reject / Revoke Technician'}
              </div>
              <div style={{ fontSize: '15px', color: 'var(--muted)', marginBottom: '24px', lineHeight: '1.6' }}>
                {confirm.action === 'verify'
                  ? `${confirm.name} will be verified and can start accepting jobs.`
                  : `${confirm.name} will be rejected and lose access to accept jobs.`}
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
                    if (confirm.action === 'verify') verifyMutation.mutate(confirm.id)
                    else rejectMutation.mutate(confirm.id)
                  }}
                  style={{
                    flex: 1, padding: '11px', borderRadius: '10px', border: 'none',
                    background: confirm.action === 'verify' ? '#22C55E' : '#EF4444',
                    color: 'var(--ink)', fontSize: '15px', fontWeight: '700',
                    fontFamily: 'Cabinet Grotesk', cursor: isPending ? 'not-allowed' : 'pointer',
                    opacity: isPending ? 0.6 : 1,
                  }}
                >
                  {isPending ? 'Processing…' : confirm.action === 'verify' ? 'Confirm Verify' : 'Confirm Reject'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
