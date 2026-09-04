const formatCurrency = (amount) => new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0,
}).format(amount)

function EmptyChart({ children, loading = false }) {
  if (loading) {
    return <div className="chart-empty"><span className="loading-indicator" aria-hidden="true" />Loading chart data</div>
  }

  return <div className="chart-empty">{children}</div>
}

function StatusChart({ projects, loading }) {
  const statusCounts = projects.reduce((counts, project) => {
    const status = project.status || 'Not provided'
    counts[status] = (counts[status] || 0) + 1
    return counts
  }, {})
  const statuses = Object.entries(statusCounts).sort(([, firstCount], [, secondCount]) => secondCount - firstCount)
  const maximum = Math.max(...statuses.map(([, count]) => count), 1)

  return (
    <article className="chart-card">
      <div className="chart-title">
        <div>
          <p className="section-kicker">Portfolio composition</p>
          <h3>Projects by status</h3>
        </div>
        <span className="chart-source">status</span>
      </div>
      {loading || !projects.length ? <EmptyChart loading={loading}>No project data available.</EmptyChart> : (
        <ul className="bar-list">
          {statuses.map(([status, count]) => (
            <li key={status}>
              <div className="bar-label"><span>{status}</span><strong>{count}</strong></div>
              <div className="bar-track"><span className="bar-fill status-fill" style={{ width: `${(count / maximum) * 100}%` }} /></div>
            </li>
          ))}
        </ul>
      )}
    </article>
  )
}

function FinancialChart({ projects, loading }) {
  const financialProjects = projects.filter((project) => project.approvedAmount !== null || project.expenditure !== null)
  const maximum = Math.max(...financialProjects.flatMap((project) => [project.approvedAmount || 0, project.expenditure || 0]), 1)

  return (
    <article className="chart-card financial-card">
      <div className="chart-title">
        <div>
          <p className="section-kicker">Financial progress</p>
          <h3>Approved amount vs expenditure</h3>
        </div>
        <span className="chart-source">INR</span>
      </div>
      {loading || !financialProjects.length ? <EmptyChart loading={loading}>No financial project data available.</EmptyChart> : (
        <div className="financial-list">
          {financialProjects.map((project, index) => (
            <div className="financial-row" key={project.rowKey || `financial-row-${index}`}>
              <div className="financial-label"><span>{project.projectId || 'Project ID unavailable'}</span></div>
              <div className="financial-bars">
                <div className="financial-bar-row"><span className="bar-key approved-key">Approved</span><span className="bar-track"><span className="bar-fill approved-fill" style={{ width: `${((project.approvedAmount || 0) / maximum) * 100}%` }} /></span><strong>{project.approvedAmount === null ? '—' : formatCurrency(project.approvedAmount)}</strong></div>
                <div className="financial-bar-row"><span className="bar-key expenditure-key">Spent</span><span className="bar-track"><span className="bar-fill expenditure-fill" style={{ width: `${((project.expenditure || 0) / maximum) * 100}%` }} /></span><strong>{project.expenditure === null ? '—' : formatCurrency(project.expenditure)}</strong></div>
              </div>
            </div>
          ))}
        </div>
      )}
      <div className="chart-legend"><span><i className="legend-swatch approved-swatch" />Approved amount</span><span><i className="legend-swatch expenditure-swatch" />Expenditure</span></div>
    </article>
  )
}

function RiskChart({ projects, loading }) {
  const riskProjects = projects.filter((project) => typeof project.risk === 'string' && project.risk.trim())
  const riskCounts = riskProjects.reduce((counts, project) => {
    const level = project.risk.toUpperCase()
    counts[level] = (counts[level] || 0) + 1
    return counts
  }, {})
  const levels = ['LOW', 'MEDIUM', 'HIGH'].filter((level) => riskCounts[level])
  const otherLevels = Object.keys(riskCounts).filter((level) => !levels.includes(level))
  const visibleLevels = [...levels, ...otherLevels]
  const maximum = Math.max(...visibleLevels.map((level) => riskCounts[level]), 1)

  return (
    <article className="chart-card">
      <div className="chart-title">
        <div>
          <p className="section-kicker">Analytical indicators</p>
          <h3>Risk distribution</h3>
        </div>
        <span className="chart-source">risk level</span>
      </div>
      {loading || !riskProjects.length ? <EmptyChart loading={loading}>Pending ML analysis</EmptyChart> : (
        <ul className="bar-list">
          {visibleLevels.map((level) => (
            <li key={level}>
              <div className="bar-label"><span className={`risk-label risk-label-${level.toLowerCase()}`}>{level}</span><strong>{riskCounts[level]}</strong></div>
              <div className="bar-track"><span className={`bar-fill risk-fill-${level.toLowerCase()}`} style={{ width: `${(riskCounts[level] / maximum) * 100}%` }} /></div>
            </li>
          ))}
        </ul>
      )}
    </article>
  )
}

function DataCharts({ projects, loading }) {
  return (
    <section className="charts-section" aria-labelledby="charts-title">
      <div className="section-heading">
        <div>
          <p className="section-kicker">Data signals</p>
          <h2 id="charts-title">Project insights</h2>
        </div>
        <span className="period-label">Derived from returned project records</span>
      </div>
      <div className="charts-grid">
        <StatusChart projects={projects} loading={loading} />
        <FinancialChart projects={projects} loading={loading} />
        <RiskChart projects={projects} loading={loading} />
      </div>
    </section>
  )
}

export default DataCharts
