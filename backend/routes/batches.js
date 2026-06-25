const express = require('express')
const router  = express.Router()
const { query } = require('../db')

// GET /api/batches
router.get('/', async (req, res) => {
  try {
    const result = await query(`
      SELECT
        batch_id                                                      AS "batchId",
        MIN(detected_at)                                              AS run_time,
        COUNT(*)                                                      AS total_issues,
        COUNT(*) FILTER (WHERE severity = 'HIGH')                    AS high,
        COUNT(*) FILTER (WHERE severity = 'MEDIUM')                  AS medium,
        COUNT(*) FILTER (WHERE severity = 'LOW')                     AS low,
        COUNT(*) FILTER (WHERE status IN ('RESOLVED', 'Resolved'))                     AS resolved,
        COUNT(*) FILTER (WHERE status IN ('OPEN', 'Open to Resolve'))                AS open,
        COUNT(*) FILTER (WHERE status IN ('FALSE_POSITIVE', 'False Positive'))       AS false_positive
      FROM uc01_provider_issues
      GROUP BY batch_id
      ORDER BY run_time DESC
    `)
    res.json(result.rows)
  } catch (err) {
    console.error('GET /batches error:', err.message)
    res.status(500).json({ error: err.message })
  }
})

module.exports = router
