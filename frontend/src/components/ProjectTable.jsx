import { useMemo, useState } from 'react'

const columns = [
  'Project ID',
  'State',
  'District',
  'Project Type',
  'Approved Amount',
  'Expenditure',
  'Status',
  'Risk',
]

const displayValue = (value) => value ?? '—'

const formatAmount = (amount) => {
  if (amount === null) return '—'
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount)
}

function ProjectTable({ projects, loading, selectedProjectId, onSelectProject }) {
  const [projectSearch, setProjectSearch] = useState('')
  const [stateFilter, setStateFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [projectTypeFilter, setProjectTypeFilter] = useState('')

  const filterOptions = (field) => [...new Set(projects.map((project) => project[field]).filter(Boolean))].sort()
  const states = filterOptions('state')
  const statuses = filterOptions('status')
  const projectTypes = filterOptions('projectType')
  const hasFilters = projectSearch || stateFilter || statusFilter || projectTypeFilter

  const filteredProjects = useMemo(() => {
    const search = projectSearch.trim().toLowerCase()

    return projects.filter((project) => {
      const matchesSearch = !search || (project.projectId || '').toLowerCase().includes(search)
      return matchesSearch
        && (!stateFilter || project.state === stateFilter)
        && (!statusFilter || project.status === statusFilter)
        && (!projectTypeFilter || project.projectType === projectTypeFilter)
    })
  }, [projectSearch, projectTypeFilter, projects, stateFilter, statusFilter])

  const resetFilters = () => {
    setProjectSearch('')
    setStateFilter('')
    setStatusFilter('')
    setProjectTypeFilter('')
  }

  return (
    <section className="table-section" id="projects" aria-labelledby="projects-title">
      <div className="section-heading">
        <div>
          <p className="section-kicker">Portfolio register</p>
          <h2 id="projects-title">Projects overview</h2>
        </div>
        <span className="data-state">{loading ? 'Loading records' : `${filteredProjects.length} of ${projects.length} records`}</span>
      </div>

      <div className="table-controls" aria-label="Project filters">
        <label className="filter-field filter-search">
          <span>Search Project ID</span>
          <input type="search" value={projectSearch} onChange={(event) => setProjectSearch(event.target.value)} placeholder="Search by project ID" />
        </label>
        <label className="filter-field">
          <span>State</span>
          <select value={stateFilter} onChange={(event) => setStateFilter(event.target.value)}>
            <option value="">All states</option>
            {states.map((state) => <option key={state} value={state}>{state}</option>)}
          </select>
        </label>
        <label className="filter-field">
          <span>Status</span>
          <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
            <option value="">All statuses</option>
            {statuses.map((status) => <option key={status} value={status}>{status}</option>)}
          </select>
        </label>
        <label className="filter-field">
          <span>Project Type</span>
          <select value={projectTypeFilter} onChange={(event) => setProjectTypeFilter(event.target.value)}>
            <option value="">All project types</option>
            {projectTypes.map((projectType) => <option key={projectType} value={projectType}>{projectType}</option>)}
          </select>
        </label>
        <button className="reset-filters" type="button" onClick={resetFilters} disabled={!hasFilters}>Reset filters</button>
      </div>

      <div className="table-wrapper">
        <table>
          <caption className="sr-only">MPLADS project register</caption>
          <thead>
            <tr>
              {columns.map((column) => <th key={column} scope="col">{column}</th>)}
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr><td colSpan={columns.length}><div className="empty-state"><span className="loading-indicator" aria-hidden="true" /><strong>Loading project data</strong><span>Fetching records from the FastAPI service.</span></div></td></tr>
            )}
            {!loading && projects.length === 0 && (
              <tr><td colSpan={columns.length}><div className="empty-state"><span className="empty-icon" aria-hidden="true">+</span><strong>No project data available.</strong><span>The backend returned no project records.</span></div></td></tr>
            )}
            {!loading && projects.length > 0 && filteredProjects.length === 0 && (
              <tr><td colSpan={columns.length}><div className="empty-state"><span className="empty-icon" aria-hidden="true">?</span><strong>No projects match these filters.</strong><span>Try adjusting the search or reset the filters.</span></div></td></tr>
            )}
            {!loading && filteredProjects.map((project) => (
              <tr className={selectedProjectId === project.projectId ? 'selected-row' : ''} key={project.rowKey}>
                <td><button className="project-link" type="button" onClick={() => onSelectProject(project.projectId)} disabled={!project.projectId}>{displayValue(project.projectId)}</button></td>
                <td>{displayValue(project.state)}</td>
                <td>{displayValue(project.district)}</td>
                <td>{displayValue(project.projectType)}</td>
                <td>{formatAmount(project.approvedAmount)}</td>
                <td>{formatAmount(project.expenditure)}</td>
                <td>{displayValue(project.status)}</td>
                <td>{project.risk ?? <span className="risk-pending">Pending ML analysis</span>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}

export default ProjectTable
