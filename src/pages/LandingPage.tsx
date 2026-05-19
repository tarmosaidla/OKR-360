import { Link } from 'react-router-dom'
import { Icon } from '../components/cadence/Icon'

const FEATURES = [
  {
    icon: 'target' as const,
    title: 'OKR alignment',
    desc: 'Connect company goals to team and individual objectives with a clear cascade.',
  },
  {
    icon: 'chartLine' as const,
    title: 'Weekly check-ins',
    desc: 'Track progress with lightweight weekly updates. Spot blockers before they compound.',
  },
  {
    icon: 'users' as const,
    title: 'Team transparency',
    desc: 'Everyone sees the same dashboard. No more "what is everyone working on?" emails.',
  },
]

export function LandingPage() {
  return (
    <div className="cd-landing">
      {/* Nav */}
      <header className="cd-landing-nav">
        <div className="cd-landing-brand">
          <Icon name="sparkle" size={22} />
          <span>OKR 360</span>
        </div>
        <div className="cd-landing-nav-links">
          <Link to="/login" className="cd-btn cd-btn--ghost cd-btn--sm">Sign in</Link>
          <Link to="/register" className="cd-btn cd-btn--primary cd-btn--sm">Try free</Link>
        </div>
      </header>

      {/* Hero */}
      <section className="cd-landing-hero">
        <div className="cd-landing-hero-inner">
          <div className="cd-landing-badge">Free 14-day trial · No credit card</div>
          <h1 className="cd-landing-h1">
            OKRs that your<br />team actually uses
          </h1>
          <p className="cd-landing-hero-sub">
            OKR 360 keeps goals visible, progress honest, and blockers surfaced—without the overhead of spreadsheets or over-engineered enterprise tools.
          </p>
          <div className="cd-landing-cta-row">
            <Link to="/register" className="cd-btn cd-btn--primary cd-btn--lg">
              Get started free
            </Link>
            <Link to="/login" className="cd-btn cd-btn--ghost cd-btn--lg">
              Sign in
            </Link>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="cd-landing-features">
        {FEATURES.map(f => (
          <div key={f.title} className="cd-landing-feature">
            <div className="cd-landing-feature-icon">
              <Icon name={f.icon} size={20} />
            </div>
            <h3 className="cd-landing-feature-title">{f.title}</h3>
            <p className="cd-landing-feature-desc">{f.desc}</p>
          </div>
        ))}
      </section>

      {/* Footer */}
      <footer className="cd-landing-foot">
        <span>© {new Date().getFullYear()} OKR 360</span>
      </footer>
    </div>
  )
}
