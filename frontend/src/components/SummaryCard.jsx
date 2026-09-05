function SummaryCard({ label, value, detail }) {
  return (
    <article className="summary-card">
      <div className="card-heading">
        <span className="card-label">{label}</span>
        <span className="card-mark" aria-hidden="true" />
      </div>
      <p className="card-value" aria-label={`${label}: ${value}`}>{value}</p>
      <p className="card-detail">{detail}</p>
    </article>
  )
}

export default SummaryCard
