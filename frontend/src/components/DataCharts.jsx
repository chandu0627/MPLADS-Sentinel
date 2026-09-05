const formatNumber = (value) => new Intl.NumberFormat('en-IN', { maximumFractionDigits: 2 }).format(value)

function EmptyChart({ children, loading = false }) {
  if (loading) {
    return <div className="chart-empty"><span className="loading-indicator" aria-hidden="true" />Loading aggregate data</div>
  }

  return <div className="chart-empty">{children}</div>
}

function DatasetCoverageChart({ datasets, loading }) {
  const availableDatasets = datasets.filter((dataset) => dataset.datasetName)
  const maximum = Math.max(...availableDatasets.map((dataset) => dataset.rowCount), 1)

  return (
    <article className="chart-card">
      <div className="chart-title">
        <div>
          <p className="section-kicker">Dataset coverage</p>
          <h3>Official aggregate records</h3>
        </div>
        <span className="chart-source">records</span>
      </div>
      {loading || !availableDatasets.length ? <EmptyChart loading={loading}>No aggregate data available.</EmptyChart> : (
        <ul className="bar-list">
          {availableDatasets.map((dataset) => (
            <li key={dataset.datasetName}>
              <div className="bar-label"><span>{dataset.datasetName}</span><strong>{dataset.rowCount.toLocaleString('en-IN')}</strong></div>
              <div className="bar-track"><span className="bar-fill status-fill" style={{ width: `${(dataset.rowCount / maximum) * 100}%` }} /></div>
            </li>
          ))}
        </ul>
      )}
    </article>
  )
}

function NumericSignalsChart({ datasets, loading }) {
  const signals = datasets.flatMap((dataset) => (dataset.columns || [])
    .filter((column) => column.type === 'integer' || column.type === 'number')
    .map((column) => {
      const values = (dataset.records || []).map((record) => Number(record[column.name])).filter(Number.isFinite)
      return { datasetName: dataset.datasetName, columnName: column.name, value: values.reduce((total, value) => total + value, 0) }
    }))
  const maximum = Math.max(...signals.map((signal) => signal.value), 1)

  return (
    <article className="chart-card financial-card">
      <div className="chart-title">
        <div>
          <p className="section-kicker">Data signals</p>
          <h3>Numeric fields returned by the datasets</h3>
        </div>
        <span className="chart-source">derived</span>
      </div>
      {loading || !signals.length ? <EmptyChart loading={loading}>No numeric fields available.</EmptyChart> : (
        <div className="financial-list">
          {signals.map((signal) => (
            <div className="financial-row" key={`${signal.datasetName}-${signal.columnName}`}>
              <div className="financial-label"><span>{signal.datasetName}: {signal.columnName}</span></div>
              <div className="financial-bars">
                <div className="financial-bar-row"><span className="bar-key approved-key">Total</span><span className="bar-track"><span className="bar-fill approved-fill" style={{ width: `${(signal.value / maximum) * 100}%` }} /></span><strong>{formatNumber(signal.value)}</strong></div>
              </div>
            </div>
          ))}
        </div>
      )}
      <div className="chart-legend"><span><i className="legend-swatch approved-swatch" />Sum of returned numeric values</span></div>
    </article>
  )
}

function DataCharts({ datasets, loading }) {
  return (
    <section className="charts-section" aria-labelledby="charts-title">
      <div className="section-heading">
        <div>
          <p className="section-kicker">Data signals</p>
          <h2 id="charts-title">Aggregate dataset insights</h2>
        </div>
        <span className="period-label">No project or risk inference</span>
      </div>
      <div className="charts-grid">
        <DatasetCoverageChart datasets={datasets} loading={loading} />
        <NumericSignalsChart datasets={datasets} loading={loading} />
      </div>
    </section>
  )
}

export default DataCharts
