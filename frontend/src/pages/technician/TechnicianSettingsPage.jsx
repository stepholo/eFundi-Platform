import { useState, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import { technicianApi } from '../../api/technicians'
import { authApi } from '../../api/auth'
import useAuthStore from '../../store/authStore'

const SPECS     = ['Electrical', 'Plumbing', 'Carpentry', 'Cleaning', 'Other']
const ORANGE    = '#FF9A3C'
const STATUS_CFG = {
  Verified: { color: '#22C55E', bg: 'rgba(34,197,94,0.1)',   border: 'rgba(34,197,94,0.3)',   label: 'Verified'  },
  Pending:  { color: '#F59E0B', bg: 'rgba(245,158,11,0.1)',  border: 'rgba(245,158,11,0.3)',  label: 'Pending'   },
  Rejected: { color: '#EF4444', bg: 'rgba(239,68,68,0.1)',   border: 'rgba(239,68,68,0.3)',   label: 'Rejected'  },
}

const baseInput = {
  width: '100%', borderRadius: '12px', padding: '13px 16px',
  fontSize: '16px', outline: 'none', fontFamily: 'Cabinet Grotesk',
  background: 'var(--ink3)', border: '1px solid var(--border2)',
  color: 'var(--white)', boxSizing: 'border-box',
}
const focusOn  = (e) => (e.target.style.borderColor = ORANGE)
const focusOff = (e) => (e.target.style.borderColor = 'var(--border2)')

/* ── Shared UI ─────────────────────────────────────────────────────────── */
function SectionCard({ children, delay = 0 }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.4 }}
      style={{ background: 'var(--ink3)', border: '1px solid var(--border2)', borderRadius: '20px', padding: '28px', marginBottom: '20px' }}
    >
      {children}
    </motion.div>
  )
}

function SectionTitle({ children }) {
  return (
    <div style={{ fontSize: '13px', fontWeight: '600', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '1.2px', fontFamily: 'DM Mono', marginBottom: '20px' }}>
      {children}
    </div>
  )
}

function Field({ label, sub, children }) {
  return (
    <div style={{ marginBottom: '20px' }}>
      <label style={{ display: 'block', fontSize: '14px', color: 'var(--muted)', marginBottom: '6px', letterSpacing: '0.4px' }}>
        {label}{sub && <span style={{ marginLeft: '6px', fontSize: '12px', color: 'var(--muted2)' }}>{sub}</span>}
      </label>
      {children}
    </div>
  )
}

function Msg({ msg }) {
  if (!msg) return null
  return (
    <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }}
      style={{
        marginBottom: '16px', padding: '12px 16px', borderRadius: '10px', fontSize: '14px',
        background: msg.type === 'success' ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)',
        border: `1px solid ${msg.type === 'success' ? 'rgba(34,197,94,0.3)' : 'rgba(239,68,68,0.3)'}`,
        color: msg.type === 'success' ? '#22C55E' : '#EF4444',
        whiteSpace: 'pre-line', lineHeight: '1.6',
      }}
    >
      {msg.text}
    </motion.div>
  )
}

function StatusBadge({ status }) {
  const c = STATUS_CFG[status] ?? STATUS_CFG.Pending
  return (
    <span style={{ padding: '3px 10px', borderRadius: '20px', background: c.bg, border: `1px solid ${c.border}`, fontSize: '12px', fontWeight: '700', color: c.color, fontFamily: 'DM Mono' }}>
      {c.label}
    </span>
  )
}

function Stars({ rating }) {
  return <span style={{ color: '#FBBF24', fontSize: '14px' }}>{'★'.repeat(rating)}{'☆'.repeat(5 - rating)}</span>
}

const TECH_STATUS_COLOR = { Verified: '#22C55E', Pending: '#FF6B1A', Rejected: '#EF4444' }

