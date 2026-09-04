import { useEffect, useState } from 'react'
import { getProject, getProjects } from './services/api'
import DataCharts from './components/DataCharts'
import ProjectTable from './components/ProjectTable'
import ProjectDetails from './components/ProjectDetails'
import Sidebar from './components/Sidebar'
import SummaryCard from './components/SummaryCard'

const formatCurrency = (amount) => new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0,
}).format(amount)

const hasHighRiskLabel = (risk) => typeof risk === 'string' && ['high', 'critical'].includes(risk.toLowerCase())

function App() {
  const [projects, setProjects] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [reloadToken, setReloadToken] = useState(0)
  const [selectedProjectId, setSelectedProjectId] = useState(null)
  const [selectedProject, setSelectedProject] = useState(null)
  const [detailsLoading, setDetailsLoading] = useState(false)
  const [detailsError, setDetailsError] = useState(null)
  const [detailsReloadToken, setDetailsReloadToken] = useState(0)

  useEffect(() => {
    let isCurrent = true

    setLoading(true)
    setError(null)

    getProjects()
      .then((records) => {
        if (isCurrent) setProjects(records)
      })
      .catch((requestError) => {
        if (isCurrent) setError(requestError.message)
      })
      .finally(() => {
        if (isCurrent) setLoading(false)
      })

    return () => { isCurrent = false }
  }, [reloadToken])

  useEffect(() => {
    if (!selectedProjectId) {
      setSelectedProject(null)
      setDetailsError(null)
      return undefined
    }

    let isCurrent = true
    setDetailsLoading(true)
    setDetailsError(null)
    setSelectedProject(null)

    getProject(selectedProjectId)
      .then((record) => {
        if (isCurrent) setSelectedProject(record)
      })
      .catch((requestError) => {
        if (isCurrent) setDetailsError(requestError.message)
      })
      .finally(() => {
        if (isCurrent) setDetailsLoading(false)
      })

    return () => { isCurrent = false }
  }, [selectedProjectId, detailsReloadToken])

  const approvedAmounts = projects.filter((project) => project.approvedAmount !== null).map((project) => project.approvedAmount)
  const expenditureAmounts = projects.filter((project) => project.expenditure !== null).map((project) => project.expenditure)
  const projectsWithRisk = projects.filter((project) => project.risk !== null)
  const totalApprovedAmount = approvedAmounts.reduce((total, amount) => total + amount, 0)
  const totalExpenditure = expenditureAmounts.reduce((total, amount) => total + amount, 0)
  const riskValue = projectsWithRisk.length === 0 ? '--' : projectsWithRisk.filter((project) => hasHighRiskLabel(project.risk)).length

  const summaryCards = [
    { label: 'Total Projects', value: loading ? '...' : projects.length, detail: loading ? 'Loading data' : 'Returned project records' },
    { label: 'Total Approved Amount', value: loading ? '...' : approvedAmounts.length ? formatCurrency(totalApprovedAmount) : '--', detail: approvedAmounts.length ? 'Calculated from returned amounts' : 'Source field unavailable' },
    { label: 'Total Expenditure', value: loading ? '...' : expenditureAmounts.length ? formatCurrency(totalExpenditure) : '--', detail: expenditureAmounts.length ? 'Calculated from returned amounts' : 'Source field unavailable' },
    { label: 'High Risk Projects', value: loading ? '...' : riskValue, detail: projectsWithRisk.length ? 'Analytical risk indicators' : 'Pending ML analysis' },
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
            <span className={`status-dot ${error ? 'error-dot' : ''}`} aria-hidden="true" />
            <span>{loading ? 'Loading project data' : error ? 'Backend unavailable' : `${projects.length} project records loaded`}</span>
          </div>
        </header>

        {error && <div className="api-error" role="alert"><strong>Project data could not be loaded.</strong><span>{error}</span><button type="button" onClick={() => setReloadToken((token) => token + 1)}>Try again</button></div>}

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

        <DataCharts projects={projects} loading={loading} />

        <ProjectTable
          projects={projects}
          loading={loading}
          selectedProjectId={selectedProjectId}
          onSelectProject={(projectId) => {
            setSelectedProjectId(projectId)
            setDetailsReloadToken((token) => token + 1)
          }}
        />
        <ProjectDetails
          project={selectedProject}
          loading={detailsLoading}
          error={detailsError}
          onRetry={() => setDetailsReloadToken((token) => token + 1)}
        />
      </main>
    </div>
  )
}

export default App
