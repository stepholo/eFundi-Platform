import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'

const SERVICES = [
  { icon: '⚡', label: 'Electrical',  desc: 'Wiring, installations & repairs'   },
  { icon: '🚿', label: 'Plumbing',    desc: 'Pipes, leaks & fittings'            },
  { icon: '🪚', label: 'Carpentry',   desc: 'Furniture, doors & woodwork'        },
  { icon: '🧹', label: 'Cleaning',    desc: 'Deep clean, offices & homes'        },
  { icon: '🔧', label: 'General',     desc: 'Handyman & misc repairs'            },
]

const STEPS = [
  { n: '01', title: 'Post your request',      desc: 'Describe what you need and your location. Takes under 60 seconds.'                },
  { n: '02', title: 'Get matched instantly',  desc: 'Our system broadcasts your job to verified technicians near you.'                  },
  { n: '03', title: 'Pay via M-Pesa',         desc: 'Once the job is done, pay securely. Funds are held safely until completion.'      },
]

const FEATURES = [
  { icon: '🛡️', title: 'Verified technicians',   desc: 'Every technician is identity-checked and admin-approved before going live.'  },
  { icon: '📍', title: 'GPS-based matching',      desc: 'We broadcast jobs only to technicians who are actually near your location.'  },
  { icon: '📲', title: 'M-Pesa payments',         desc: 'Pay straight from your phone with Kenya\'s most trusted mobile wallet.'     },
  { icon: '🔄', title: 'Real-time tracking',      desc: 'Watch job status update live — from assigned to in-progress to done.'       },
]

const STATS = [
  { value: '500+',  label: 'Technicians'    },
  { value: '2k+',   label: 'Jobs completed' },
  { value: '4.8★',  label: 'Average rating' },
  { value: '< 15m', label: 'Match time'     },
]

function fadeUp(delay = 0) {
  return {
    initial: { opacity: 0, y: 24 },
    whileInView: { opacity: 1, y: 0 },
    viewport: { once: true, margin: '-60px' },
    transition: { duration: 0.5, delay },
  }
}

