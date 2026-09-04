import RiskOverview from './RiskOverview'

const displayValue = (value) => value ?? '—'

const formatAmount = (amount) => {
  if (amount === null) return '—'
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount)
}

function DetailItem({ label, value }) {
  return (
    <div className="detail-item">
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  )
}

function ProjectDetails({ project, loading, error, onRetry }) {
  if (!project && !loading && !error) return null

  return (
    <section className="details-section" aria-labelledby="details-title" aria-live="polite">
      <div className="section-heading">
        <div>
          <p className="section-kicker">Selected record</p>
          <h2 id="details-title">Project details</h2>
        </div>
        {project?.projectId && <span className="data-state">{project.projectId}</span>}
      </div>

      {loading && <div className="details-state"><span className="loading-indicator" aria-hidden="true" /><strong>Loading project details</strong><span>Retrieving the selected record from FastAPI.</span></div>}

      {error && <div className="details-error" role="alert"><strong>Project details could not be loaded.</strong><span>{error}</span><button type="button" onClick={onRetry}>Try again</button></div>}

      {project && !loading && !error && (
        <div className="details-content">
          <dl className="details-grid">
            <DetailItem label="Project ID" value={displayValue(project.projectId)} />
            <DetailItem label="State" value={displayValue(project.state)} />
            <DetailItem label="District" value={displayValue(project.district)} />
            <DetailItem label="Location" value={displayValue(project.location)} />
            <DetailItem label="Project Type" value={displayValue(project.projectType)} />
            <DetailItem label="Approved Amount" value={formatAmount(project.approvedAmount)} />
            <DetailItem label="Expenditure" value={formatAmount(project.expenditure)} />
            <DetailItem label="Status" value={displayValue(project.status)} />
          </dl>

          <RiskOverview riskDetails={project.riskDetails} />
        </div>
      )}
    </section>
  )
}

export default ProjectDetails
