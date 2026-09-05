import { useCallback, useEffect, useState } from 'react'

import { getAllocationRisk, getAnnexureRisk } from '../services/api'

const supportedLevels = ['LOW', 'MEDIUM', 'HIGH', 'NOT_ASSESSED']

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
        <div><strong>{summary.assessed.toLocaleString('en-IN')}</strong><span>Assessed</span></div>
        <div className="risk-stat-high"><strong>{summary.high}</strong><span>High</span></div>
        <div className="risk-stat-medium"><strong>{summary.medium}</strong><span>Medium</span></div>
        <div className="risk-stat-low"><strong>{summary.low}</strong><span>Low</span></div>
        <div className="risk-stat-not-assessed"><strong>{summary.notAssessed}</strong><span>Not assessed</span></div>
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