/* ── Specialization card ────────────────────────────────────────────────── */
function SpecCard({ spec, totalCount, userId, onRefresh }) {
  const qc = useQueryClient()
  const certRef = useRef(null)

  const [skillInput, setSkillInput] = useState('')
  const [skills, setSkills]         = useState(spec.skills ?? [])
  const [skillMsg, setSkillMsg]     = useState(null)

  const skillsMutation = useMutation({
    mutationFn: (s) => technicianApi.updateSpecialization(userId, spec.id, { skills: s }),
    onSuccess: () => { qc.invalidateQueries(['tech-profile']); setSkillMsg({ type: 'success', text: 'Skills saved.' }) },
    onError:   () => setSkillMsg({ type: 'error', text: 'Could not save skills.' }),
  })

  const certMutation = useMutation({
    mutationFn: (fd) => technicianApi.updateSpecialization(userId, spec.id, fd),
    onSuccess: () => { qc.invalidateQueries(['tech-profile']); onRefresh?.() },
  })

  const deleteMutation = useMutation({
    mutationFn: () => technicianApi.deleteSpecialization(userId, spec.id),
    onSuccess: () => qc.invalidateQueries(['tech-profile']),
    onError:   (err) => alert(err.response?.data?.detail || 'Delete failed.'),
  })

  const addSkill = () => {
    const v = skillInput.trim()
    if (!v || skills.includes(v)) return
    const next = [...skills, v]
    setSkills(next)
    setSkillInput('')
  }

  const removeSkill = (s) => setSkills(prev => prev.filter(x => x !== s))

  const saveSkills = () => {
    setSkillMsg(null)
    skillsMutation.mutate(skills)
  }

  const handleCert = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    const fd = new FormData()
    fd.append('certificate', file)
    certMutation.mutate(fd)
  }

  const isVerified = spec.verification_status === 'Verified'
  const isRejected = spec.verification_status === 'Rejected'

  return (
    <div style={{
      background: 'var(--ink2)', border: `1.5px solid ${isVerified ? 'rgba(34,197,94,0.25)' : isRejected ? 'rgba(239,68,68,0.25)' : 'var(--border2)'}`,
      borderRadius: '16px', padding: '20px', marginBottom: '14px',
    }}>
      {/* Header row */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontSize: '16px', fontWeight: '700', color: 'var(--white)' }}>{spec.name}</span>
          <StatusBadge status={spec.verification_status} />
        </div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          {/* Certificate upload */}
          <button
            onClick={() => certRef.current?.click()}
            style={{
              padding: '5px 12px', borderRadius: '8px', border: '1px solid var(--border2)',
              background: 'var(--ink3)', color: 'var(--muted)', fontSize: '12px',
              fontWeight: '600', cursor: 'pointer', fontFamily: 'Cabinet Grotesk',
            }}
          >
            {certMutation.isPending ? 'Uploading…' : spec.certificate_url ? '↺ Replace Cert' : '+ Upload Cert'}
          </button>
          <input ref={certRef} type="file" accept=".pdf,.jpg,.jpeg,.png" style={{ display: 'none' }} onChange={handleCert} />

          {/* Delete — only if more than 1 */}
          {totalCount > 1 && (
            <button
              onClick={() => { if (window.confirm(`Remove ${spec.name} specialization?`)) deleteMutation.mutate() }}
              disabled={deleteMutation.isPending}
              style={{
                padding: '5px 10px', borderRadius: '8px', border: '1px solid rgba(239,68,68,0.3)',
                background: 'rgba(239,68,68,0.08)', color: '#EF4444', fontSize: '12px',
                fontWeight: '700', cursor: 'pointer',
              }}
            >
              {deleteMutation.isPending ? '…' : '✕'}
            </button>
          )}
        </div>
      </div>

      {/* Status note */}
      {!isVerified && (
        <div style={{ fontSize: '12px', color: isRejected ? '#EF4444' : '#F59E0B', marginBottom: '12px', lineHeight: '1.5' }}>
          {isRejected
            ? 'This specialization was rejected. Upload a valid certificate and contact support.'
            : 'Pending admin review. You can add skills now, but this specialization will only be visible to customers after verification.'}
        </div>
      )}

      {/* Certificate link */}
      {spec.certificate_url && (
        <a href={spec.certificate_url} target="_blank" rel="noopener noreferrer"
          style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', fontSize: '12px', color: ORANGE, marginBottom: '14px', textDecoration: 'none' }}>
          📄 View Certificate
        </a>
      )}

      {/* Skills */}
      <div style={{ fontSize: '12px', color: 'var(--muted)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '1px', fontFamily: 'DM Mono' }}>
        Skills
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '10px', minHeight: '28px' }}>
        {skills.map(s => (
          <span key={s} style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '3px 10px', borderRadius: '14px', background: 'rgba(255,154,60,0.1)', border: '1px solid rgba(255,154,60,0.25)', fontSize: '13px', color: ORANGE }}>
            {s}
            <button type="button" onClick={() => removeSkill(s)} style={{ background: 'none', border: 'none', color: ORANGE, cursor: 'pointer', padding: 0, lineHeight: 1, fontSize: '14px', fontWeight: '700' }}>×</button>
          </span>
        ))}
        {skills.length === 0 && <span style={{ fontSize: '13px', color: 'var(--muted2)' }}>No skills yet</span>}
      </div>
      <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
        <input
          value={skillInput}
          onChange={e => setSkillInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); addSkill() } }}
          placeholder="e.g. Wiring, Socket installation…"
          style={{ ...baseInput, flex: 1, padding: '9px 13px', fontSize: '14px' }}
          onFocus={focusOn} onBlur={focusOff}
        />
        <button type="button" onClick={addSkill} style={{ padding: '9px 16px', borderRadius: '10px', border: 'none', background: 'rgba(255,154,60,0.15)', color: ORANGE, fontSize: '14px', fontWeight: '700', cursor: 'pointer' }}>
          Add
        </button>
      </div>
      <Msg msg={skillMsg} />
      <button type="button" onClick={saveSkills} disabled={skillsMutation.isPending} style={{ padding: '8px 18px', borderRadius: '8px', border: 'none', background: ORANGE, color: '#0F172A', fontSize: '14px', fontWeight: '700', cursor: 'pointer', opacity: skillsMutation.isPending ? 0.6 : 1 }}>
        {skillsMutation.isPending ? 'Saving…' : 'Save Skills'}
      </button>
    </div>
  )
}

