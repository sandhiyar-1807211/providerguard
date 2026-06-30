const express = require('express')
const router  = express.Router()
const { query } = require('../db')

// GET /api/audit
router.get('/', async (req, res) => {
  try {
    const { search, action } = req.query
    const conditions = []
    const params     = []

    if (action && action !== 'All actions') {
      params.push(action)
      conditions.push(`action = $${params.length}`)
    }
    if (search) {
      params.push(`%${search}%`)
      conditions.push(`(details ILIKE $${params.length} OR performed_by ILIKE $${params.length} OR batch_id ILIKE $${params.length})`)
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : ''
    const result = await query(
      `SELECT * FROM uc01_audit_log ${where} ORDER BY action_timestamp DESC LIMIT 200`,
      params
    )

    // Normalize for UI
    res.json(result.rows.map(r => ({
      ...r,
      detail:    r.details,
      time:      new Date(r.action_timestamp).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }),
      user:      r.performed_by,
      issueId:   (r.details || '').split(' | ')[0] || 'SYSTEM',
      type:      actionToType(r.action),
    })))
  } catch (err) {
    console.error('GET /audit error:', err.message)
    res.status(500).json({ error: err.message })
  }
})

function actionToType(action) {
  if (!action) return 'system'
  const a = action.toLowerCase()
  if (a.includes('resolved') || a.includes('accepted')) return 'accept'
  if (a.includes('false positive'))                       return 'reject'
  if (a.includes('flagged') || a.includes('agent') || a.includes('system')) return 'system'
  if (a.includes('reassigned') || a.includes('escalated')) return 'flag'
  return 'system'
}

module.exports = router
