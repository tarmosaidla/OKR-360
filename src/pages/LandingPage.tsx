import { useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const FEATURES = [
  {
    bg: '#EEEDFE',
    color: '#534AB7',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <rect x="9" y="2" width="6" height="5" rx="1"/>
        <rect x="2" y="15" width="6" height="5" rx="1"/>
        <rect x="16" y="15" width="6" height="5" rx="1"/>
        <path d="M12 7v3.5M5 15v-2.5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2V15"/>
      </svg>
    ),
    title: 'Goals that cascade',
    text: 'From group strategy down to team execution — every objective links to the bigger picture.',
  },
  {
    bg: '#E1F5EE',
    color: '#0F6E56',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="9"/>
        <path d="M12 7v5l3 3"/>
      </svg>
    ),
    title: 'Weekly check-ins',
    text: 'Two minutes every week keeps confidence scores fresh and surfaces blockers before they stall progress.',
  },
  {
    bg: '#FAEEDA',
    color: '#854F0B',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M9 11l3 3L22 4"/>
        <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>
      </svg>
    ),
    title: 'Quarterly reviews',
    text: 'Score your cycle, carry forward unfinished work, and start the next quarter with momentum.',
  },
]

export function LandingPage() {
  const { user, loading } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    if (!loading && user) {
      navigate('/dashboard', { replace: true })
    }
  }, [user, loading, navigate])

  if (loading) return null

  return (
    <div className="cd-landing">
      {/* Nav */}
      <nav className="cd-landing-nav">
        <div className="cd-landing-brand">
          <div className="cd-landing-logo-mark">✦</div>
          <span className="cd-landing-logo-name">OKR 360</span>
        </div>
        <div className="cd-landing-nav-actions">
          <Link to="/login" className="cd-btn cd-btn--ghost cd-btn--sm">Sign in</Link>
          <Link to="/register" className="cd-btn cd-btn--primary cd-btn--sm">Start free →</Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="cd-landing-hero">
        <div className="cd-landing-eyebrow">Goal-setting for serious teams</div>

        <h1 className="cd-landing-h1">Strategy that reaches every level of your org</h1>

        <p className="cd-landing-sub">
          Set ambitious goals, align your teams, and track what matters — from board to individual, every quarter.
        </p>

        <div className="cd-landing-cta-row">
          <Link to="/register" className="cd-btn cd-btn--primary cd-landing-cta-main">Start free trial →</Link>
          <Link to="/login" className="cd-btn cd-btn--ghost">Sign in to your workspace</Link>
        </div>

        <p className="cd-landing-fine">14-day free trial · No credit card required</p>
      </section>

      {/* Feature cards */}
      <div className="cd-landing-cards">
        {FEATURES.map(f => (
          <div key={f.title} className="cd-landing-card">
            <div className="cd-landing-card-icon" style={{ background: f.bg, color: f.color }}>
              {f.icon}
            </div>
            <div className="cd-landing-card-title">{f.title}</div>
            <p className="cd-landing-card-text">{f.text}</p>
          </div>
        ))}
      </div>

      {/* Social proof */}
      <div className="cd-landing-proof">
        <p className="cd-landing-proof-text">
          Trusted by teams running structured OKRs — from 10-person startups to enterprise subsidiaries.
        </p>
        <div className="cd-landing-stats">
          <div className="cd-landing-stat">
            <span className="cd-landing-stat-val">3 min</span>
            <span className="cd-landing-stat-lbl">to set up</span>
          </div>
          <div className="cd-landing-stat">
            <span className="cd-landing-stat-val">4 levels</span>
            <span className="cd-landing-stat-lbl">of hierarchy</span>
          </div>
          <div className="cd-landing-stat">
            <span className="cd-landing-stat-val">100%</span>
            <span className="cd-landing-stat-lbl">your data</span>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="cd-landing-footer">
        © 2026 OKR 360 · <a href="#" className="cd-landing-footer-link">Privacy</a> · <a href="#" className="cd-landing-footer-link">Terms</a>
      </footer>
    </div>
  )
}
