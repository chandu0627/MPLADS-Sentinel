import { useCallback, useEffect, useState } from 'react'

import { getAllocationRecords, getAllocationSummary, getAnnexureRecords, getAnnexureSummary } from './services/api'
import AggregateRecordsTable from './components/AggregateRecordsTable'
import Alerts from './components/Alerts'
import DataCharts from './components/DataCharts'
import ProjectMonitoring from './components/ProjectMonitoring'
import RiskOverview from './components/RiskOverview'
import SentinelAssist from './components/SentinelAssist'
import Sidebar from './components/Sidebar'
import SummaryCard from './components/SummaryCard'

const createEmptyDataset = (datasetName) => ({ datasetName, rowCount: 0, columns: [], records: [], grain: null, reportingPeriod: null })

async function loadDataset(summaryRequest, recordsRequest) {
  const [summary, records] = await Promise.all([summaryRequest(), recordsRequest()])
  return { ...records, ...summary, records: records.records, columns: records.columns }
}

function App() {
  const [allocation, setAllocation] = useState(() => createEmptyDataset('allocation'))
  const [annexure, setAnnexure] = useState(() => createEmptyDataset('annexure'))
  const [loading, setLoading] = useState(true)
  const [apiError, setApiError] = useState(null)

  const loadData = useCallback(async () => {
    setLoading(true)
    setApiError(null)

    const results = await Promise.allSettled([
      loadDataset(getAllocationSummary, getAllocationRecords),
      loadDataset(getAnnexureSummary, getAnnexureRecords),
    ])

    const [allocationResult, annexureResult] = results
    if (allocationResult.status === 'fulfilled') setAllocation(allocationResult.value)
    if (annexureResult.status === 'fulfilled') setAnnexure(annexureResult.value)

    const failedDatasets = results
      .map((result, index) => result.status === 'rejected' ? (index === 0 ? 'allocation' : 'annexure') : null)
      .filter(Boolean)
    if (failedDatasets.length) {
      setApiError(`Some aggregate data could not be loaded. ${failedDatasets.join(' and ')} data may be unavailable.`)
      console.error('MPLADS aggregate data loading failed', { results })
    }

    setLoading(false)
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  const summaryCards = [
    { label: 'Allocation Records', value: loading ? '—' : allocation.rowCount.toLocaleString('en-IN'), detail: allocation.reportingPeriod || 'Aggregate dataset' },
    { label: 'Annexure Records', value: loading ? '—' : annexure.rowCount.toLocaleString('en-IN'), detail: annexure.reportingPeriod || 'Aggregate dataset' },
    { label: 'Allocation Grain', value: loading ? '—' : 'MP / constituency', detail: 'Aggregate records, not projects' },
    { label: 'Risk Analysis', value: '—', detail: 'Pending ML analysis' },
  ]

  const connectionLabel = loading ? 'Loading aggregate data' : apiError ? 'Data connection limited' : 'Live aggregate data connected'

  return (
    <div className="app-shell">
      <Sidebar />
      <main className="dashboard-main">
        <header className="dashboard-header" id="dashboard">
          <div>
            <p className="section-kicker">Public fund monitoring</p>
            <h1>MPLADS Sentinel</h1>
            <p className="dashboard-subtitle">AI-powered Public Fund Risk &amp; Anomaly Intelligence System</p>
          </div>
          <div className="header-meta">
            <span className={`status-dot ${apiError ? 'error-dot' : ''}`} aria-hidden="true" />
            <span>{connectionLabel}</span>
          </div>
        </header>

        {apiError && <div className="api-error" role="alert"><strong>Aggregate data is not fully available.</strong><span>Check the backend connection and try again.</span><button type="button" onClick={loadData}>Retry</button></div>}

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

        <DataCharts datasets={[allocation, annexure]} loading={loading} />
        <AggregateRecordsTable dataset={allocation} loading={loading} />
        <AggregateRecordsTable dataset={annexure} loading={loading} />
        <section className="details-section" id="projects" aria-labelledby="project-monitoring-title">
          <ProjectMonitoring allocation={allocation} annexure={annexure} loading={loading} error={apiError} onRetry={loadData} />
        </section>
        <section className="details-section" id="risk-analysis" aria-labelledby="risk-section-title">
          <div className="section-heading">
            <div>
              <p className="section-kicker">Risk intelligence</p>
              <h2 id="risk-section-title">Risk information</h2>
            </div>
          </div>
          <RiskOverview />
        </section>
        <section className="details-section" id="alerts" aria-labelledby="alerts-section-title">
          <Alerts />
        </section>
        <section className="details-section" id="about" aria-labelledby="about-section-title">
          <div className="about-section">
            <section className="about-intro" aria-labelledby="about-section-title">
              <p className="section-kicker">System context</p>
              <h2 id="about-section-title">About MPLADS Sentinel</h2>
              <p>MPLADS Sentinel is an AI-powered public fund risk and anomaly intelligence system designed to identify unusual patterns and records that may deserve human review.</p>
            </section>

            <div className="about-content-grid">
              <section className="about-card" aria-labelledby="about-purpose-title">
                <p className="section-kicker">Purpose</p>
                <h3 id="about-purpose-title">Prioritizing review</h3>
                <p>The system helps prioritize potentially unusual allocation and aggregate spending patterns for further investigation. It supports review and prioritization; it does not make final findings.</p>
              </section>
              <section className="about-card" aria-labelledby="about-data-title">
                <p className="section-kicker">Current data</p>
                <h3 id="about-data-title">Aggregate-level coverage</h3>
                <p>Current public data includes MP/constituency allocation records, state-level Annexure information, and expenditure and completed-work indicators where available.</p>
                <p className="about-note">The available public data does not provide a complete project/work-level register. Authorized project/work-level data is required for detailed project monitoring.</p>
              </section>
            </div>

            <section className="about-flow-section" aria-labelledby="about-flow-title">
              <div className="section-heading">
                <div>
                  <p className="section-kicker">Method</p>
                  <h3 id="about-flow-title">How the system works</h3>
                </div>
              </div>
              <div className="about-flow" aria-label="Data to human review process">
                {['Data', 'Cleaning & Validation', 'Anomaly Detection', 'Risk Scoring', 'Alerts', 'Human Review'].map((step, index, steps) => (
                  <div className="about-flow-step" key={step}>
                    <span>{step}</span>
                    {index < steps.length - 1 ? <strong aria-hidden="true">-&gt;</strong> : null}
                  </div>
                ))}
              </div>
            </section>

            <div className="about-content-grid">
              <section className="about-card" aria-labelledby="about-method-title">
                <p className="section-kicker">ML methodology</p>
                <h3 id="about-method-title">Statistical anomaly indicators</h3>
                <p>Current anomaly detection combines Isolation Forest with robust median/MAD-based comparison. These signals are combined into an anomaly score and grouped into LOW, MEDIUM, and HIGH risk levels.</p>
              </section>
              <section className="about-card" aria-labelledby="about-interpretation-title">
                <p className="section-kicker">Risk interpretation</p>
                <h3 id="about-interpretation-title">What the levels mean</h3>
                <dl className="about-risk-list">
                  <div><dt className="about-risk-high">HIGH</dt><dd>Unusual pattern requiring higher priority review.</dd></div>
                  <div><dt className="about-risk-medium">MEDIUM</dt><dd>Noticeable unusual pattern.</dd></div>
                  <div><dt className="about-risk-low">LOW</dt><dd>Relatively less unusual pattern.</dd></div>
                  <div><dt className="about-risk-not-assessed">NOT ASSESSED</dt><dd>Insufficient or missing data, or a summary record.</dd></div>
                </dl>
              </section>
            </div>

            <section className="about-disclaimer" aria-label="Risk disclaimer">
              <strong>A risk indicator is not proof of fraud.</strong>
              <span>MPLADS Sentinel supports investigation and prioritization; final decisions require human or official verification.</span>
            </section>

            <div className="about-content-grid">
              <section className="about-card" aria-labelledby="about-stack-title">
                <p className="section-kicker">Implementation</p>
                <h3 id="about-stack-title">Technology stack</h3>
                <div className="about-tags">{['React', 'Vite', 'FastAPI', 'Python', 'SQLite', 'scikit-learn'].map((technology) => <span key={technology}>{technology}</span>)}</div>
              </section>
              <section className="about-card" aria-labelledby="about-sih-title">
                <p className="section-kicker">SIH 2026</p>
                <h3 id="about-sih-title">Smart India Hackathon context</h3>
                <p>This solution is being developed for Smart India Hackathon 2026 and is aligned with the MPLADS anomaly, fraud, and inefficiency detection problem statement.</p>
              </section>
            </div>
          </div>
        </section>
      </main>
      <SentinelAssist />
    </div>
  )
}

export default App
