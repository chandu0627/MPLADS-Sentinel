const supportedLevels = ['LOW', 'MEDIUM', 'HIGH']

function RiskOverview({ riskDetails = {} }) {
  const score = riskDetails.score ?? null
  const level = typeof riskDetails.level === 'string' ? riskDetails.level.toUpperCase() : null
  const explanation = riskDetails.explanation ?? null
  const indicators = Array.isArray(riskDetails.indicators) ? riskDetails.indicators : []
  const hasRiskInformation = score !== null || Boolean(level) || Boolean(explanation) || indicators.length > 0
  const levelClass = supportedLevels.includes(level) ? level.toLowerCase() : 'unknown'

  return (
    <section className="risk-panel" aria-labelledby="risk-overview-title">
      <div className="risk-heading">
        <div>
          <p className="section-kicker">Analytical indicator</p>
          <h3 id="risk-overview-title">Risk overview</h3>
        </div>
        <span className="risk-disclaimer">Not a declaration of fraud</span>
      </div>

      <p className="risk-context">Risk information will be added after the ML analysis work is complete.</p>

      {!hasRiskInformation ? (
        <p className="pending-analysis">Pending ML analysis</p>
      ) : (
        <dl className="risk-grid">
          <div className="detail-item">
            <dt>Risk Score</dt>
            <dd>{score ?? '—'}</dd>
          </div>
          <div className={`detail-item risk-level risk-level-${levelClass}`}>
            <dt>Risk Level</dt>
            <dd>{level ?? '—'}</dd>
          </div>
          <div className="detail-item">
            <dt>Reason / Explanation</dt>
            <dd>{explanation ?? '—'}</dd>
          </div>
          <div className="detail-item">
            <dt>Anomaly Indicators</dt>
            <dd>{indicators.length ? indicators.join(', ') : '—'}</dd>
          </div>
        </dl>
      )}
    </section>
  )
}

export default RiskOverview
