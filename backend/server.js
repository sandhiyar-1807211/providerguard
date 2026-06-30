const express    = require('express')
const cors       = require('cors')
require('dotenv').config()

const findingsRouter = require('./routes/findings')
const batchesRouter  = require('./routes/batches')
const auditRouter    = require('./routes/audit')
const agentRouter    = require('./routes/agent')

const app  = express()
const PORT = process.env.PORT || 3001

app.use(cors({ origin: ['http://localhost:5173', 'http://localhost:5174'] }))
app.use(express.json())

// Health check
app.get('/health', (_req, res) => res.json({ status: 'ok', db: 'postgres' }))

// Schema inspection — see all columns in uc01_provider_issues
app.get('/api/schema', async (_req, res) => {
  const { query } = require('./db')
  try {
    const cols = await query(`SELECT column_name, data_type FROM information_schema.columns WHERE table_schema = 'MarketPlace_Agent_HandOff' AND table_name = 'uc01_provider_issues' ORDER BY ordinal_position`)
    const sample = await query(`SELECT * FROM uc01_provider_issues LIMIT 1`)
    res.json({ columns: cols.rows, sample: sample.rows[0] })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// Routes
app.use('/api/findings', findingsRouter)
app.use('/api/batches',  batchesRouter)
app.use('/api/audit',    auditRouter)
app.use('/api/agent',    agentRouter)

app.listen(PORT, () => {
  console.log(`ProviderGuard API runni