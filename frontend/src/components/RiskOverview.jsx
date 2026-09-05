import { useCallback, useEffect, useMemo, useState } from 'react'

import { getAllocationRisk, getAnnexureRisk } from '../services/api'

const emptyRiskData = { allocation: [], annexure: [] }

function summarize(records) {
  return {
    assessed: records.filter((record) => record.assessmentStatus === 'assessed').length,
    high: records.filter((record) => record.level === 'HIGH').length,
    medium: records.filter((record) => record.level === 'MEDIUM').length,
    low: records.filter((record) => record.level === 'LOW').length,
    notAssessed: records.filter((record) => record.level === 'NOT_ASSESSED').length,
  }
}

function formatScore(score) {
  return score === null ? 'Not assessed' : score.toFixed(3)
}

function riskLabel(record) {
  if (record.recordType === 'state_aggregate') return record.state || 'State aggregate'
  return record.constituency || record.mpName || record.state || 'Allocation record'
}

const riskLevels = ['ALL', 'HIGH', 'MEDIUM', 'LOW', 'NOT_ASSESSED']

function recordSearchText(record) {
  return [record.state, record.mpName, record.constituency].filter(Boolean).join(' ').toLowerCase()
}

function RiskRecords({ records, kind }) {
  const [riskLevel, setRiskLevel] = useState('ALL')
  const [search, setSearch] = useState('')
  const normalizedSearch = search.trim().toLowerCase()
  const filteredRecords = useMemo(() => records
    .filter((record) => riskLevel === 'ALL' || record.level === riskLevel)
    .filter((record) => !normalizedSearch || recordSearchText(record).includes(normalizedSearch))
    .sort((first, second) => (second.score ?? -1) - (first.score ?? -1)), [normalizedSearch, records, riskLevel])

  return (
    <div className="risk-records">
      <div className="risk-records-heading">
        <div>
          <p className="section-kicker">Record review</p>
          <h5>Risk records</h5>
        </div>
        <span className="risk-record-count">{filteredRecords.length.toLocaleString('en-IN')} shown</span>
      </div>

      <div className="risk-record-controls">
        <label className="filter-field">
          <span>Risk level</span>
          <select value={riskLevel} onChange={(event) => setRiskLevel(event.target.value)}>
            {riskLevels.map((level) => <option key={level} value={level}>{level.replace('_', ' ')}</option>)}
          </select>
        </label>
        <label className="filter-field risk-record-search">
          <span>Search state, MP name, or constituency</span>
          <input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search risk records" />
        </label>
      </div>

      {!filteredRecords.length ? (
        <p className="risk-empty">No {kind === 'allocation' ? 'allocation' : 'Annexure/state'} risk records match these filters.</p>
      ) : (
        <div className="risk-record-table-wrapper">
          <table className="risk-record-table">
            <caption className="sr-only">{kind === 'allocation' ? 'Allocation' : 'Annexure/state'} risk records</caption>
            <thead>
              <tr>
                <th scope="col">State</th>
                {kind === 'allocation' ? <th scope="col">MP name</th> : null}
                {kind === 'allocation' ? <th scope="col">Constituency</th> : null}
                <th scope="col">Anomaly score</th>
                <th scope="col">Risk level</th>
                <th scope="col">Explanation</th>
              </tr>
            </thead>
            <tbody>
              {filteredRecords.map((record) => (
                <tr key={record.rowKey}>
                  <td>{record.state || '—'}</td>
                  {kind === 'allocation' ? <td>{record.mpName || '—'}</td> : null}
                  {kind === 'allocation' ? <td>{record.constituency || '—'}</td> : null}
                  <td>{formatScore(record.score)}</td>
                  <td><span className={`risk-record-level risk-record-level-${record.level.toLowerCase()}`}>{record.level.replace('_', ' ')}</span></td>
                  <td>{record.explanation || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

function RiskSummary({ title, records, kind }) {
  const summary = summarize(records)
  const highestRisk = records
    .filter((record) => record.assessmentStatus === 'assessed' && record.score !== null)
    .sort((first, second) => second.score - first.score)
    .slice(0, 5)

  return (
    <section className="risk-source" aria-labelledby={`${kind}-risk-title`}>
      <div className="risk-source-heading">
        <div>
          <p className="section-kicker">{kind === 'allocation' ? 'MP / constituency records' : 'State aggregate records'}</p>
          <h4 id={`${kind}-risk-title`}>{title}</h4>
        </div>
        <span className="risk-record-count">{records.length.toLocaleString('en-IN')} records</span>
      </div>

      <div className="risk-stat-grid">
        <div><strong>{records.length.toLocaleString('en-IN')}</strong><span>Total records</span></div>
        <div><strong>{summary.assessed.toLocaleString('en-IN')}</strong><span>Assessed</span></div>
        <div className="risk-stat-high"><strong>{summary.high.toLocaleString('en-IN')}</strong><span>High</span></div>
        <div className="risk-stat-medium"><strong>{summary.medium.toLocaleString('en-IN')}</strong><span>Medium</span></div>
        <div className="risk-stat-low"><strong>{summary.low.toLocaleString('en-IN')}</strong><span>Low</span></div>
        <div className="risk-stat-not-assessed"><strong>{summary.notAssessed.toLocaleString('en-IN')}</strong><span>Not assessed</span></div>
      </div>

      {highestRisk.length === 0 ? (
        <p className="risk-empty">No assessed records are available for this dataset.</p>
      ) : (
        <div className="highest-risk-list">
          <div className="highest-risk-heading"><strong>Highest anomaly scores</strong><span>Score / level</span></div>
          {highestRisk.map((record) => (
            <div className="highest-risk-row" key={record.rowKey}>
              <div>
                <strong>{riskLabel(record)}</strong>
                <span>{record.explanation || 'Statistical anomaly indicator requiring further review.'}</span>
              </div>
              <div className={`risk-score risk-score-${record.level.toLowerCase()}`}>
                <strong>{formatScore(record.score)}</strong>
                <span>{record.level}</span>
              </div>
            </div>
          ))}
        </div>
      )}
      <RiskRecords records={records} kind={kind} />
    </section>
  )
}

function RiskOverview() {
  const [riskData, setRiskData] = useState(emptyRiskData)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const loadRiskData = useCallback(async () => {
    setLoading(true)
    setError(null)

    const results = await Promise.allSettled([getAllocationRisk(), getAnnexureRisk()])
    const [allocationResult, annexureResult] = results
    const nextData = { ...emptyRiskData }
    if (allocationResult.status === 'fulfilled') nextData.allocation = allocationResult.value
    if (annexureResult.status === 'fulfilled') nextData.annexure = annexureResult.value
    if (results.some((result) => result.status === 'rejected')) {
      setError('Risk analysis could not be fully loaded. Check the backend connection and try again.')
      console.error('MPLADS risk data loading failed', { results })
    }
    setRiskData(nextData)
    setLoading(false)
  }, [])

  useEffect(() => {
    loadRiskData()
  }, [loadRiskData])

  return (
    <section className="risk-panel" aria-labelledby="risk-overview-title">
      <div className="risk-heading">
        <div>
          <p className="section-kicker">Analytical indicator</p>
          <h3 id="risk-overview-title">Risk overview</h3>
        </div>
        <span className="risk-disclaimer">Not a declaration of fraud</span>
      </div>

      <p className="risk-context">Anomaly scores are statistical indicators for review, not findings of fraud.</p>

      {loading ? <p className="pending-analysis">Loading ML risk analysis</p> : null}
      {!loading && error ? (
        <div className="details-error" role="alert">
          <strong>Risk analysis is unavailable.</strong>
          <span>{error}</span>
          <button type="button" onClick={loadRiskData}>Retry</button>
        </div>
      ) : null}
      {!loading && !error && !riskData.allocation.length && !riskData.annexure.length ? (
        <p className="pending-analysis">No risk records are available.</p>
      ) : null}
      {!loading && !error && (riskData.allocation.length || riskData.annexure.length) ? (
        <div className="risk-sources">
          {riskData.allocation.length ? <RiskSummary title="Allocation risk" records={riskData.allocation} kind="allocation" /> : null}
          {riskData.annexure.length ? <RiskSummary title="Annexure / state risk" records={riskData.annexure} kind="annexure" /> : null}
        </div>
      ) : null}
    </section>
  )
}

export default RiskOverview