/* ── Main page ──────────────────────────────────────────────────────────── */
export default function TechnicianSettingsPage() {
  const { user } = useAuthStore()
  const qc = useQueryClient()
  const fileInputRef = useRef(null)

  const { data: profile } = useQuery({
    queryKey: ['tech-profile', user?.user_id],
    queryFn:  () => technicianApi.getProfile(user.user_id).then(r => r.data),
    enabled:  !!user?.user_id,
  })

  const { data: reviews = [] } = useQuery({
    queryKey: ['tech-reviews', user?.user_id],
    queryFn:  () => technicianApi.getReviews(user.user_id).then(r => r.data),
    enabled:  !!user?.user_id,
  })

  /* ── Local state ─────────────────────────────────────────────────────── */
  const [profForm, setProfForm]     = useState(null)
  const [profMsg,  setProfMsg]      = useState(null)
  const [pwForm,   setPwForm]       = useState({ password: '', password2: '' })
  const [pwMsg,    setPwMsg]        = useState(null)
  const [avatarMsg, setAvatarMsg]   = useState(null)
  const [avatarPreview, setAvatarPreview] = useState(null)

  /* Add-specialization UI */
  const [addingSpec, setAddingSpec]   = useState(false)
  const [newSpecName, setNewSpecName] = useState('')
  const [addSpecMsg, setAddSpecMsg]   = useState(null)

  const form = profForm ?? {
    first_name:          profile?.first_name          ?? '',
    last_name:           profile?.last_name           ?? '',
    phone_number:        profile?.phone_number        ?? '',
    bio:                 profile?.bio                 ?? '',
    years_of_experience: profile?.years_of_experience ?? 0,
  }

  const specializations = profile?.specializations ?? []
  const takenNames = specializations.map(s => s.name)

  /* ── Mutations ───────────────────────────────────────────────────────── */
  const profMutation = useMutation({
    mutationFn: (data) => technicianApi.updateProfile(user.user_id, data),
    onSuccess: () => { qc.invalidateQueries(['tech-profile']); setProfMsg({ type: 'success', text: 'Profile updated.' }) },
    onError: (err) => {
      const d = err.response?.data
      const lines = d && typeof d === 'object' ? Object.entries(d).map(([k, v]) => `${k}: ${Array.isArray(v) ? v[0] : v}`) : ['Update failed.']
      setProfMsg({ type: 'error', text: lines.join('\n') })
    },
  })

  const avatarMutation = useMutation({
    mutationFn: (fd) => authApi.updateUser(user.user_id, fd),
    onSuccess: () => { qc.invalidateQueries(['tech-profile']); setAvatarMsg({ type: 'success', text: 'Photo updated.' }); setAvatarPreview(null) },
    onError: () => setAvatarMsg({ type: 'error', text: 'Photo upload failed.' }),
  })

  const addSpecMutation = useMutation({
    mutationFn: (data) => technicianApi.addSpecialization(user.user_id, data),
    onSuccess: () => {
      qc.invalidateQueries(['tech-profile'])
      setAddingSpec(false); setNewSpecName(''); setAddSpecMsg(null)
    },
    onError: (err) => {
      const d = err.response?.data
      const msg = d?.name?.[0] || d?.detail || 'Could not add specialization.'
      setAddSpecMsg({ type: 'error', text: msg })
    },
  })

  const pwMutation = useMutation({
    mutationFn: (data) => authApi.updateUser(user.user_id, data),
    onSuccess: () => { setPwForm({ password: '', password2: '' }); setPwMsg({ type: 'success', text: 'Password changed.' }) },
    onError: (err) => {
      const d = err.response?.data
      setPwMsg({ type: 'error', text: d ? Object.values(d).flat()[0] : 'Password change failed.' })
    },
  })

  /* ── Handlers ────────────────────────────────────────────────────────── */
  const submitProfile = (e) => { e.preventDefault(); setProfMsg(null); profMutation.mutate(form) }

  const submitPw = (e) => {
    e.preventDefault(); setPwMsg(null)
    if (pwForm.password !== pwForm.password2) { setPwMsg({ type: 'error', text: 'Passwords do not match.' }); return }
    if (pwForm.password.length < 8) { setPwMsg({ type: 'error', text: 'Password must be at least 8 characters.' }); return }
    pwMutation.mutate({ password: pwForm.password, password2: pwForm.password2 })
  }

  const handleAvatarSelect = (e) => {
    const file = e.target.files?.[0]; if (!file) return
    setAvatarPreview(URL.createObjectURL(file)); setAvatarMsg(null)
    const fd = new FormData(); fd.append('profile_picture', file)
    avatarMutation.mutate(fd)
  }

  const submitAddSpec = (e) => {
    e.preventDefault(); setAddSpecMsg(null)
    if (!newSpecName) { setAddSpecMsg({ type: 'error', text: 'Pick a specialization.' }); return }
    addSpecMutation.mutate({ name: newSpecName, skills: [] })
  }

  /* ── Display values ──────────────────────────────────────────────────── */
  const initials  = user ? `${user.first_name?.[0] ?? ''}${user.last_name?.[0] ?? ''}`.toUpperCase() || '?' : '?'
  const verStatus = profile?.verification_status ?? 'Pending'
  const avatarSrc = avatarPreview || profile?.profile_picture || null

  return (
    <div>
      {/* Header */}
      <div style={{ height: '60px', background: 'var(--ink2)', borderBottom: '1px solid var(--border2)', display: 'flex', alignItems: 'center', padding: '0 32px', position: 'sticky', top: 0, zIndex: 100 }}>
        <span style={{ fontFamily: 'Clash Display', fontSize: '17px', fontWeight: '600', color: 'var(--white)' }}>Profile & Settings</span>
      </div>

      <div style={{ padding: '32px 32px 60px', maxWidth: '720px', margin: '0 auto' }}>

        {/* ── Identity card ─────────────────────────────────────────────── */}
        <SectionCard delay={0}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '24px', flexWrap: 'wrap' }}>
            <div style={{ position: 'relative', flexShrink: 0 }}>
              <div onClick={() => fileInputRef.current?.click()} style={{ width: '80px', height: '80px', borderRadius: '50%', background: avatarSrc ? 'transparent' : ORANGE, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', cursor: 'pointer', border: `3px solid ${ORANGE}`, position: 'relative' }}>
                {avatarSrc
                  ? <img src={avatarSrc} alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  : <span style={{ fontSize: '26px', fontWeight: '700', color: '#0F172A' }}>{initials}</span>}
                <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0, transition: 'opacity 0.2s', fontSize: '10px', color: '#fff', fontFamily: 'DM Mono', letterSpacing: '1px' }}
                  onMouseEnter={e => (e.currentTarget.style.opacity = '1')} onMouseLeave={e => (e.currentTarget.style.opacity = '0')}>
                  CHANGE
                </div>
              </div>
              <input ref={fileInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleAvatarSelect} />
            </div>

            <div style={{ flex: 1 }}>
              <div style={{ fontFamily: 'Clash Display', fontSize: '20px', fontWeight: '700', color: 'var(--white)', marginBottom: '4px' }}>{user?.first_name} {user?.last_name}</div>
              <div style={{ fontSize: '13px', color: 'var(--muted)', marginBottom: '10px' }}>
                {specializations.filter(s => s.verification_status === 'Verified').map(s => s.name).join(' · ') || 'No verified specializations yet'}
              </div>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                <span style={{ padding: '3px 10px', borderRadius: '20px', background: 'rgba(255,154,60,0.15)', border: '1px solid rgba(255,154,60,0.3)', fontSize: '12px', fontWeight: '600', color: ORANGE, fontFamily: 'DM Mono' }}>TECHNICIAN</span>
                <span style={{ padding: '3px 10px', borderRadius: '20px', background: `${TECH_STATUS_COLOR[verStatus]}18`, border: `1px solid ${TECH_STATUS_COLOR[verStatus]}33`, fontSize: '12px', fontWeight: '600', color: TECH_STATUS_COLOR[verStatus], fontFamily: 'DM Mono' }}>{verStatus.toUpperCase()}</span>
              </div>
              {avatarMsg && <div style={{ marginTop: '8px', fontSize: '13px', color: avatarMsg.type === 'success' ? '#22C55E' : '#EF4444' }}>{avatarMsg.text}</div>}
              <div style={{ marginTop: '6px', fontSize: '12px', color: 'var(--muted2)' }}>Click your photo to update it</div>
            </div>
          </div>
        </SectionCard>

        {/* ── Personal Info ──────────────────────────────────────────────── */}
        <SectionCard delay={0.06}>
          <SectionTitle>Personal Info</SectionTitle>
          <Msg msg={profMsg} />
          <form onSubmit={submitProfile}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
              <Field label="First Name">
                <input value={form.first_name} onChange={e => setProfForm(f => ({ ...form, ...f, first_name: e.target.value }))} required style={baseInput} onFocus={focusOn} onBlur={focusOff} />
              </Field>
              <Field label="Last Name">
                <input value={form.last_name} onChange={e => setProfForm(f => ({ ...form, ...f, last_name: e.target.value }))} required style={baseInput} onFocus={focusOn} onBlur={focusOff} />
              </Field>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
              <Field label="Phone Number">
                <input type="tel" value={form.phone_number} onChange={e => setProfForm(f => ({ ...form, ...f, phone_number: e.target.value }))} required style={baseInput} onFocus={focusOn} onBlur={focusOff} />
              </Field>
              <Field label="Years of Experience">
                <input type="number" min="0" value={form.years_of_experience} onChange={e => setProfForm(f => ({ ...form, ...f, years_of_experience: parseInt(e.target.value) || 0 }))} style={baseInput} onFocus={focusOn} onBlur={focusOff} />
              </Field>
            </div>
            <Field label="Bio" sub="(optional)">
              <textarea value={form.bio} onChange={e => setProfForm(f => ({ ...form, ...f, bio: e.target.value }))} rows={3} placeholder="Tell customers about your experience…" style={{ ...baseInput, resize: 'vertical', lineHeight: '1.6' }} onFocus={focusOn} onBlur={focusOff} />
            </Field>
            <motion.button type="submit" disabled={profMutation.isPending} whileHover={{ translateY: -1 }} whileTap={{ scale: 0.98 }} style={{ padding: '13px 28px', borderRadius: '10px', border: 'none', background: ORANGE, color: '#0F172A', fontSize: '16px', fontWeight: '700', fontFamily: 'Cabinet Grotesk', cursor: profMutation.isPending ? 'not-allowed' : 'pointer', opacity: profMutation.isPending ? 0.6 : 1 }}>
              {profMutation.isPending ? 'Saving…' : 'Save Changes'}
            </motion.button>
          </form>
        </SectionCard>

        {/* ── Specializations ────────────────────────────────────────────── */}
        <SectionCard delay={0.10}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
            <SectionTitle>Specializations & Skills</SectionTitle>
            <button
              onClick={() => { setAddingSpec(v => !v); setAddSpecMsg(null); setNewSpecName('') }}
              style={{ padding: '7px 16px', borderRadius: '8px', border: `1px solid ${ORANGE}`, background: 'rgba(255,154,60,0.12)', color: ORANGE, fontSize: '13px', fontWeight: '700', cursor: 'pointer', marginTop: '-14px' }}
            >
              {addingSpec ? '✕ Cancel' : '+ Add Specialization'}
            </button>
          </div>

          <div style={{ fontSize: '13px', color: 'var(--muted2)', marginBottom: '18px', lineHeight: '1.6' }}>
            Each specialization goes through admin verification before it becomes visible to customers.
            You can add skills now while awaiting verification.
            If your trade isn't listed, choose <strong style={{ color: 'var(--muted)' }}>Other</strong>.
          </div>

          {/* Add-spec form */}
          <AnimatePresence>
            {addingSpec && (
              <motion.form
                initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                style={{ overflow: 'hidden', marginBottom: '16px' }}
                onSubmit={submitAddSpec}
              >
                <div style={{ background: 'var(--ink)', border: '1px solid var(--border2)', borderRadius: '14px', padding: '18px', marginBottom: '4px' }}>
                  <div style={{ fontSize: '14px', color: 'var(--muted)', marginBottom: '10px' }}>Select specialization to add:</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '14px' }}>
                    {SPECS.filter(s => !takenNames.includes(s)).map(s => (
                      <button key={s} type="button" onClick={() => setNewSpecName(s)} style={{ padding: '8px 16px', borderRadius: '20px', border: `1.5px solid ${newSpecName === s ? ORANGE : 'var(--border2)'}`, background: newSpecName === s ? 'rgba(255,154,60,0.15)' : 'transparent', color: newSpecName === s ? ORANGE : 'var(--muted)', fontSize: '14px', fontWeight: newSpecName === s ? '700' : '400', cursor: 'pointer', transition: 'all 0.15s' }}>
                        {s}
                      </button>
                    ))}
                    {SPECS.filter(s => !takenNames.includes(s)).length === 0 && (
                      <span style={{ fontSize: '13px', color: 'var(--muted2)' }}>You've added all available specializations.</span>
                    )}
                  </div>
                  <Msg msg={addSpecMsg} />
                  <button type="submit" disabled={addSpecMutation.isPending || !newSpecName} style={{ padding: '10px 22px', borderRadius: '10px', border: 'none', background: ORANGE, color: '#0F172A', fontSize: '14px', fontWeight: '700', cursor: (!newSpecName || addSpecMutation.isPending) ? 'not-allowed' : 'pointer', opacity: (!newSpecName || addSpecMutation.isPending) ? 0.5 : 1 }}>
                    {addSpecMutation.isPending ? 'Adding…' : 'Add & Submit for Verification'}
                  </button>
                </div>
              </motion.form>
            )}
          </AnimatePresence>

          {/* Existing spec cards */}
          {specializations.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '28px 0', color: 'var(--muted)' }}>
              <div style={{ fontSize: '28px', marginBottom: '8px' }}>🔧</div>
              <div style={{ fontSize: '14px' }}>No specializations yet. Add one above.</div>
            </div>
          ) : (
            specializations.map(spec => (
              <SpecCard key={spec.id} spec={spec} totalCount={specializations.length} userId={user.user_id} onRefresh={() => qc.invalidateQueries(['tech-profile'])} />
            ))
          )}
        </SectionCard>

        {/* ── Testimonials ──────────────────────────────────────────────── */}
        <SectionCard delay={0.14}>
          <SectionTitle>Testimonials ({reviews.length})</SectionTitle>
          {reviews.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '32px 0', color: 'var(--muted)' }}>
              <div style={{ fontSize: '32px', marginBottom: '10px' }}>💬</div>
              <div style={{ fontSize: '14px' }}>No reviews yet. Complete jobs to earn testimonials.</div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {reviews.map(r => (
                <div key={r.id} style={{ padding: '16px', borderRadius: '14px', background: 'var(--ink2)', border: '1px solid var(--border2)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <div>
                      <div style={{ fontSize: '14px', fontWeight: '600', color: 'var(--white)', marginBottom: '2px' }}>{r.customer_name}</div>
                      <Stars rating={r.rating} />
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--muted)', fontFamily: 'DM Mono', textAlign: 'right' }}>
                      <div>{r.service_category || '—'}</div>
                      <div>{new Date(r.created_at).toLocaleDateString('en-KE', { day: 'numeric', month: 'short', year: 'numeric' })}</div>
                    </div>
                  </div>
                  {r.comment && <p style={{ fontSize: '13px', color: 'var(--muted)', lineHeight: '1.6', margin: 0 }}>"{r.comment}"</p>}
                </div>
              ))}
            </div>
          )}
        </SectionCard>

        {/* ── Change Password ────────────────────────────────────────────── */}
        <SectionCard delay={0.18}>
          <SectionTitle>Change Password</SectionTitle>
          <Msg msg={pwMsg} />
          <form onSubmit={submitPw}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '24px' }}>
              <Field label="New Password">
                <input type="password" value={pwForm.password} onChange={e => setPwForm(f => ({ ...f, password: e.target.value }))} placeholder="••••••••" required style={baseInput} onFocus={focusOn} onBlur={focusOff} />
              </Field>
              <Field label="Confirm Password">
                <input type="password" value={pwForm.password2} onChange={e => setPwForm(f => ({ ...f, password2: e.target.value }))} placeholder="••••••••" required style={baseInput} onFocus={focusOn} onBlur={focusOff} />
              </Field>
            </div>
            <motion.button type="submit" disabled={pwMutation.isPending} whileHover={{ translateY: -1 }} whileTap={{ scale: 0.98 }} style={{ padding: '13px 28px', borderRadius: '10px', background: 'var(--ink)', color: 'var(--white)', border: '1px solid var(--border2)', fontSize: '16px', fontWeight: '700', fontFamily: 'Cabinet Grotesk', cursor: pwMutation.isPending ? 'not-allowed' : 'pointer', opacity: pwMutation.isPending ? 0.6 : 1 }}>
              {pwMutation.isPending ? 'Changing…' : 'Change Password'}
            </motion.button>
          </form>
        </SectionCard>

        {/* ── Account Info ───────────────────────────────────────────────── */}
        <SectionCard delay={0.22}>
          <SectionTitle>Account Info</SectionTitle>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <InfoRow label="Account ID"   value={user?.user_id?.slice(-12) || '—'} mono />
            <InfoRow label="Verification" value={verStatus} color={TECH_STATUS_COLOR[verStatus]} />
            <InfoRow label="Availability" value={profile?.is_available ? 'Online' : 'Offline'} />
            <InfoRow label="Member Since" value={profile?.created_at ? new Date(profile.created_at).toLocaleDateString('en-KE', { month: 'short', year: 'numeric' }) : '—'} />
          </div>
        </SectionCard>
      </div>
    </div>
  )
}

function InfoRow({ label, value, mono, color }) {
  return (
    <div>
      <div style={{ fontSize: '12px', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '1px', fontFamily: 'DM Mono', marginBottom: '6px' }}>{label}</div>
      <div style={{ fontSize: '15px', fontWeight: '600', color: color || 'var(--white)', fontFamily: mono ? 'DM Mono' : 'Cabinet Grotesk' }}>{value}</div>
    </div>
  )
}
