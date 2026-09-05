const navigationItems = ['Dashboard', 'Projects', 'Risk Analysis', 'Alerts', 'About']

function Sidebar() {
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
        {navigationItems.map((item, index) => (
          <a className={`nav-item ${index === 0 ? 'active' : ''}`} href={`#${item.toLowerCase().replace(' ', '-')}`} key={item}>
            <span className="nav-indicator" aria-hidden="true" />
            {item}
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
