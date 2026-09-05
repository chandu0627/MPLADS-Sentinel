import { useMemo, useState } from 'react'

const displayValue = (value) => value === null || value === undefined || value === '' ? '—' : String(value)

function AggregateRecordsTable({ dataset, loading }) {
  const [search, setSearch] = useState('')
  const [filters, setFilters] = useState({})

  const columns = dataset?.columns || []
  const records = dataset?.records || []
  const filterColumns = useMemo(() => columns.filter((column) => {
    const values = new Set(records.map((record) => displayValue(record[column.name])).filter((value) => value !== '—'))
    return values.size > 0 && values.size <= 50
  }), [columns, records])

  const filteredRecords = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase()

    return records.filter((record) => {
      const matchesSearch = !normalizedSearch || columns.some((column) => displayValue(record[column.name]).toLowerCase().includes(normalizedSearch))
      const matchesFilters = filterColumns.every((column) => !filters[column.name] || displayValue(record[column.name]) === filters[column.name])
      return matchesSearch && matchesFilters
    })
  }, [columns, filterColumns, filters, records, search])

  const updateFilter = (columnName, value) => {
    setFilters((currentFilters) => ({ ...currentFilters, [columnName]: value }))
  }

  const resetFilters = () => {
    setSearch('')
    setFilters({})
  }

  const hasFilters = search || Object.values(filters).some(Boolean)
  const datasetLabel = dataset?.datasetName === 'allocation' ? 'Allocation' : 'Annexure'

  return (
    <section className="table-section aggregate-table-section" id={`${dataset?.datasetName || 'dataset'}-records`} aria-labelledby={`${dataset?.datasetName || 'dataset'}-records-title`}>
      <div className="section-heading">
        <div>
          <p className="section-kicker">Aggregate records</p>
          <h2 id={`${dataset?.datasetName || 'dataset'}-records-title`}>{datasetLabel} dataset</h2>
        </div>
        <span className="data-state">{loading ? 'Loading records' : `${filteredRecords.length} of ${records.length} records`}</span>
      </div>

      {!loading && dataset?.grain && <p className="dataset-grain">{dataset.grain}</p>}

      <div className="table-controls aggregate-table-controls" aria-label={`${datasetLabel} dataset filters`}>
        <label className="filter-field filter-search">
          <span>Search records</span>
          <input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search all returned columns" />
        </label>
        {filterColumns.map((column) => {
          const options = [...new Set(records.map((record) => displayValue(record[column.name])).filter((value) => value !== '—'))].sort()
          return (
            <label className="filter-field" key={column.name}>
              <span>{column.name}</span>
              <select value={filters[column.name] || ''} onChange={(event) => updateFilter(column.name, event.target.value)}>
                <option value="">All values</option>
                {options.map((option) => <option key={option} value={option}>{option}</option>)}
              </select>
            </label>
          )
        })}
        <button className="reset-filters" type="button" onClick={resetFilters} disabled={!hasFilters}>Reset filters</button>
      </div>

      <div className="table-wrapper aggregate-table-wrapper">
        <table>
          <caption className="sr-only">{datasetLabel} aggregate records</caption>
          <thead>
            <tr>{columns.map((column) => <th key={column.name} scope="col">{column.name}</th>)}</tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan={Math.max(columns.length, 1)}><div className="empty-state"><span className="loading-indicator" aria-hidden="true" /><strong>Loading aggregate records</strong><span>Fetching verified data from the FastAPI service.</span></div></td></tr>}
            {!loading && !columns.length && <tr><td><div className="empty-state"><strong>No column metadata available.</strong><span>The dataset response did not describe any columns.</span></div></td></tr>}
            {!loading && columns.length > 0 && !filteredRecords.length && <tr><td colSpan={columns.length}><div className="empty-state"><span className="empty-icon" aria-hidden="true">?</span><strong>No aggregate records match these filters.</strong><span>Try adjusting the filters or check the dataset status.</span></div></td></tr>}
            {!loading && filteredRecords.map((record, index) => <tr key={`${dataset?.datasetName || 'dataset'}-${index}`}>{columns.map((column) => <td key={column.name}>{displayValue(record[column.name])}</td>)}</tr>)}
          </tbody>
        </table>
      </div>
    </section>
  )
}

export default AggregateRecordsTable
