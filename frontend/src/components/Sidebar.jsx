import { useEffect, useState } from 'react'

const navigationItems = [
  { label: 'Dashboard', target: 'dashboard' },
  { label: 'Projects', target: 'projects' },
  { label: 'Risk Analysis', target: 'risk-analysis' },
  { label: 'Alerts', target: 'alerts' },
  { label: 'About', target: 'about' },
]

function currentTarget() {
  return window.location.hash.slice(1) || 'dashboard'
}

function Sidebar() {
  const [activeTarget, setActiveTarget] = useState(currentTarget)

  useEffect(() => {
    const updateActiveTarget = () => setActiveTarget(currentTarget())
    window.addEventListener('hashchange', updateActiveTarget)
    return () => window.removeEventListener('hashchange', updateActiveTarget)
  }, [])

  return (
    <aside className="sidebar" aria-label="Primary navigation">
      <div className="sidebar-brand">
        <div className="brand-mark" aria-hidden="true">MS</div>
        <div>
          <p className="brand-name">MPLADS</p>
          <p className="brand-product">Sentinel</p>
        </div>
      </div>

      <nav className="nav-list">
        {navigationItems.map((item) => (
          <a className={`nav-item ${activeTarget === item.target ? 'active' : ''}`} href={`#${item.target}`} key={item.target}>
            <span className="nav-indicator" aria-hidden="true" />
            {item.label}
          </a>
        ))}
      </nav>

      <div className="sidebar-footer">
        <span className="live-dot" aria-hidden="true" />
        <span>System workspace</span>
      </div>
    </aside>
  )
}

export default Sidebar
