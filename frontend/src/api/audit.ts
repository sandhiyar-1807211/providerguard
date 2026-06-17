import axios from 'axios'
import { API_BASE } from './config'

export interface AuditEntry {
  id: number
  action: string
  entity_id: string
  performed_by: string
  timestamp: string
  notes: string
}

// Fetch audit trail
export async function getAuditLog(params: {
  page?: number
  size?: number
  search?: string
}): Promise<{ data: AuditEntry[]; page: number; size: number }> {
  const res = await axios.get(`${API_BASE}/api/audit`, { params })
  return res.data
}
