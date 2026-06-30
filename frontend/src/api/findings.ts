import axios from 'axios'
import { API_BASE } from './config'

export interface FindingRow {
  batch_id: string
  sequence_id: string
  provider_name: string
  provider_npi: string
  issue_type: string
  severity: 'HIGH' | 'MEDIUM' | 'LOW'
  queue_name: 'PROVIDER_OPS' | 'DIRECTORY_OPS' | 'COMPLIANCE'
  status: string
  detected_at: string
  confidence_score: number
}

export interface FindingDetail {
  sequence_id: string
  provider_npi: string
  provider_tin: string
  provider_address: string
  provider_specialty: string
  provider_active_status: string
  provider_phone: string
  provider_taxonomy: string
  provider_network: string
  provider_contract_start: string
  provider_type: string
  provider_billing_npi: string
  evidence_summary: string
  ai_rationale: string
  impacted_fields: string
  confidence_score: number
  resolution_done: string
  resolution_by: string
  resolution_timestamp: string
}

export interface FindingsResponse {
  data: FindingRow[]
  total: number
  page: number
  size: number
}

export interface SummaryResponse {
  total_open: number
  high_count: number
  medium_count: number
  low_count: number
  provider_ops: number
  directory_ops: number
  compliance: number
  resolved_today: number
}

// Fetch paginated work queue list
export async function getFindings(params: {
  queue?: string
  status?: string
  severity?: string
  page?: number
  size?: number
  search?: string
  batchId?: string
}): Promise<FindingsResponse> {
  const res = await axios.get(`${API_BASE}/api/findings`, { params })
  return res.data
}

// Fetch detail for a single finding (popup modal data)
export async function getFindingDetail(sequenceId: string): Promise<FindingDetail> {
  const res = await axios.get(`${API_BASE}/api/findings/${encodeURIComponent(sequenceId)}/detail`)
  return res.data
}

// Fetch dashboard summary counts
export async function getSummary(): Promise<SummaryResponse> {
  const res = await axios.get(`${API_BASE}/api/findings/summary`)
  return res.data
}

// Resolve or mark false positive
export async function resolveFinding(
  sequenceId: string,
  payload: {
    status: 'Resolved' | 'False Positive'
    resolution_done: string
    resolution_by: string
  }
): Promise<void> {
  await axios.patch(`${API_BASE}/api/findings/${encodeURIComponent(sequenceId)}/resolve`, payload)
}
