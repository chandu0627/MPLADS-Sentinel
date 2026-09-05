const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000').replace(/\/$/, '')

async function request(path) {
  let response

  try {
    response = await fetch(`${API_BASE_URL}${path}`)
  } catch (error) {
    console.error('MPLADS API request failed', { path, error })
    throw new Error(`Unable to reach the backend at ${API_BASE_URL}. Start FastAPI and try again.`)
  }

  if (!response.ok) {
    console.error('MPLADS API returned an error', { path, status: response.status })
    throw new Error(`The data service is unavailable right now (status ${response.status}).`)
  }

  try {
    return await response.json()
  } catch (error) {
    console.error('MPLADS API returned invalid JSON', { path, error })
    throw new Error('The backend returned an invalid JSON response.')
  }
}

function datasetError(datasetName, message) {
  return new Error(`${datasetName} data could not be loaded: ${message}`)
}

function normalizeColumns(columns, datasetName) {
  if (!Array.isArray(columns) || columns.some((column) => !column || typeof column !== 'object' || typeof column.name !== 'string' || !column.name.trim())) {
    throw datasetError(datasetName, 'the response contained invalid column metadata.')
  }

  return columns.map((column) => ({
    name: column.name,
    type: typeof column.type === 'string' ? column.type : 'string',
  }))
}

function normalizeDatasetResponse(datasetName, payload, requireRecords = false) {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    throw datasetError(datasetName, 'the response was not a valid dataset object.')
  }

  const rowCount = Number(payload.row_count)
  if (!Number.isInteger(rowCount) || rowCount < 0) {
    throw datasetError(datasetName, 'the response contained an invalid row count.')
  }

  const columns = normalizeColumns(payload.columns, datasetName)
  const records = payload.records
  if (requireRecords && !Array.isArray(records)) {
    throw datasetError(datasetName, 'the response contained invalid records.')
  }
  if (Array.isArray(records) && records.some((record) => !record || typeof record !== 'object' || Array.isArray(record))) {
    throw datasetError(datasetName, 'the response contained an invalid record.')
  }

  return {
    datasetName: typeof payload.dataset_name === 'string' ? payload.dataset_name : datasetName,
    source: textOrNull(payload.source),
    reportingPeriod: textOrNull(payload.reporting_period),
    rowCount,
    grain: textOrNull(payload.grain),
    columns,
    qualityNotes: Array.isArray(payload.quality_notes) ? payload.quality_notes.filter((note) => typeof note === 'string') : [],
    records: Array.isArray(records) ? records : [],
  }
}

function getDatasetSummary(datasetName) {
  return request(`/datasets/${datasetName}/summary`).then((payload) => normalizeDatasetResponse(datasetName, payload))
}

function getDatasetRecords(datasetName) {
  return request(`/datasets/${datasetName}/records`).then((payload) => normalizeDatasetResponse(datasetName, payload, true))
}

function getDatasetMetadata(datasetName) {
  return request(`/datasets/${datasetName}/metadata`).then((payload) => normalizeDatasetResponse(datasetName, payload))
}

function textOrNull(value) {
  return typeof value === 'string' && value.trim() ? value.trim() : null
}

function amountOrNull(value) {
  if (value === null || value === undefined || value === '') return null

  const amount = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(amount) ? amount : null
}

function normalizeRiskRecord(record, index) {
  const source = record && typeof record === 'object' ? record : {}
  const score = amountOrNull(source.anomaly_score)
  const level = textOrNull(source.risk_level)?.toUpperCase() || 'NOT_ASSESSED'

  return {
    serialNumber: textOrNull(source.serial_number),
    state: textOrNull(source.state),
    recordType: textOrNull(source.record_type),
    mpName: textOrNull(source.mp_name),
    constituency: textOrNull(source.constituency),
    allocatedAmount: amountOrNull(source.allocated_amount_inr),
    score,
    level,
    explanation: textOrNull(source.explanation),
    assessmentStatus: textOrNull(source.assessment_status) || 'not_assessed',
    rowKey: textOrNull(source.serial_number) || `${source.record_type || 'risk'}-row-${index}`,
  }
}

function normalizeRiskResponse(datasetName, payload) {
  if (!Array.isArray(payload)) {
    throw new Error(`${datasetName} risk response was not a list of records.`)
  }

  return payload.map(normalizeRiskRecord)
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

export function getAllocationSummary() {
  return getDatasetSummary('allocation')
}

export function getAllocationRecords() {
  return getDatasetRecords('allocation')
}

export function getAllocationMetadata() {
  return getDatasetMetadata('allocation')
}

export function getAnnexureSummary() {
  return getDatasetSummary('annexure')
}

export function getAnnexureRecords() {
  return getDatasetRecords('annexure')
}

export function getAnnexureMetadata() {
  return getDatasetMetadata('annexure')
}

export function getAllocationRisk() {
  return request('/risk/allocation').then((payload) => normalizeRiskResponse('Allocation', payload))
}

export function getAnnexureRisk() {
  return request('/risk/annexure').then((payload) => normalizeRiskResponse('Annexure', payload))
}
