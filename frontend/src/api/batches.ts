import axios from 'axios'
import { API_BASE } from './config'

export interface BatchRow {
  batch_id: string
  run_date: string
  finding_count: number
  high_count: number
  medium_count: number
  low_count: number
}

// Fetch all batches for the batch ID grouping in work queue
export async function getBatches(): Promise<BatchRow[]> {
  const res = await axios.get(`${API_BASE}/api/batches`)
  return res.data
}
