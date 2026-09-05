import { useCallback, useEffect, useState } from 'react'

import { getAllocationRecords, getAllocationSummary, getAnnexureRecords, getAnnexureSummary } from './services/api'
import AggregateRecordsTable from './components/AggregateRecordsTable'
import DataCharts from './components/DataCharts'
import RiskOverview from './components/RiskOverview'
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
        <section className="details-section" id="projects" aria-labelledby="projects-section-title">
          <div className="section-heading">
            <div>
              <p className="section-kicker">Portfolio register</p>
              <h2 id="projects-section-title">Projects</h2>
            </div>
          </div>
          <div className="details-state">
            <strong>Project workspace planned</strong>
            <span>Project-level records will be added when the project data source is available.</span>
          </div>
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
          <div className="section-heading">
            <div>
              <p className="section-kicker">Monitoring workflow</p>
              <h2 id="alerts-section-title">Alerts</h2>
            </div>
          </div>
          <div className="details-state">
            <strong>Alert workflow planned</strong>
            <span>Alerts will be added after review rules and notification workflows are defined.</span>
          </div>
        </section>
        <section className="details-section" id="about" aria-labelledby="about-section-title">
          <div className="section-heading">
            <div>
              <p className="section-kicker">System context</p>
              <h2 id="about-section-title">About MPLADS Sentinel</h2>
            </div>
          </div>
          <div className="details-state">
            <strong>Programme monitoring workspace</strong>
            <span>This dashboard presents official aggregate data and statistical anomaly indicators for further review.</span>
          </div>
        </section>
      </main>
    </div>
  )
}

export default App
