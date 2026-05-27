import { useState, useCallback } from 'react'
import { useQuery } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import { bookingsApi } from '../../api/bookings'
import { reviewsApi } from '../../api/reviews'

const RADII = [
  { label: '2 km',  value: 2  },
  { label: '5 km',  value: 5  },
  { label: '10 km', value: 10 },
  { label: '20 km', value: 20 },
]

function initials(first, last) {
  return `${first?.[0] ?? ''}${last?.[0] ?? ''}`.toUpperCase() || '?'
}

function lastSeen(updatedAt) {
  const diff = Math.floor((Date.now() - new Date(updatedAt)) / 1000)
  if (diff < 60)   return `${diff}s ago`
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  return `${Math.floor(diff / 3600)}h ago`
}

function distLabel(km) {
  return km < 1 ? `${Math.round(km * 1000)} m` : `${km.toFixed(1)} km`
}

function StarRating({ rating, size = 14 }) {
  return (
    <span style={{ display: 'inline-flex', gap: '1px' }}>
      {[1, 2, 3, 4, 5].map(i => (
        <span key={i} style={{ fontSize: `${size}px`, color: i <= rating ? '#F59E0B' : '#CBD5E1' }}>★</span>
      ))}
    </span>
  )
}

function avgRating(reviews) {
  if (!reviews?.length) return null
  return (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1)
}

