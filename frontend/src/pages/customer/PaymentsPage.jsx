import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RTooltip,
  PieChart, Pie, Cell, Legend,
} from 'recharts'
import { paymentsApi } from '../../api/payments'

// ── Constants ─────────────────────────────────────────────────────────────────

const STATUS_CONFIG = {
  Successful: { color: '#22C55E', bg: 'rgba(34,197,94,0.12)',   label: 'Successful' },
  Pending:    { color: '#FF6B1A', bg: 'rgba(255,107,26,0.12)',  label: 'Pending'    },
  Processing: { color: '#1AADFF', bg: 'rgba(26,173,255,0.12)',  label: 'Processing' },
  Failed:     { color: '#EF4444', bg: 'rgba(239,68,68,0.12)',   label: 'Failed'     },
  Cancelled:  { color: '#9CA3AF', bg: 'rgba(156,163,175,0.12)', label: 'Cancelled'  },
}

const TABS = ['All', 'Successful', 'Pending', 'Processing', 'Failed']

function statusCfg(s) {
  return STATUS_CONFIG[s] ?? { color: '#9CA3AF', bg: 'rgba(156,163,175,0.12)', label: s }
}

function methodIcon(method) {
  return { 'M-Pesa': '📱', Cash: '💵', Card: '💳' }[method] ?? '💳'
}

function fmtDate(raw, opts) {
  return new Date(raw).toLocaleDateString('en-KE', opts)
}

// ── Main component ────────────────────────────────────────────────────────────

