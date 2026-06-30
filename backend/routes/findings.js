const express = require('express')
const router  = express.Router()
const { query } = require('../db')

// GET /api/findings
router.get('/', async (req, res) => {
  try {
    const { status, severity, queue, batch, search } = req.query
    const conditions = []
    const params     = []

    if (status)   { params.push(status);   conditions.push(`status = $${params.length}`) }
    if (severity) { params.push(severity); conditions.push(`severity = $${params.length}`) }
    if (queue)    { params.push(queue);    conditions.push(`queue_name = $${params.length}`) }
    if (batch)    { params.push(batch);    conditions.push(`batch_id = $${params.length}`) }
    if (search) {
      params.push(`%${search}%`)
      conditions.push(`(provider_name ILIKE $${params.length} OR sequence_id ILIKE $${params.length} OR issue_type ILIKE $${params.length})`)
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : ''
    const result = await query(
      `SELECT * FROM uc01_provider_issues ${where} ORDER BY detected_at DESC`,
      params
    )

    // Normalize rows to match UI field names
    res.json(result.rows.map(normalizeIssue))
  } catch (err) {
    console.error('GET /findings error:', err.message)
    res.status(500).json({ error: err.message })
  }
})

// GET /api/findings/summary
router.get('/summary', async (req, res) => {
  try {
    const result = await query(`
      SELECT
        COUNT(*)                                                                        AS total,
        COUNT(*) FILTER (WHERE status IN ('OPEN', 'Open to Resolve'))                  AS open,
        COUNT(*) FILTER (WHERE severity = 'HIGH'
                          AND  status  IN ('OPEN', 'Open to Resolve'))                 AS high_priority,
        COUNT(*) FILTER (WHERE status IN ('RESOLVED', 'Resolved'))                     AS resolved,
        COUNT(*) FILTER (WHERE status IN ('FALSE_POSITIVE', 'False Positive'))         AS false_positive
      FROM uc01_provider_issues
    `)
    res.json(result.rows[0])
  } catch (err) {
    console.error('GET /findings/summary error:', err.message)
    res.status(500).json({ error: err.message })
  }
})

// GET /api/findings/:id
router.get('/:id', async (req, res) => {
  try {
    const result = await query(
      `SELECT * FROM uc01_provider_issues WHERE sequence_id = $1`,
      [req.params.id]
    )
    if (!result.rows.length) return res.status(404).json({ error: 'Not found' })
    res.json(normalizeIssue(result.rows[0]))
  } catch (err) {
    console.error('GET /findings/:id error:', err.message)
    res.status(500).json({ error: err.message })
  }
})

// PATCH /api/findings/:id/resolve
router.patch('/:id/resolve', async (req, res) => {
  try {
    const { status, resolution_done, resolution_by } = req.body
    const result = await query(
      `UPDATE uc01_provider_issues
          SET status               = $1,
              resolution_done      = $2,
              resolution_by        = $3,
              resolution_timestamp = NOW()::text
        WHERE sequence_id = $4
        RETURNING *`,
      [status, resolution_done, resolution_by, req.params.id]
    )
    if (!result.rows.length) return res.status(404).json({ error: 'Not found' })

    // Write to audit log
    await query(
      `INSERT INTO uc01_audit_log (batch_id, action, performed_by, details, action_timestamp)
       VALUES ($1, $2, $3, $4, NOW())`,
      [
        result.rows[0].batch_id,
        status,
        resolution_by,
        `${req.params.id} | ${resolution_done || 'Marked as ' + status}`
      ]
    )

    res.json(normalizeIssue(result.rows[0]))
  } catch (err) {
    console.error('PATCH /findings/:id/resolve error:', err.message)
    res.status(500).json({ error: err.message })
  }
})

// Map status values from agent DB → UI expected values
const statusMap = {
  'OPEN':           'Open to Resolve',
  'RESOLVED':       'Resolved',
  'FALSE_POSITIVE': 'False Positive',
  'Open to Resolve':'Open to Resolve',
  'Resolved':       'Resolved',
  'False Positive': 'False Positive',
}

// Map queue names from agent DB → UI expected values
const queueMap = {
  'PROVIDER_OPS':  'PROVIDER_OPS',
  'DIRECTORY_OPS': 'DIRECTORY_OPS',
  'COMPLIANCE':    'COMPLIANCE',
  'DATA_QUALITY':  'PROVIDER_OPS',  // map agent queue to UI queue
}

// Map DB column names → UI field names
function normalizeIssue(row) {
  // Parse impacted_fields if it's a JSON string
  let impactedFields = row.impacted_fields
  if (typeof impactedFields === 'string') {
    try { impactedFields = JSON.parse(impactedFields) } catch { impactedFields = impactedFields.split(',') }
  }

  // confidence_score: if already decimal (< 1), keep as-is; if > 1, divide by 100
  const rawScore = parseFloat(row.confidence_score) || 0
  const confidence_score = rawScore > 1 ? rawScore / 100 : rawScore

  return {
    ...row,
    status:          statusMap[row.status] || row.status,
    queue_name:      queueMap[row.queue_name] || row.queue_name,
    confidence_score,
    impacted_fields: impactedFields,
    // UI expects these names
    provider:    row.provider_name,
    npi:         row.provider_npi,
    specialty:   row.provider_specialty,
    batchId:     row.batch_id,
    detectedAt:  row.detected_at,
    assignedTo:  row.resolution_by || '',
  }
}

module.exports = router
