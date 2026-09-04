import DataCharts from './components/DataCharts'
import ProjectTable from './components/ProjectTable'
import RiskOverview from './components/RiskOverview'
import Sidebar from './components/Sidebar'
import SummaryCard from './components/SummaryCard'

function App() {
  const projects = []

  const summaryCards = [
    { label: 'Total Projects', value: '—', detail: 'Awaiting backend data' },
    { label: 'Total Approved Amount', value: '—', detail: 'Awaiting backend data' },
    { label: 'Total Expenditure', value: '—', detail: 'Awaiting backend data' },
    { label: 'High Risk Projects', value: '—', detail: 'Pending ML analysis' },
  ]

  return (
    <div className="app-shell">
      <Sidebar />
      <main className="dashboard-main">
        <header className="dashboard-header">
          <div>
            <p className="section-kicker">Public fund monitoring</p>
            <h1>MPLADS Sentinel</h1>
            <p className="dashboard-subtitle">AI-powered Public Fund Risk &amp; Anomaly Intelligence System</p>
          </div>
          <div className="header-meta">
            <span className="status-dot" aria-hidden="true" />
            <span>Data connection pending</span>
          </div>
        </header>

        <section className="summary-section" aria-labelledby="summary-title">
          <div className="section-heading compact-heading">
            <div>
              <p className="section-kicker">At a glance</p>
              <h2 id="summary-title">Programme summary</h2>
            </div>
            <span className="period-label">Current reporting period</span>
          </div>
          <div className="summary-grid">
            {summaryCards.map((card) => <SummaryCard key={card.label} {...card} />)}
          </div>
        </section>

        <DataCharts projects={projects} loading={false} />
        <ProjectTable projects={projects} loading={false} />
        <section className="details-section" aria-labelledby="risk-section-title">
          <div className="section-heading">
            <div>
              <p className="section-kicker">Risk intelligence</p>
              <h2 id="risk-section-title">Risk information</h2>
            </div>
          </div>
          <RiskOverview />
        </section>
      </main>
    </div>
  )
}

export default App
