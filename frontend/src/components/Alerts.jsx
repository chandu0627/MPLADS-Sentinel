import { useCallback, useEffect, useMemo, useState } from 'react'

import { getAllocationRisk, getAnnexureRisk } from '../services/api'

const emptyData = { allocation: [], annexure: [] }
const alertLevels = ['ALL', 'HIGH', 'MEDIUM', 'LOW']

function displayScore(score) {
  return score === null ? 'Not assessed' : score.toFixed(3)
}

function searchableText(record) {
  return [record.state, record.mpName, record.constituency]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()
}

function isAlert(record) {
  return record.assessmentStatus === 'assessed' && record.level !== 'NOT_ASSESSED'
}

function AlertTable({ title, records, source }) {
  if (!records.length) {
    return <p className="alert-empty">No alerts match the current filters for this dataset.</p>
  }

  return (
    <div className="alert-table-section">
      <div className="alert-table-heading">
        <h4>{title}</h4>
        <span>{records.length.toLocaleString('en-IN')} shown</span>
      </div>
      <div className="alert-table-wrapper">
        <table className="alert-table">
          <caption className="sr-only">{title} alert records</caption>
          <thead>
            <tr>
              <th scope="col">Severity</th>
              <th scope="col">State</th>
              {source === 'allocation' ? <th scope="col">MP name</th> : null}
              {source === 'allocation' ? <th scope="col">Constituency</th> : null}
              <th scope="col">Anomaly score</th>
              <th scope="col">Explanation</th>
            </tr>
          </thead>
          <tbody>
            {records.map((record) => (
              <tr key={record.rowKey}>
                <td><span className={`alert-level alert-level-${record.level.toLowerCase()}`}>{record.level}</span></td>
                <td>{record.state || '—'}</td>
                {source === 'allocation' ? <td>{record.mpName || '—'}</td> : null}
                {source === 'allocation' ? <td>{record.constituency || '—'}</td> : null}
                <td>{displayScore(record.score)}</td>
                <td>{record.explanation || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function Alerts() {
  const [riskData, setRiskData] = useState(emptyData)
  const [riskLevel, setRiskLevel] = useState('ALL')
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const loadAlerts = useCallback(async () => {
    setLoading(true)
    setError(null)
    const results = await Promise.allSettled([getAllocationRisk(), getAnnexureRisk()])
    const [allocationResult, annexureResult] = results
    const nextData = { ...emptyData }
    if (allocationResult.status === 'fulfilled') nextData.allocation = allocationResult.value
    if (annexureResult.status === 'fulfilled') nextData.annexure = annexureResult.value
    if (results.some((result) => result.status === 'rejected')) {
      setError('Alert data could not be fully loaded. Check the backend connection and try again.')
      console.error('MPLADS alert data loading failed', { results })
    }
    setRiskData(nextData)
    setLoading(false)
  }, [])

  useEffect(() => {
    loadAlerts()
  }, [loadAlerts])

  const filteredData = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase()
    const filterRecords = (records) => records
      .filter(isAlert)
      .filter((record) => riskLevel === 'ALL' || record.level === riskLevel)
      .filter((record) => !normalizedSearch || searchableText(record).includes(normalizedSearch))
      .sort((first, second) => (second.score ?? -1) - (first.score ?? -1))

    return {
      allocation: filterRecords([...riskData.allocation]),
      annexure: filterRecords([...riskData.annexure]),
    }
  }, [riskData, riskLevel, search])

  const summary = useMemo(() => {
    const alerts = [...riskData.allocation, ...riskData.annexure].filter(isAlert)
    return {
      total: alerts.length,
      high: alerts.filter((record) => record.level === 'HIGH').length,
      medium: alerts.filter((record) => record.level === 'MEDIUM').length,
      low: alerts.filter((record) => record.level === 'LOW').length,
    }
  }, [riskData])

  return (
    <section className="alerts-panel" aria-labelledby="alerts-title">
      <div className="alerts-heading">
        <div>
          <p className="section-kicker">Monitoring workflow</p>
          <h3 id="alerts-title">Alerts</h3>
        </div>
        <a className="alerts-analysis-link" href="#risk-analysis">View Risk Analysis</a>
      </div>

      <p className="alerts-disclaimer">Risk indicators are for review and prioritization. They do not constitute proof of fraud.</p>

      {loading ? <p className="pending-analysis">Loading alert data</p> : null}
      {!loading && error ? (
        <div className="details-error" role="alert">
          <strong>Alerts are unavailable.</strong>
          <span>{error}</span>
          <button type="button" onClick={loadAlerts}>Retry</button>
        </div>
      ) : null}
      {!loading && !error ? (
        <>
          <div className="alert-summary-grid">
            <div><strong>{summary.total.toLocaleString('en-IN')}</strong><span>Total alerts</span></div>
            <div className="alert-summary-high"><strong>{summary.high.toLocaleString('en-IN')}</strong><span>High</span></div>
            <div className="alert-summary-medium"><strong>{summary.medium.toLocaleString('en-IN')}</strong><span>Medium</span></div>
            <div className="alert-summary-low"><strong>{summary.low.toLocaleString('en-IN')}</strong><span>Low</span></div>
          </div>

          <div className="alert-controls">
            <label className="filter-field">
              <span>Alert level</span>
              <select value={riskLevel} onChange={(event) => setRiskLevel(event.target.value)}>
                {alertLevels.map((level) => <option key={level} value={level}>{level}</option>)}
              </select>
            </label>
            <label className="filter-field">
              <span>Search state, MP name, or constituency</span>
              <input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search alerts" />
            </label>
          </div>

          {!summary.total ? <p className="alert-empty">No assessed risk records currently require alert review.</p> : null}
          {summary.total > 0 ? (
            <div className="alert-datasets">
              <AlertTable title="Allocation alerts" records={filteredData.allocation} source="allocation" />
              <AlertTable title="Annexure / state alerts" records={filteredData.annexure} source="annexure" />
            </div>
          ) : null}
        </>
      ) : null}
    </section>
  )
}

export default Alerts