export default function PaymentsPage() {
  const navigate   = useNavigate()
  const [tab, setTab]         = useState('All')
  const [selectedId, setSelected] = useState(null)

  const { data: payments = [], isLoading } = useQuery({
    queryKey: ['payments'],
    queryFn:  () => paymentsApi.list().then(r => r.data),
    staleTime: 60_000,
  })

  const filtered = useMemo(() => (
    tab === 'All' ? payments : payments.filter(p => p.payment_status === tab)
  ), [payments, tab])

  const selected = filtered.find(p => p.id === selectedId) ?? filtered[0] ?? null

  // ── Analytics data ───────────────────────────────────────────────────────
  const monthlyData = useMemo(() => {
    const map = {}
    payments
      .filter(p => p.payment_status === 'Successful')
      .forEach(p => {
        const d   = new Date(p.transaction_date || p.created_at)
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
        const lbl = d.toLocaleDateString('en-KE', { month: 'short', year: '2-digit' })
        if (!map[key]) map[key] = { month: lbl, amount: 0, key }
        map[key].amount += Number(p.amount)
      })
    return Object.values(map)
      .sort((a, b) => (a.key > b.key ? 1 : -1))
      .slice(-12)
  }, [payments])

  const statusData = useMemo(() => {
    const map = {}
    payments.forEach(p => {
      const s = p.payment_status || 'Unknown'
      if (!map[s]) map[s] = { name: s, value: 0 }
      map[s].value++
    })
    return Object.values(map)
  }, [payments])

  const total      = payments.reduce((s, p) => p.payment_status === 'Successful' ? s + Number(p.amount) : s, 0)
  const successful = payments.filter(p => p.payment_status === 'Successful').length
  const pending    = payments.filter(p => ['Pending', 'Processing'].includes(p.payment_status)).length

  return (
    <div>
      {/* ── Topbar ─────────────────────────────────────────────────────────── */}
      <div style={{
        height: '60px', background: 'var(--ink2)', borderBottom: '1px solid var(--border2)',
        display: 'flex', alignItems: 'center', padding: '0 32px',
        position: 'sticky', top: 0, zIndex: 100,
      }}>
        <span style={{ fontFamily: 'Clash Display', fontSize: '17px', fontWeight: '600', color: 'var(--white)' }}>
          Payment History
        </span>
      </div>

      <div style={{ padding: '28px 32px 60px' }}>

        {/* ── Summary cards ──────────────────────────────────────────────────── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '28px' }}>
          <SummaryCard icon="💳" label="Total Paid"  value={`KES ${total.toLocaleString()}`} color="#E8501A" delay={0}    />
          <SummaryCard icon="✅" label="Successful"  value={successful}                        color="#22C55E" delay={0.06} />
          <SummaryCard icon="⏳" label="Pending"     value={pending}                           color="#FF6B1A" delay={0.12} />
        </div>

        {/* ── Two-column: list | detail ───────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.18 }}
          style={{
            background: 'var(--ink3)', border: '1px solid var(--border2)',
            borderRadius: '20px', overflow: 'hidden', display: 'flex',
            marginBottom: '28px', minHeight: '520px',
          }}
        >
          {/* Left: payment list */}
          <div style={{ width: '42%', borderRight: '1px solid var(--border2)', display: 'flex', flexDirection: 'column' }}>
            {/* Tab bar */}
            <div style={{
              display: 'flex', gap: '4px', padding: '12px 14px',
              borderBottom: '1px solid var(--border2)', flexWrap: 'wrap',
            }}>
              {TABS.map(t => {
                const count = t === 'All' ? payments.length : payments.filter(p => p.payment_status === t).length
                const active = tab === t
                return (
                  <button
                    key={t}
                    onClick={() => { setTab(t); setSelected(null) }}
                    style={{
                      padding: '4px 10px', borderRadius: '20px', border: 'none',
                      fontSize: '11px', fontWeight: '600', cursor: 'pointer',
                      background: active ? 'var(--volt)' : 'var(--ink)',
                      color: active ? 'var(--ink)' : 'var(--muted)',
                      transition: 'all 0.15s',
                    }}
                  >
                    {t}{count > 0 ? ` (${count})` : ''}
                  </button>
                )
              })}
            </div>

            {/* Rows */}
            <div style={{ overflowY: 'auto', flex: 1 }}>
              {isLoading ? (
                [0,1,2,3,4].map(i => <CompactSkeleton key={i} />)
              ) : filtered.length === 0 ? (
                <div style={{ padding: '48px 20px', textAlign: 'center', color: 'var(--muted)', fontSize: '13px' }}>
                  No payments in this category
                </div>
              ) : filtered.map((p, i) => {
                const cfg        = statusCfg(p.payment_status)
                const isSelected = selected?.id === p.id
                return (
                  <div
                    key={p.id}
                    onClick={() => setSelected(p.id)}
                    style={{
                      padding: '13px 14px', cursor: 'pointer',
                      borderBottom: i < filtered.length - 1 ? '1px solid var(--border2)' : 'none',
                      borderLeft: `3px solid ${isSelected ? 'var(--volt)' : 'transparent'}`,
                      background: isSelected ? 'rgba(232,80,26,0.05)' : 'transparent',
                      transition: 'all 0.15s',
                    }}
                    onMouseEnter={e => { if (!isSelected) e.currentTarget.style.background = 'rgba(255,255,255,0.02)' }}
                    onMouseLeave={e => { if (!isSelected) e.currentTarget.style.background = 'transparent' }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: '13px', fontWeight: '600', color: 'var(--white)', marginBottom: '3px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {p.service_category || 'Service'}
                        </div>
                        <div style={{ fontSize: '11px', color: 'var(--muted)', fontFamily: 'DM Mono' }}>
                          {fmtDate(p.transaction_date || p.created_at, { day: 'numeric', month: 'short', year: 'numeric' })}
                        </div>
                      </div>
                      <div style={{ textAlign: 'right', flexShrink: 0, marginLeft: '8px' }}>
                        <div style={{ fontSize: '13px', fontWeight: '700', color: p.payment_status === 'Successful' ? '#22C55E' : 'var(--white)', marginBottom: '4px' }}>
                          KES {Number(p.amount).toLocaleString()}
                        </div>
                        <span style={{
                          display: 'inline-block', padding: '2px 7px', borderRadius: '20px',
                          fontSize: '10px', fontWeight: '600',
                          background: cfg.bg, color: cfg.color,
                        }}>
                          {cfg.label}
                        </span>
                      </div>
                    </div>
                    {/* Method pill */}
                    <div style={{ marginTop: '6px', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', color: 'var(--muted)' }}>
                      <span>{methodIcon(p.payment_method)}</span>
                      <span>{p.payment_method}</span>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Right: detail */}
          <div style={{ flex: 1 }}>
            <AnimatePresence mode="wait">
              {selected ? (
                <motion.div
                  key={selected.id}
                  initial={{ opacity: 0, x: 24 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -16 }}
                  transition={{ duration: 0.22, ease: 'easeOut' }}
                  style={{ padding: '28px 24px', height: '100%', boxSizing: 'border-box' }}
                >
                  <PaymentDetail payment={selected} navigate={navigate} />
                </motion.div>
              ) : (
                <motion.div
                  key="empty-detail"
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                  style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--muted)', fontSize: '14px' }}
                >
                  {isLoading ? '' : 'Select a payment to view details'}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>

        {/* ── Analytics ──────────────────────────────────────────────────────── */}
        {!isLoading && payments.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
            <div style={{ fontSize: '12px', fontWeight: '600', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '1px', fontFamily: 'DM Mono', marginBottom: '16px' }}>
              Payment Analytics
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>

              {/* Bar chart — monthly trends */}
              <div style={{ background: 'var(--ink3)', border: '1px solid var(--border2)', borderRadius: '20px', padding: '24px' }}>
                <div style={{ fontSize: '14px', fontWeight: '700', color: 'var(--white)', marginBottom: '3px' }}>Payment Trends</div>
                <div style={{ fontSize: '12px', color: 'var(--muted)', marginBottom: '20px' }}>Monthly successful payments (KES)</div>
                {monthlyData.length === 0 ? (
                  <div style={{ height: '200px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--muted)', fontSize: '13px' }}>
                    No successful payments recorded
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={monthlyData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                      <XAxis
                        dataKey="month"
                        tick={{ fill: '#9CA3AF', fontSize: 11, fontFamily: 'DM Mono' }}
                        axisLine={false} tickLine={false}
                      />
                      <YAxis
                        tick={{ fill: '#9CA3AF', fontSize: 11, fontFamily: 'DM Mono' }}
                        axisLine={false} tickLine={false}
                        tickFormatter={v => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}
                      />
                      <RTooltip
                        cursor={{ fill: 'rgba(255,255,255,0.04)' }}
                        contentStyle={{ background: '#111827', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', fontSize: '13px' }}
                        labelStyle={{ color: '#fff', fontWeight: 600, marginBottom: 4 }}
                        itemStyle={{ color: '#22C55E' }}
                        formatter={v => [`KES ${Number(v).toLocaleString()}`, 'Amount']}
                      />
                      <Bar dataKey="amount" fill="#E8501A" radius={[6, 6, 0, 0]} maxBarSize={44} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>

              {/* Pie chart — status breakdown */}
              <div style={{ background: 'var(--ink3)', border: '1px solid var(--border2)', borderRadius: '20px', padding: '24px' }}>
                <div style={{ fontSize: '14px', fontWeight: '700', color: 'var(--white)', marginBottom: '3px' }}>Status Breakdown</div>
                <div style={{ fontSize: '12px', color: 'var(--muted)', marginBottom: '20px' }}>Payment distribution by status</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
                  <ResponsiveContainer width="60%" height={200}>
                    <PieChart>
                      <Pie
                        data={statusData}
                        cx="50%" cy="50%"
                        innerRadius={55} outerRadius={85}
                        paddingAngle={3} dataKey="value"
                        strokeWidth={0}
                      >
                        {statusData.map((entry, i) => (
                          <Cell
                            key={`cell-${i}`}
                            fill={STATUS_CONFIG[entry.name]?.color ?? '#9CA3AF'}
                          />
                        ))}
                      </Pie>
                      <RTooltip
                        contentStyle={{ background: '#111827', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', fontSize: '13px' }}
                        labelStyle={{ color: '#fff' }}
                        formatter={(v, name) => [v, name]}
                      />
                    </PieChart>
                  </ResponsiveContainer>

                  {/* Custom legend */}
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {statusData.map((entry, i) => {
                      const cfg   = STATUS_CONFIG[entry.name] ?? { color: '#9CA3AF', label: entry.name }
                      const pct   = Math.round((entry.value / payments.length) * 100)
                      return (
                        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: cfg.color, flexShrink: 0 }} />
                          <div style={{ flex: 1 }}>
                            <div style={{ fontSize: '12px', fontWeight: '600', color: 'var(--white)' }}>{cfg.label ?? entry.name}</div>
                            <div style={{ fontSize: '11px', color: 'var(--muted)', fontFamily: 'DM Mono' }}>{entry.value} · {pct}%</div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>

            </div>
          </motion.div>
        )}

      </div>
    </div>
  )
}

// ── PaymentDetail ─────────────────────────────────────────────────────────────

function PaymentDetail({ payment: p, navigate }) {
  const cfg  = statusCfg(p.payment_status)
  const date = new Date(p.transaction_date || p.created_at)

  return (
    <div>
      {/* Amount + status */}
      <div style={{ marginBottom: '24px' }}>
        <div style={{ fontSize: '11px', color: 'var(--muted)', fontFamily: 'DM Mono', letterSpacing: '1.5px', textTransform: 'uppercase', marginBottom: '8px' }}>
          Payment Amount
        </div>
        <div style={{
          fontFamily: 'Clash Display', fontSize: '34px', fontWeight: '700',
          color: p.payment_status === 'Successful' ? '#22C55E' : 'var(--white)',
          marginBottom: '12px', lineHeight: 1.1,
        }}>
          KES {Number(p.amount).toLocaleString()}
        </div>
        <span style={{
          display: 'inline-block', padding: '5px 14px', borderRadius: '20px',
          fontSize: '13px', fontWeight: '700',
          background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.color}40`,
        }}>
          {cfg.label}
        </span>
      </div>

      {/* Divider */}
      <div style={{ height: '1px', background: 'var(--border2)', marginBottom: '20px' }} />

      {/* Detail grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '24px' }}>
        <DetailTile icon="🏷️" label="Service"    value={p.service_category || '—'} />
        <DetailTile icon={methodIcon(p.payment_method)} label="Method" value={p.payment_method || '—'} />
        <DetailTile
          icon="📅" label="Date"
          value={date.toLocaleDateString('en-KE', { day: 'numeric', month: 'long', year: 'numeric' })}
        />
        <DetailTile
          icon="⏰" label="Time"
          value={date.toLocaleTimeString('en-KE', { hour: '2-digit', minute: '2-digit' })}
        />
        {p.payer_phone_number && (
          <DetailTile icon="📱" label="Payer Phone" value={p.payer_phone_number} />
        )}
        {p.transaction_reference && (
          <DetailTile icon="🔑" label="Reference" value={p.transaction_reference} mono />
        )}
      </div>

      {/* View booking CTA */}
      {p.booking_id && (
        <motion.button
          whileHover={{ translateY: -1 }} whileTap={{ scale: 0.98 }}
          onClick={() => navigate(`/customer/bookings/${p.booking_id}`)}
          style={{
            width: '100%', padding: '12px', borderRadius: '10px',
            border: '1px solid var(--border2)', background: 'transparent',
            color: 'var(--white)', fontSize: '14px', fontWeight: '600',
            fontFamily: 'Cabinet Grotesk', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
          }}
        >
          View Booking →
        </motion.button>
      )}
    </div>
  )
}

function DetailTile({ icon, label, value, mono }) {
  return (
    <div style={{
      padding: '13px 14px', borderRadius: '12px',
      background: 'var(--ink)', border: '1px solid var(--border2)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '5px', marginBottom: '6px' }}>
        <span style={{ fontSize: '13px' }}>{icon}</span>
        <span style={{ fontSize: '10px', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '1px', fontFamily: 'DM Mono' }}>
          {label}
        </span>
      </div>
      <div style={{
        fontSize: '13px', fontWeight: '600', color: 'var(--white)',
        fontFamily: mono ? 'DM Mono' : 'inherit',
        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
      }}>
        {value}
      </div>
    </div>
  )
}

// ── Summary card ──────────────────────────────────────────────────────────────

function SummaryCard({ icon, label, value, color, delay }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.4 }}
      style={{
        background: 'var(--ink3)', border: '1px solid var(--border2)',
        borderRadius: '18px', padding: '20px 22px',
      }}
    >
      <div style={{
        width: '40px', height: '40px', borderRadius: '10px', marginBottom: '12px',
        background: `${color}18`, display: 'flex', alignItems: 'center',
        justifyContent: 'center', fontSize: '18px',
      }}>{icon}</div>
      <div style={{ fontSize: '11px', letterSpacing: '1.5px', color: 'var(--muted)', textTransform: 'uppercase', fontFamily: 'DM Mono', marginBottom: '6px' }}>
        {label}
      </div>
      <div style={{ fontFamily: 'Clash Display', fontSize: '24px', fontWeight: '700', color: 'var(--white)' }}>
        {value}
      </div>
    </motion.div>
  )
}

// ── Skeleton ──────────────────────────────────────────────────────────────────

function CompactSkeleton() {
  return (
    <div style={{ padding: '13px 14px', borderBottom: '1px solid var(--border2)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div style={{ height: '13px', width: '100px', borderRadius: '4px', background: 'var(--ink)', marginBottom: '7px' }} />
          <div style={{ height: '10px', width: '70px', borderRadius: '4px', background: 'var(--ink)' }} />
        </div>
        <div>
          <div style={{ height: '13px', width: '60px', borderRadius: '4px', background: 'var(--ink)', marginBottom: '7px' }} />
          <div style={{ height: '10px', width: '50px', borderRadius: '4px', background: 'var(--ink)' }} />
        </div>
      </div>
    </div>
  )
}
