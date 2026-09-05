import { useMemo } from 'react'

const PROJECT_FIELDS = [
  'Project/work ID',
  'State',
  'Constituency',
  'MP',
  'Sanctioned amount',
  'Estimated cost',
  'Expenditure',
  'Work status',
  'Completion date',
  'Implementing agency',
  'Location',
  'Payments/progress',
]

const FUTURE_CAPABILITIES = [
  'Unusual cost patterns',
  'Cost overruns',
  'Delayed works',
  'Duplicate or similar works',
  'Unusual expenditure patterns',
  'Payment/progress inconsistencies',
]

function numericValue(value) {
  const number = Number(value)
  return Number.isFinite(number) ? number : 0
}

function formatNumber(value, options = {}) {
  return new Intl.NumberFormat('en-IN', options).format(value)
}

function formatCrore(value) {
  return `${formatNumber(value, { maximumFractionDigits: 2 })} crore`
}

function yearLabel(columnName) {
  const match = columnName.match(/(\d{4})_(\d{2})/)
  return match ? `${match[1]}-${match[2]}` : null
}

function ProjectMonitoring({ allocation, annexure, loading, error, onRetry }) {
  const summary = useMemo(() => {
    const allocationRecords = allocation.records || []
    const annexureRecords = (annexure.records || []).filter((record) => record.record_type === 'state_aggregate')
    const states = new Set([...allocationRecords, ...annexureRecords].map((record) => record.state).filter(Boolean))
    const expenditureColumns = (annexure.columns || [])
      .map((column) => column.name)
      .filter((name) => name.startsWith('expenditure_') && name.endsWith('_rs_crore'))
    const completedWorkColumns = (annexure.columns || [])
      .map((column) => column.name)
      .filter((name) => name.startsWith('completed_works_'))
    const years = [...new Set([...expenditureColumns, ...completedWorkColumns].map(yearLabel).filter(Boolean))].sort()
    const expenditureByYear = years.map((year) => ({
      year,
      value: expenditureColumns
        .filter((column) => yearLabel(column) === year)
        .reduce((total, column) => total + annexureRecords.reduce((subtotal, record) => subtotal + numericValue(record[column]), 0), 0),
    }))
    const completedWorksByYear = years.map((year) => ({
      year,
      value: completedWorkColumns
        .filter((column) => yearLabel(column) === year)
        .reduce((total, column) => total + annexureRecords.reduce((subtotal, record) => subtotal + numericValue(record[column]), 0), 0),
    }))

    return {
      stateCount: states.size,
      allocationRecords: allocationRecords.length,
      annexureRecords: annexure.records?.length || 0,
      years,
      expenditureByYear,
      completedWorksByYear,
    }
  }, [allocation, annexure])

  if (loading) {
    return <div className="details-state"><span className="loading-indicator" aria-hidden="true" /><strong>Loading aggregate coverage</strong><span>Fetching verified allocation and Annexure data.</span></div>
  }

  if (error) {
    return (
      <div className="details-error" role="alert">
        <strong>Project monitoring data is unavailable.</strong>
        <span>{error}</span>
        <button type="button" onClick={onRetry}>Retry</button>
      </div>
    )
  }

  if (!summary.allocationRecords && !summary.annexureRecords) {
    return <div className="details-state"><strong>No aggregate data available.</strong><span>Project monitoring coverage cannot be summarized until the public datasets are available.</span></div>
  }

  return (
    <div className="project-monitoring">
      <section className="project-intro" aria-labelledby="project-monitoring-title">
        <p className="section-kicker">Coverage and scope</p>
        <h3 id="project-monitoring-title">Project Monitoring</h3>
        <p>MPLADS Sentinel is designed to support project and work-level monitoring. The currently available public datasets provide aggregate/state-level information. Authorized project/work-level data is required for detailed project monitoring.</p>
      </section>

      <div className="project-summary-grid">
        <article className="project-summary-card"><span>States represented</span><strong>{formatNumber(summary.stateCount)}</strong><small>Across available aggregate records</small></article>
        <article className="project-summary-card"><span>Aggregate records</span><strong>{formatNumber(summary.allocationRecords + summary.annexureRecords)}</strong><small>{formatNumber(summary.allocationRecords)} allocation + {formatNumber(summary.annexureRecords)} Annexure</small></article>
        <article className="project-summary-card"><span>Reporting years</span><strong>{summary.years.length ? summary.years.length : '—'}</strong><small>{summary.years.length ? summary.years.join(', ') : 'Not provided'}</small></article>
      </div>

      <section className="project-data-section" aria-labelledby="aggregate-indicators-title">
        <div className="section-heading">
          <div>
            <p className="section-kicker">Derived from state aggregates</p>
            <h4 id="aggregate-indicators-title">Aggregate expenditure and completed works</h4>
          </div>
          <span className="data-state">Annexure state rows only</span>
        </div>
        <div className="project-indicator-grid">
          <article className="project-indicator-card">
            <span>Reported expenditure</span>
            {summary.expenditureByYear.length ? summary.expenditureByYear.map((item) => <div className="project-indicator-row" key={`expenditure-${item.year}`}><strong>{item.year}</strong><span>{formatCrore(item.value)}</span></div>) : <p>Not provided</p>}
          </article>
          <article className="project-indicator-card">
            <span>Completed works</span>
            {summary.completedWorksByYear.length ? summary.completedWorksByYear.map((item) => <div className="project-indicator-row" key={`works-${item.year}`}><strong>{item.year}</strong><span>{formatNumber(item.value)}</span></div>) : <p>Not provided</p>}
          </article>
        </div>
      </section>

      <section className="project-data-section" aria-labelledby="available-data-title">
        <div className="section-heading">
          <div>
            <p className="section-kicker">Current public coverage</p>
            <h4 id="available-data-title">Available Data</h4>
          </div>
        </div>
        <div className="available-data-grid">
          <article className="available-data-card"><strong>Allocation dataset</strong><span>{formatNumber(summary.allocationRecords)} MP / constituency aggregate records covering allocation amounts.</span></article>
          <article className="available-data-card"><strong>Annexure dataset</strong><span>{formatNumber(summary.annexureRecords)} aggregate rows containing state-level expenditure and completed-work indicators.</span></article>
        </div>
        <p className="coverage-note">Data-source note: current public data is aggregate/state-level and does not provide a project or work register. This limits project-level monitoring and findings.</p>
      </section>

      <section className="project-data-section" aria-labelledby="project-requirements-title">
        <div className="section-heading">
          <div>
            <p className="section-kicker">Future project-level capability</p>
            <h4 id="project-requirements-title">Project-level monitoring requires</h4>
          </div>
        </div>
        <div className="project-requirements-list">{PROJECT_FIELDS.map((field) => <span key={field}>{field}</span>)}</div>
        <p className="future-capability-note">Once authorized project-level data is available, MPLADS Sentinel could support the following future/project-level capabilities:</p>
        <div className="future-capabilities-list">{FUTURE_CAPABILITIES.map((capability) => <span key={capability}>{capability}</span>)}</div>
        <p className="coverage-note">These are future capabilities, not current findings. No specific project is being assessed because project/work-level records are not available.</p>
      </section>
    </div>
  )
}

export default ProjectMonitoring