export default function NearbyTechniciansPage() {
  const [coords, setCoords]         = useState(null)
  const [radius, setRadius]         = useState(5)
  const [locError, setLocError]     = useState('')
  const [detecting, setDetecting]   = useState(false)
  const [selectedId, setSelectedId] = useState(null)

  const detect = useCallback(() => {
    if (!navigator.geolocation) { setLocError('Geolocation is not supported by this browser.'); return }
    setDetecting(true); setLocError('')
    navigator.geolocation.getCurrentPosition(
      (pos) => { setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude }); setDetecting(false) },
      () => { setLocError('Could not get your location. Please allow location access.'); setDetecting(false) },
      { timeout: 10_000, enableHighAccuracy: true },
    )
  }, [])

  const { data: technicians = [], isLoading, isFetching, refetch } = useQuery({
    queryKey: ['nearby-technicians', coords?.lat, coords?.lng, radius],
    queryFn:  () => bookingsApi.nearbyTechnicians(coords.lat, coords.lng, radius).then(r => r.data),
    enabled:  !!coords,
    staleTime: 60_000,
    onSuccess: (data) => {
      // auto-select first tech with verified specializations
      const first = data.find(t => t.verified_specializations?.length > 0)
      if (first && !selectedId) setSelectedId(first.id)
    },
  })

  // Only show technicians who have at least one verified specialization
  const verified = technicians.filter(t => t.verified_specializations?.length > 0)
  const online   = verified.filter(t => t.is_online)
  const sorted   = [...online, ...verified.filter(t => !t.is_online)]

  const selectedTech = sorted.find(t => t.id === selectedId) || null

  // Use user_uuid for review lookup (fixes the original technician_id vs TechnicianLocation.id bug)
  const { data: reviews = [], isLoading: reviewsLoading } = useQuery({
    queryKey: ['tech-reviews-nearby', selectedTech?.user_uuid],
    queryFn:  () => reviewsApi.listByTechnicianUuid(selectedTech.user_uuid).then(r => r.data),
    enabled:  !!selectedTech?.user_uuid,
    staleTime: 120_000,
  })

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>

      {/* Topbar */}
      <div style={{ height: '60px', background: 'var(--ink2)', borderBottom: '1px solid var(--border2)', display: 'flex', alignItems: 'center', padding: '0 28px', gap: '16px', flexShrink: 0, position: 'sticky', top: 0, zIndex: 100 }}>
        <span style={{ fontFamily: 'Clash Display', fontSize: '17px', fontWeight: '600', color: 'var(--white)' }}>Nearby Technicians</span>
        <div style={{ flex: 1 }} />
        {coords && (
          <motion.button whileTap={{ scale: 0.97 }} onClick={() => refetch()} disabled={isFetching}
            style={{ background: 'none', border: '1px solid var(--border2)', borderRadius: '8px', color: 'var(--muted)', fontSize: '13px', fontWeight: '600', cursor: 'pointer', padding: '6px 14px', opacity: isFetching ? 0.5 : 1 }}>
            {isFetching ? 'Refreshing…' : '↻ Refresh'}
          </motion.button>
        )}
      </div>

      {/* Two-column body */}
      <div style={{ display: 'flex', flex: 1, minHeight: 0 }}>

        {/* ── Left panel ─────────────────────────────────────────────── */}
        <div style={{ width: '42%', flexShrink: 0, borderRight: '1px solid var(--border2)', overflowY: 'auto', padding: '20px 16px', background: 'var(--ink)', display: 'flex', flexDirection: 'column', gap: '16px' }}>

          {/* Location + radius controls */}
          <div style={{ background: 'var(--ink3)', border: '1px solid var(--border2)', borderRadius: '16px', padding: '16px' }}>
            <div style={{ marginBottom: '14px' }}>
              <div style={{ fontSize: '11px', color: 'var(--muted)', letterSpacing: '1.2px', textTransform: 'uppercase', fontFamily: 'DM Mono', marginBottom: '8px' }}>Your Location</div>
              {coords ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '5px 12px', borderRadius: '20px', background: '#FFF7ED', border: '1px solid #FED7AA' }}>
                    <span style={{ fontSize: '13px' }}>📍</span>
                    <span style={{ fontSize: '13px', fontWeight: '600', color: 'var(--volt)', fontFamily: 'DM Mono' }}>{coords.lat.toFixed(4)}, {coords.lng.toFixed(4)}</span>
                  </div>
                  <button onClick={detect} style={{ background: 'none', border: 'none', color: 'var(--muted)', fontSize: '13px', cursor: 'pointer', textDecoration: 'underline' }}>Update</button>
                </div>
              ) : (
                <div>
                  {locError && <div style={{ fontSize: '12px', color: 'var(--red)', marginBottom: '8px', lineHeight: '1.5' }}>{locError}</div>}
                  <motion.button whileTap={{ scale: 0.97 }} onClick={detect} disabled={detecting}
                    style={{ padding: '9px 18px', borderRadius: '8px', border: 'none', background: 'var(--volt)', color: '#FFFFFF', fontSize: '13px', fontWeight: '700', cursor: detecting ? 'not-allowed' : 'pointer', opacity: detecting ? 0.7 : 1 }}>
                    {detecting ? 'Detecting…' : '📍 Detect My Location'}
                  </motion.button>
                </div>
              )}
            </div>
            <div>
              <div style={{ fontSize: '11px', color: 'var(--muted)', letterSpacing: '1.2px', textTransform: 'uppercase', fontFamily: 'DM Mono', marginBottom: '8px' }}>Search Radius</div>
              <div style={{ display: 'flex', gap: '6px' }}>
                {RADII.map(r => (
                  <button key={r.value} onClick={() => setRadius(r.value)} style={{ padding: '5px 12px', borderRadius: '20px', border: 'none', cursor: 'pointer', fontSize: '12px', fontWeight: '600', background: radius === r.value ? 'var(--volt)' : 'var(--ink)', color: radius === r.value ? '#FFFFFF' : 'var(--muted)', transition: 'all 0.15s' }}>
                    {r.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Tech list */}
          <AnimatePresence mode="wait">
            {!coords ? (
              <motion.div key="prompt" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={{ textAlign: 'center', padding: '48px 16px', color: 'var(--muted)' }}>
                <div style={{ fontSize: '40px', marginBottom: '10px' }}>📍</div>
                <div style={{ fontSize: '14px', fontWeight: '600', color: 'var(--white)', marginBottom: '4px' }}>Share your location</div>
                <div style={{ fontSize: '13px' }}>to find nearby technicians</div>
              </motion.div>
            ) : isLoading ? (
              <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {[0,1,2,3].map(i => <SkeletonRow key={i} />)}
              </motion.div>
            ) : sorted.length === 0 ? (
              <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={{ textAlign: 'center', padding: '40px 16px', color: 'var(--muted)' }}>
                <div style={{ fontSize: '36px', marginBottom: '10px' }}>🔍</div>
                <div style={{ fontSize: '14px', fontWeight: '600', color: 'var(--white)', marginBottom: '4px' }}>No verified technicians within {radius} km</div>
                {radius < 20 && (
                  <button onClick={() => setRadius(r => Math.min(r * 2, 20))} style={{ marginTop: '12px', padding: '8px 16px', borderRadius: '8px', border: 'none', background: 'var(--volt)', color: '#FFFFFF', fontSize: '13px', fontWeight: '700', cursor: 'pointer' }}>
                    Expand to {Math.min(radius * 2, 20)} km →
                  </button>
                )}
              </motion.div>
            ) : (
              <motion.div key="list" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <div style={{ fontSize: '13px', color: 'var(--muted)', marginBottom: '10px' }}>
                  <span style={{ color: 'var(--white)', fontWeight: '600' }}>{sorted.length}</span> verified ·{' '}
                  <span style={{ color: '#22C55E', fontWeight: '600' }}>{online.length} online</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {sorted.map((tech, i) => (
                    <CompactTechRow key={tech.id} tech={tech} index={i} isSelected={tech.id === selectedId} onClick={() => setSelectedId(tech.id)} />
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* ── Right panel ─────────────────────────────────────────────── */}
        <div style={{ flex: 1, overflowY: 'auto', background: 'var(--ink)', position: 'relative' }}>
          <AnimatePresence mode="wait">
            {!selectedTech ? (
              <motion.div key="placeholder" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--muted)' }}>
                <div style={{ fontSize: '52px', marginBottom: '14px' }}>👷</div>
                <div style={{ fontSize: '15px', fontWeight: '600', color: 'var(--white)', marginBottom: '6px' }}>Select a technician</div>
                <div style={{ fontSize: '13px' }}>Detect your location to see who's nearby</div>
              </motion.div>
            ) : (
              <motion.div key={selectedTech.id} initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -40 }} transition={{ duration: 0.25, ease: 'easeOut' }} style={{ padding: '24px 28px 60px' }}>
                <TechDetailPanel tech={selectedTech} reviews={reviews} reviewsLoading={reviewsLoading} />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  )
}

/* ── Compact list row ──────────────────────────────────────────────────── */
function CompactTechRow({ tech, index, isSelected, onClick }) {
  const inits    = initials(tech.first_name, tech.last_name)
  const specNames = tech.verified_specializations?.map(s => s.name).join(', ') || tech.specialization

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.04 }}
      onClick={onClick}
      style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 14px', borderRadius: '14px', cursor: 'pointer', background: isSelected ? 'rgba(232,80,26,0.07)' : 'var(--ink3)', border: `1.5px solid ${isSelected ? 'var(--volt)' : 'var(--border2)'}`, transition: 'all 0.15s' }}
    >
      <div style={{ position: 'relative', flexShrink: 0 }}>
        {tech.profile_picture ? (
          <img src={tech.profile_picture} alt="" style={{ width: '42px', height: '42px', borderRadius: '12px', objectFit: 'cover', border: `1.5px solid ${tech.is_online ? 'rgba(22,163,74,0.3)' : 'var(--border2)'}` }} />
        ) : (
          <div style={{ width: '42px', height: '42px', borderRadius: '12px', background: tech.is_online ? '#F0FDF4' : 'var(--ink)', border: `1.5px solid ${tech.is_online ? 'rgba(22,163,74,0.3)' : 'var(--border2)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', fontWeight: '700', color: tech.is_online ? '#16A34A' : 'var(--muted)' }}>{inits}</div>
        )}
        <div style={{ position: 'absolute', bottom: '-2px', right: '-2px', width: '11px', height: '11px', borderRadius: '50%', background: tech.is_online ? '#22C55E' : 'var(--muted2)', border: '2px solid var(--ink3)' }} />
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: '14px', fontWeight: '700', color: 'var(--white)', marginBottom: '2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{tech.first_name} {tech.last_name}</div>
        <div style={{ fontSize: '12px', color: 'var(--volt)', fontWeight: '600', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{specNames}</div>
      </div>

      <div style={{ textAlign: 'right', flexShrink: 0 }}>
        <div style={{ fontSize: '13px', fontWeight: '700', color: 'var(--white)', fontFamily: 'DM Mono' }}>{distLabel(tech.distance_km)}</div>
        <div style={{ fontSize: '11px', color: tech.is_online ? '#22C55E' : 'var(--muted)' }}>{tech.is_online ? 'Online' : 'Offline'}</div>
      </div>
    </motion.div>
  )
}

/* ── Full detail panel ─────────────────────────────────────────────────── */
function TechDetailPanel({ tech, reviews, reviewsLoading }) {
  const inits = initials(tech.first_name, tech.last_name)
  const avg   = avgRating(reviews)
  const verSpecs = tech.verified_specializations ?? []
  const hasCerts = verSpecs.some(s => s.certificate_url)

  return (
    <div>
      {/* Profile header */}
      <div style={{ background: 'var(--ink3)', border: `1px solid ${tech.is_online ? 'rgba(34,197,94,0.2)' : 'var(--border2)'}`, borderRadius: '20px', padding: '24px', marginBottom: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '18px', marginBottom: '20px' }}>
          <div style={{ position: 'relative', flexShrink: 0 }}>
            {tech.profile_picture ? (
              <img src={tech.profile_picture} alt="" style={{ width: '72px', height: '72px', borderRadius: '18px', objectFit: 'cover', border: `2px solid ${tech.is_online ? 'rgba(22,163,74,0.3)' : 'var(--border2)'}` }} />
            ) : (
              <div style={{ width: '72px', height: '72px', borderRadius: '18px', background: tech.is_online ? '#F0FDF4' : 'var(--ink)', border: `2px solid ${tech.is_online ? 'rgba(22,163,74,0.3)' : 'var(--border2)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px', fontWeight: '700', color: tech.is_online ? '#16A34A' : 'var(--muted)' }}>{inits}</div>
            )}
            <div style={{ position: 'absolute', bottom: '-2px', right: '-2px', width: '16px', height: '16px', borderRadius: '50%', background: tech.is_online ? '#22C55E' : 'var(--muted2)', border: '3px solid var(--ink3)' }} />
          </div>

          <div style={{ flex: 1 }}>
            <div style={{ fontFamily: 'Clash Display', fontSize: '22px', fontWeight: '700', color: 'var(--white)', marginBottom: '4px' }}>{tech.first_name} {tech.last_name}</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '8px' }}>
              {verSpecs.map(s => (
                <span key={s.name} style={{ padding: '2px 10px', borderRadius: '20px', background: 'rgba(232,80,26,0.1)', border: '1px solid rgba(232,80,26,0.2)', fontSize: '12px', fontWeight: '600', color: 'var(--volt)' }}>{s.name}</span>
              ))}
            </div>
            {avg && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <StarRating rating={Math.round(Number(avg))} size={15} />
                <span style={{ fontSize: '14px', fontWeight: '700', color: '#F59E0B' }}>{avg}</span>
                <span style={{ fontSize: '13px', color: 'var(--muted)' }}>({reviews.length} review{reviews.length !== 1 ? 's' : ''})</span>
              </div>
            )}
          </div>
        </div>

        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
          <StatChip label="Distance" value={distLabel(tech.distance_km)} />
          <StatChip label="Status" value={tech.is_online ? 'Online' : 'Offline'} valueColor={tech.is_online ? '#22C55E' : 'var(--muted)'} sub={tech.is_online ? 'Available now' : lastSeen(tech.updated_at)} />
          <StatChip label="Experience" value={tech.years_of_experience > 0 ? `${tech.years_of_experience} yr${tech.years_of_experience !== 1 ? 's' : ''}` : 'New'} />
        </div>

        {/* View-only notice */}
        <div style={{ marginTop: '16px', padding: '10px 14px', borderRadius: '10px', background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border2)', fontSize: '13px', color: 'var(--muted)', textAlign: 'center' }}>
          Browse this technician's profile. To book, go to <strong style={{ color: 'var(--white)' }}>Book a Service</strong> and post a job request.
        </div>
      </div>

      {/* Specializations & Skills */}
      {verSpecs.length > 0 && (
        <div style={{ background: 'var(--ink3)', border: '1px solid var(--border2)', borderRadius: '20px', padding: '20px', marginBottom: '16px' }}>
          <div style={{ fontFamily: 'Clash Display', fontSize: '16px', fontWeight: '700', color: 'var(--white)', marginBottom: '16px' }}>
            Verified Skills
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {verSpecs.map(s => (
              <div key={s.name}>
                <div style={{ fontSize: '14px', fontWeight: '700', color: 'var(--white)', marginBottom: '6px' }}>
                  {s.name}
                  <span style={{ marginLeft: '8px', fontSize: '11px', fontWeight: '600', color: '#22C55E', fontFamily: 'DM Mono' }}>✓ VERIFIED</span>
                </div>
                {s.skills?.length > 0 ? (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px' }}>
                    {s.skills.map(skill => (
                      <span key={skill} style={{ padding: '3px 10px', borderRadius: '12px', background: 'var(--ink)', border: '1px solid var(--border2)', fontSize: '12px', color: 'var(--muted)' }}>{skill}</span>
                    ))}
                  </div>
                ) : (
                  <span style={{ fontSize: '12px', color: 'var(--muted2)' }}>No specific skills listed</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Certifications */}
      {hasCerts && (
        <div style={{ background: 'var(--ink3)', border: '1px solid var(--border2)', borderRadius: '20px', padding: '20px', marginBottom: '16px' }}>
          <div style={{ fontFamily: 'Clash Display', fontSize: '16px', fontWeight: '700', color: 'var(--white)', marginBottom: '14px' }}>
            Certifications
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {verSpecs.filter(s => s.certificate_url).map(s => (
              <a key={s.name} href={s.certificate_url} target="_blank" rel="noopener noreferrer"
                style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '12px 14px', borderRadius: '12px', background: 'var(--ink)', border: '1px solid var(--border2)', textDecoration: 'none', color: 'var(--white)' }}>
                <span style={{ fontSize: '22px' }}>📄</span>
                <div>
                  <div style={{ fontSize: '14px', fontWeight: '600' }}>{s.name} Certificate</div>
                  <div style={{ fontSize: '12px', color: '#22C55E', fontFamily: 'DM Mono' }}>✓ Verified — Click to view</div>
                </div>
              </a>
            ))}
          </div>
        </div>
      )}

      {/* Reviews */}
      <div style={{ background: 'var(--ink3)', border: '1px solid var(--border2)', borderRadius: '20px', padding: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
          <div style={{ fontFamily: 'Clash Display', fontSize: '16px', fontWeight: '700', color: 'var(--white)' }}>Reviews</div>
          {reviews.length > 0 && avg && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <StarRating rating={Math.round(Number(avg))} size={14} />
              <span style={{ fontSize: '14px', fontWeight: '700', color: '#F59E0B' }}>{avg}</span>
              <span style={{ fontSize: '12px', color: 'var(--muted)' }}>/ 5</span>
            </div>
          )}
        </div>

        {reviewsLoading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {[0,1,2].map(i => <ReviewSkeleton key={i} />)}
          </div>
        ) : reviews.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '32px 0', color: 'var(--muted)' }}>
            <div style={{ fontSize: '32px', marginBottom: '10px' }}>💬</div>
            <div style={{ fontSize: '14px', fontWeight: '600', color: 'var(--white)', marginBottom: '4px' }}>No reviews yet</div>
            <div style={{ fontSize: '13px' }}>Be the first to book and leave a review</div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {reviews.map((review, i) => <ReviewCard key={review.id} review={review} index={i} />)}
          </div>
        )}
      </div>
    </div>
  )
}

/* ── Review card ───────────────────────────────────────────────────────── */
function ReviewCard({ review, index }) {
  const name    = review.customer_name || 'Customer'
  const inits   = name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
  const dateStr = new Date(review.created_at).toLocaleDateString('en-KE', { day: 'numeric', month: 'short', year: 'numeric' })

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: index * 0.06, duration: 0.25 }}
      style={{ padding: '16px', borderRadius: '14px', background: 'var(--ink)', border: '1px solid var(--border2)' }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
        <div style={{ width: '38px', height: '38px', borderRadius: '10px', flexShrink: 0, background: 'rgba(232,80,26,0.1)', border: '1px solid rgba(232,80,26,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', fontWeight: '700', color: 'var(--volt)' }}>{inits}</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '14px', fontWeight: '700', color: 'var(--white)' }}>{name}</span>
              {review.service_category && (
                <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '8px', background: '#FFF7ED', color: 'var(--volt)', fontWeight: '600', border: '1px solid #FED7AA' }}>{review.service_category}</span>
              )}
            </div>
            <span style={{ fontSize: '11px', color: 'var(--muted)', fontFamily: 'DM Mono', flexShrink: 0 }}>{dateStr}</span>
          </div>
          <div style={{ marginBottom: '8px' }}><StarRating rating={review.rating} size={14} /></div>
          {review.comment && <div style={{ fontSize: '13px', color: 'var(--muted)', lineHeight: '1.6' }}>"{review.comment}"</div>}
        </div>
      </div>
    </motion.div>
  )
}

