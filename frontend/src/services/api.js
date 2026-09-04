const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000').replace(/\/$/, '')

async function request(path) {
  let response

  try {
    response = await fetch(`${API_BASE_URL}${path}`)
  } catch {
    throw new Error(`Unable to reach the backend at ${API_BASE_URL}. Start FastAPI and try again.`)
  }

  if (!response.ok) {
    if (response.status === 404) {
      throw new Error('The selected project was not found. It may have been removed or is no longer available.')
    }
    throw new Error(`Backend request failed with status ${response.status}.`)
  }

  try {
    return await response.json()
  } catch {
    throw new Error('The backend returned an invalid JSON response.')
  }
}

function textOrNull(value) {
  return typeof value === 'string' && value.trim() ? value.trim() : null
}

function amountOrNull(value) {
  if (value === null || value === undefined || value === '') return null

  const amount = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(amount) ? amount : null
}

function riskOrNull(project) {
  const risk = project.risk ?? project.risk_level ?? project.riskLevel

  if (typeof risk === 'string' && risk.trim()) return risk.trim()
  if (typeof risk === 'number' && Number.isFinite(risk)) return risk
  return null
}

function riskDetailsOrNull(project) {
  const risk = project.risk && typeof project.risk === 'object' ? project.risk : {}
  const riskLabel = typeof project.risk === 'string' ? project.risk : null
  const score = project.risk_score ?? project.riskScore ?? risk.score
  const level = project.risk_level ?? project.riskLevel ?? risk.level ?? riskLabel
  const explanation = project.explanation ?? project.reason ?? project.risk_explanation ?? risk.explanation ?? risk.reason
  const indicators = project.anomaly_indicators ?? project.anomalyIndicators ?? risk.anomaly_indicators ?? risk.anomalyIndicators

  const normalizedIndicators = Array.isArray(indicators)
    ? indicators.filter((indicator) => typeof indicator === 'string' && indicator.trim()).map((indicator) => indicator.trim())
    : []

  return {
    score: amountOrNull(score),
    level: textOrNull(level),
    explanation: textOrNull(explanation),
    indicators: normalizedIndicators,
  }
}

function normalizeProject(project, index) {
  const source = project && typeof project === 'object' ? project : {}

  return {
    projectId: textOrNull(source.project_id),
    state: textOrNull(source.state),
    district: textOrNull(source.district),
    projectType: textOrNull(source.project_type),
    approvedAmount: amountOrNull(source.approved_amount),
    expenditure: amountOrNull(source.expenditure),
    status: textOrNull(source.status),
    risk: riskOrNull(source),
    rowKey: textOrNull(source.project_id) || `project-row-${index}`,
  }
}

export function getHealth() {
  return request('/health')
}

export function getProjects() {
  return request('/projects').then((projects) => {
    if (!Array.isArray(projects)) {
      throw new Error('The projects response was not a list of project records.')
    }

    return projects.map(normalizeProject)
  })
}

export function getProject(projectId) {
  return request(`/projects/${encodeURIComponent(projectId)}`).then((project) => {
    if (!project || typeof project !== 'object' || Array.isArray(project)) {
      throw new Error('The project detail response was not a valid project record.')
    }

    const normalized = normalizeProject(project, 0)
    return {
      ...normalized,
      location: textOrNull(project.location),
      riskDetails: riskDetailsOrNull(project),
    }
  })
}

export function getApiRoot() {
  return request('/')
}