export default function HomePage() {
  const navigate = useNavigate()

  return (
    <div style={{ background: 'var(--ink)', color: 'var(--white)', fontFamily: 'Cabinet Grotesk', overflowX: 'hidden' }}>

      {/* ── Navbar ─────────────────────────────────────────────────────────── */}
      <nav style={{
        position: 'sticky', top: 0, zIndex: 100,
        height: '64px', background: 'rgba(255,255,255,0.92)',
        backdropFilter: 'blur(12px)', borderBottom: '1px solid var(--border2)',
        display: 'flex', alignItems: 'center', padding: '0 40px', gap: '16px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1 }}>
          <img src="/efundi_icon.svg" width="34" height="34" alt="eFundi" style={{ borderRadius: '7px' }} />
          <span style={{ fontFamily: 'Clash Display', fontWeight: '700', fontSize: '20px', color: '#1B2D5E' }}>
            <span style={{ color: '#E8501A' }}>e</span>Fundi
          </span>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            onClick={() => navigate('/login')}
            style={{
              padding: '8px 20px', borderRadius: '10px', border: '1px solid var(--border2)',
              background: 'transparent', color: 'var(--muted)', fontSize: '15px',
              fontWeight: '600', cursor: 'pointer', fontFamily: 'Cabinet Grotesk',
              transition: 'color 0.2s',
            }}
            onMouseEnter={e => (e.target.style.color = 'var(--white)')}
            onMouseLeave={e => (e.target.style.color = 'var(--muted)')}
          >
            Log in
          </button>
          <motion.button
            whileHover={{ translateY: -1 }} whileTap={{ scale: 0.97 }}
            onClick={() => navigate('/register')}
            style={{
              padding: '8px 20px', borderRadius: '10px', border: 'none',
              background: 'var(--orange)', color: 'var(--ink)',
              fontSize: '15px', fontWeight: '700', cursor: 'pointer', fontFamily: 'Cabinet Grotesk',
            }}
          >
            Get started →
          </motion.button>
        </div>
      </nav>

      {/* ── Hero ────────────────────────────────────────────────────────────── */}
      <section style={{
        minHeight: '92vh', display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        padding: '80px 24px 60px', textAlign: 'center', position: 'relative',
      }}>
        {/* Glow blobs */}
        <div style={{
          position: 'absolute', top: '15%', left: '50%', transform: 'translateX(-50%)',
          width: '600px', height: '400px', borderRadius: '50%',
          background: 'radial-gradient(ellipse, rgba(255,107,26,0.12) 0%, transparent 70%)',
          pointerEvents: 'none',
        }} />

        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: '8px',
            padding: '5px 14px', borderRadius: '20px',
            background: 'rgba(255,107,26,0.1)', border: '1px solid rgba(255,107,26,0.25)',
            fontSize: '14px', color: 'var(--orange)', fontFamily: 'DM Mono',
            letterSpacing: '0.5px', marginBottom: '28px',
          }}
        >
          🇰🇪 Built for Kenya · M-Pesa integrated
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          style={{
            fontFamily: 'Clash Display', fontWeight: '700',
            fontSize: 'clamp(40px, 7vw, 80px)',
            lineHeight: '1.08', marginBottom: '24px',
            maxWidth: '820px',
          }}
        >
          Book skilled{' '}
          <span style={{
            background: 'linear-gradient(135deg, var(--orange), #FF9A00)',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
          }}>
            technicians
          </span>
          ,{' '}<br />fast.
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          style={{
            fontSize: '18px', color: 'var(--muted)', lineHeight: '1.65',
            maxWidth: '520px', marginBottom: '40px',
          }}
        >
          eFundi connects you with verified, GPS-matched local technicians for
          electrical, plumbing, carpentry, cleaning, and more.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', justifyContent: 'center', marginBottom: '64px' }}
        >
          <motion.button
            whileHover={{ translateY: -2, scale: 1.02 }} whileTap={{ scale: 0.97 }}
            onClick={() => navigate('/register?role=Customer')}
            style={{
              padding: '15px 32px', borderRadius: '14px', border: 'none',
              background: 'var(--orange)', color: 'var(--ink)',
              fontSize: '17px', fontWeight: '700', cursor: 'pointer',
              fontFamily: 'Cabinet Grotesk',
              boxShadow: '0 8px 32px rgba(255,107,26,0.3)',
            }}
          >
            Book a service →
          </motion.button>
          <motion.button
            whileHover={{ translateY: -2, scale: 1.02 }} whileTap={{ scale: 0.97 }}
            onClick={() => navigate('/register?role=Technician')}
            style={{
              padding: '15px 32px', borderRadius: '14px',
              border: '1px solid var(--border2)', background: 'var(--ink3)',
              color: 'var(--white)', fontSize: '17px', fontWeight: '700',
              cursor: 'pointer', fontFamily: 'Cabinet Grotesk',
            }}
          >
            Join as a technician
          </motion.button>
        </motion.div>

        {/* Stats bar */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.45 }}
          style={{
            display: 'flex', gap: '0', flexWrap: 'wrap', justifyContent: 'center',
            background: 'var(--ink3)', border: '1px solid var(--border2)',
            borderRadius: '20px', overflow: 'hidden',
          }}
        >
          {STATS.map((s, i) => (
            <div key={s.label} style={{
              padding: '20px 36px', textAlign: 'center',
              borderRight: i < STATS.length - 1 ? '1px solid var(--border2)' : 'none',
            }}>
              <div style={{ fontFamily: 'Clash Display', fontSize: '28px', fontWeight: '700', color: 'var(--white)' }}>
                {s.value}
              </div>
              <div style={{ fontSize: '14px', color: 'var(--muted)', fontFamily: 'DM Mono', marginTop: '4px' }}>
                {s.label}
              </div>
            </div>
          ))}
        </motion.div>
      </section>

      {/* ── Services ────────────────────────────────────────────────────────── */}
      <section style={{ padding: '80px 40px', maxWidth: '1100px', margin: '0 auto' }}>
        <motion.div {...fadeUp()} style={{ textAlign: 'center', marginBottom: '48px' }}>
          <div style={{ fontSize: '13px', letterSpacing: '2px', color: 'var(--orange)', textTransform: 'uppercase', fontFamily: 'DM Mono', marginBottom: '12px' }}>
            What we offer
          </div>
          <h2 style={{ fontFamily: 'Clash Display', fontSize: 'clamp(28px, 4vw, 44px)', fontWeight: '700', color: 'var(--white)' }}>
            Services built for everyday life
          </h2>
        </motion.div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '16px' }}>
          {SERVICES.map((s, i) => (
            <motion.div
              key={s.label}
              {...fadeUp(i * 0.07)}
              whileHover={{ translateY: -4, scale: 1.02 }}
              onClick={() => navigate('/register?role=Customer')}
              style={{
                background: 'var(--ink3)', border: '1px solid var(--border2)',
                borderRadius: '20px', padding: '28px 20px', textAlign: 'center',
                cursor: 'pointer', transition: 'border-color 0.2s',
              }}
              onHoverStart={e => {}}
            >
              <div style={{ fontSize: '36px', marginBottom: '14px' }}>{s.icon}</div>
              <div style={{ fontFamily: 'Clash Display', fontSize: '17px', fontWeight: '700', color: 'var(--white)', marginBottom: '6px' }}>
                {s.label}
              </div>
              <div style={{ fontSize: '14px', color: 'var(--muted)', lineHeight: '1.5' }}>
                {s.desc}
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ── How it works ────────────────────────────────────────────────────── */}
      <section style={{ padding: '80px 40px', background: 'var(--ink2)', borderTop: '1px solid var(--border2)', borderBottom: '1px solid var(--border2)' }}>
        <div style={{ maxWidth: '900px', margin: '0 auto' }}>
          <motion.div {...fadeUp()} style={{ textAlign: 'center', marginBottom: '56px' }}>
            <div style={{ fontSize: '13px', letterSpacing: '2px', color: 'var(--orange)', textTransform: 'uppercase', fontFamily: 'DM Mono', marginBottom: '12px' }}>
              For customers
            </div>
            <h2 style={{ fontFamily: 'Clash Display', fontSize: 'clamp(28px, 4vw, 44px)', fontWeight: '700', color: 'var(--white)' }}>
              How it works
            </h2>
          </motion.div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '28px' }}>
            {STEPS.map((step, i) => (
              <motion.div key={step.n} {...fadeUp(i * 0.12)}>
                <div style={{
                  fontFamily: 'Clash Display', fontSize: '48px', fontWeight: '700',
                  color: 'rgba(255,107,26,0.2)', lineHeight: 1, marginBottom: '16px',
                }}>
                  {step.n}
                </div>
                <div style={{ fontSize: '17px', fontWeight: '700', color: 'var(--white)', marginBottom: '8px' }}>
                  {step.title}
                </div>
                <div style={{ fontSize: '15px', color: 'var(--muted)', lineHeight: '1.65' }}>
                  {step.desc}
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Features ────────────────────────────────────────────────────────── */}
      <section style={{ padding: '80px 40px', maxWidth: '1100px', margin: '0 auto' }}>
        <motion.div {...fadeUp()} style={{ textAlign: 'center', marginBottom: '48px' }}>
          <div style={{ fontSize: '13px', letterSpacing: '2px', color: 'var(--orange)', textTransform: 'uppercase', fontFamily: 'DM Mono', marginBottom: '12px' }}>
            Why eFundi
          </div>
          <h2 style={{ fontFamily: 'Clash Display', fontSize: 'clamp(28px, 4vw, 44px)', fontWeight: '700', color: 'var(--white)' }}>
            Built to earn your trust
          </h2>
        </motion.div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '20px' }}>
          {FEATURES.map((f, i) => (
            <motion.div
              key={f.title}
              {...fadeUp(i * 0.08)}
              style={{
                background: 'var(--ink3)', border: '1px solid var(--border2)',
                borderRadius: '20px', padding: '28px',
              }}
            >
              <div style={{
                width: '46px', height: '46px', borderRadius: '13px',
                background: 'rgba(255,107,26,0.1)', border: '1px solid rgba(255,107,26,0.2)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '20px', marginBottom: '16px',
              }}>
                {f.icon}
              </div>
              <div style={{ fontSize: '17px', fontWeight: '700', color: 'var(--white)', marginBottom: '8px' }}>
                {f.title}
              </div>
              <div style={{ fontSize: '15px', color: 'var(--muted)', lineHeight: '1.65' }}>
                {f.desc}
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ── Technician CTA ──────────────────────────────────────────────────── */}
      <section style={{ padding: '80px 40px' }}>
        <motion.div
          {...fadeUp()}
          style={{
            maxWidth: '900px', margin: '0 auto',
            background: 'linear-gradient(135deg, rgba(255,107,26,0.08) 0%, rgba(255,107,26,0.04) 100%)',
            border: '1px solid rgba(255,107,26,0.25)',
            borderRadius: '28px', padding: '60px 48px',
            textAlign: 'center', position: 'relative', overflow: 'hidden',
          }}
        >
          {/* Glow */}
          <div style={{
            position: 'absolute', top: '-40px', right: '-40px',
            width: '280px', height: '280px', borderRadius: '50%',
            background: 'radial-gradient(ellipse, rgba(255,107,26,0.08) 0%, transparent 70%)',
            pointerEvents: 'none',
          }} />

          <div style={{ fontSize: '40px', marginBottom: '16px' }}>🔧</div>
          <h2 style={{ fontFamily: 'Clash Display', fontSize: 'clamp(24px, 4vw, 40px)', fontWeight: '700', color: 'var(--white)', marginBottom: '16px' }}>
            Earn with your skills
          </h2>
          <p style={{ fontSize: '17px', color: 'var(--muted)', lineHeight: '1.65', maxWidth: '480px', margin: '0 auto 36px' }}>
            Join hundreds of technicians already earning on eFundi.
            Set your own schedule, accept jobs near you, and get paid instantly.
          </p>

          <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
            <motion.button
              whileHover={{ translateY: -2 }} whileTap={{ scale: 0.97 }}
              onClick={() => navigate('/register?role=Technician')}
              style={{
                padding: '14px 32px', borderRadius: '12px', border: 'none',
                background: 'var(--orange)', color: 'var(--ink)',
                fontSize: '16px', fontWeight: '700', cursor: 'pointer',
                fontFamily: 'Cabinet Grotesk',
                boxShadow: '0 6px 24px rgba(255,107,26,0.3)',
              }}
            >
              Apply as a technician →
            </motion.button>
            <motion.button
              whileHover={{ translateY: -2 }} whileTap={{ scale: 0.97 }}
              onClick={() => navigate('/login')}
              style={{
                padding: '14px 28px', borderRadius: '12px',
                border: '1px solid var(--border2)', background: 'transparent',
                color: 'var(--muted)', fontSize: '16px', fontWeight: '600',
                cursor: 'pointer', fontFamily: 'Cabinet Grotesk',
              }}
            >
              Already registered? Log in
            </motion.button>
          </div>
        </motion.div>
      </section>

      {/* ── Footer ──────────────────────────────────────────────────────────── */}
      <footer style={{
        borderTop: '1px solid var(--border2)', padding: '28px 40px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        flexWrap: 'wrap', gap: '12px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <img src="/efundi_icon.svg" width="26" height="26" alt="eFundi" style={{ borderRadius: '6px' }} />
          <span style={{ fontFamily: 'Clash Display', fontWeight: '700', fontSize: '15px', color: '#1B2D5E' }}>
            <span style={{ color: '#E8501A' }}>e</span>Fundi
          </span>
        </div>
        <div style={{ fontSize: '14px', color: 'var(--muted)', fontFamily: 'DM Mono' }}>
          © {new Date().getFullYear()} eFundi. All rights reserved.
        </div>
        <div style={{ display: 'flex', gap: '20px' }}>
          {['Log in', 'Register', 'Join as Technician'].map((label, i) => (
            <button
              key={label}
              onClick={() => navigate(i === 0 ? '/login' : i === 1 ? '/register' : '/register?role=Technician')}
              style={{
                background: 'none', border: 'none', color: 'var(--muted)',
                fontSize: '14px', cursor: 'pointer', fontFamily: 'Cabinet Grotesk',
                transition: 'color 0.2s',
              }}
              onMouseEnter={e => (e.target.style.color = 'var(--white)')}
              onMouseLeave={e => (e.target.style.color = 'var(--muted)')}
            >
              {label}
            </button>
          ))}
        </div>
      </footer>
    </div>
  )
}