/* ── Helpers ───────────────────────────────────────────────────────────── */
function StatChip({ label, value, valueColor, sub }) {
  return (
    <div style={{ background: 'var(--ink)', borderRadius: '12px', padding: '12px 14px', textAlign: 'center' }}>
      <div style={{ fontSize: '15px', fontWeight: '700', color: valueColor || 'var(--white)', fontFamily: 'Clash Display', marginBottom: '2px' }}>{value}</div>
      <div style={{ fontSize: '10px', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '1px', fontFamily: 'DM Mono' }}>{sub || label}</div>
    </div>
  )
}

function SkeletonRow() {
  return (
    <div style={{ display: 'flex', gap: '12px', padding: '12px 14px', background: 'var(--ink3)', border: '1px solid var(--border2)', borderRadius: '14px' }}>
      <div style={{ width: '42px', height: '42px', borderRadius: '12px', background: 'var(--ink)', flexShrink: 0 }} />
      <div style={{ flex: 1 }}>
        <div style={{ height: '13px', width: '55%', background: 'var(--ink)', borderRadius: '5px', marginBottom: '7px' }} />
        <div style={{ height: '11px', width: '35%', background: 'var(--ink)', borderRadius: '4px' }} />
      </div>
    </div>
  )
}

function ReviewSkeleton() {
  return (
    <div style={{ padding: '14px', borderRadius: '12px', background: 'var(--ink)', border: '1px solid var(--border2)' }}>
      <div style={{ display: 'flex', gap: '10px' }}>
        <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'var(--ink3)', flexShrink: 0 }} />
        <div style={{ flex: 1 }}>
          <div style={{ height: '12px', width: '40%', background: 'var(--ink3)', borderRadius: '4px', marginBottom: '7px' }} />
          <div style={{ height: '10px', width: '25%', background: 'var(--ink3)', borderRadius: '4px', marginBottom: '8px' }} />
          <div style={{ height: '10px', width: '85%', background: 'var(--ink3)', borderRadius: '4px' }} />
        </div>
      </div>
    </div>
  )
}
