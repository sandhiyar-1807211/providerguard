export type Priority = 'HIGH' | 'MEDIUM' | 'LOW'
export type IssueStatus = 'Open to Resolve' | 'Resolved' | 'False Positive'
export type IssueType =
  | 'DUPLICATE_RECORD'
  | 'CONFLICT_DETECTED'
  | 'DIRECTORY_MISMATCH'
  | 'CLAIMS_ACTIVITY_MISMATCH'
  | 'ONBOARDING_ISSUE'
  | 'CREDENTIALING_MISMATCH'
  | 'NETWORK_CONTRACT_MISMATCH'
  | 'ENROLLMENT_MISMATCH'
  | 'MASTER_DATA_QUALITY'
  | 'ENCOUNTER_MISMATCH'

export type QueueName = 'PROVIDER_OPS' | 'DIRECTORY_OPS' | 'COMPLIANCE'
export type Classification = 'CONFIRMED' | 'CONFIRMED_DUPLICATE' | 'PROBABLE' | 'PROBABLE_MATCH' | 'FLAGGED'

// Exact schema from Azure AI Foundry agent output
export interface Issue {
  sequence_id: string          // e.g. PDM_Monitor_260605143022-ReqID_08-001
  req_id: string               // ReqID_01 through ReqID_10
  issue_type: IssueType
  queue_name: QueueName
  provider_id_a: string        // primary provider ID
  provider_id_b: string | null // secondary provider ID (for duplicates) or null
  severity: Priority
  classification: Classification
  confidence_score: number     // 0.0 to 1.0
  impacted_fields: string[] | string  // array or comma-separated string from agent
  evidence_summary: string     // one sentence describing the discrepancy
  ai_rationale: string         // 1-3 sentences explaining the risk
  requires_human_review: boolean
  status: IssueStatus
  resolution_done: string
  resolution_by: string
  resolution_timestamp: string
  batchId: string              // e.g. PDM_Monitor_260605143022

  // UI display helpers (derived from above)
  provider: string             // display name
  specialty: string
  npi: string
  detectedAt: string
  assignedTo: string
  // Fields from DB (not in original type but returned by backend)
  provider_npi: string | null
  provider_tin: string | null
  provider_address: string | null
  provider_specialty: string | null
  provider_active_status: string | null
  provider_phone: string | null
  provider_taxonomy: string | null
  provider_network: string | null
  provider_contract_start: string | null
  provider_type: string | null
  provider_billing_npi: string | null
  provider_name: string | null

  // Record B fields (duplicate comparison — Module 08)
  record_b_npi: number | null
  record_b_tin: string | null
  record_b_address: string | null
  record_b_specialty: string | null
  record_b_active_status: string | null
  record_b_name: string | null
}

export interface AgentRun {
  batchId: string              // PDM_Monitor_260605143022
  runNumber: number
  time: string
  date: string
  status: 'Success' | 'Partial' | 'Failed'
  agentsRan: string[]
  issuesFound: number
  duration: string
}

export interface User {
  name: string
  initials: string
  role: string
  assignedIssues: number
  highPriority: number
  resolvedToday: number
  pendingOver24h: number
}

// Display label mappings for UI
export const QUEUE_LABELS: Record<QueueName, string> = {
  PROVIDER_OPS: 'Provider Ops',
  DIRECTORY_OPS: 'Directory Ops',
  COMPLIANCE: 'Compliance',
}

export const ISSUE_TYPE_LABELS: Record<IssueType, string> = {
  DUPLICATE_RECORD: 'Duplicate',
  CONFLICT_DETECTED: 'Conflict',
  DIRECTORY_MISMATCH: 'Dir Mismatch',
  CLAIMS_ACTIVITY_MISMATCH: 'Claims Mismatch',
  ONBOARDING_ISSUE: 'Onboarding',
  CREDENTIALING_MISMATCH: 'Credentialing',
  NETWORK_CONTRACT_MISMATCH: 'Network Mismatch',
  ENROLLMENT_MISMATCH: 'Enrollment',
  MASTER_DATA_QUALITY: 'Master Data',
  ENCOUNTER_MISMATCH: 'Encounter',
}

export const SEVERITY_LABELS: Record<string, string> = {
  HIGH: 'High',
  MEDIUM: 'Medium',
  LOW: 'Low',
  PROBABLE: 'Medium',       // agent bug — maps PROBABLE to Medium
  CONFIRMED: 'High',        // fallback
  PROBABLE_MATCH: 'Medium', // fallback
}

// Helper to normalize severity from agent (handles agent bugs)
export function normalizeSeverity(s: string): Priority {
  if (s === 'HIGH') return 'HIGH'
  if (s === 'LOW') return 'LOW'
  return 'MEDIUM' // PROBABLE, PROBABLE_MATCH, MEDIUM all map to MEDIUM
}

// Helper to normalize impacted_fields — agent returns string or array
export function normalizeFields(fields: string | string[] | null | undefined): string[] {
  if (!fields) return []
  if (Array.isArray(fields)) return fields
  try { return JSON.parse(fields) } catch { return [fields] }
}
