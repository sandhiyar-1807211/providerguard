const express    = require('express')
const cors       = require('cors')
require('dotenv').config()

const windowsAuth    = require('./middleware/windowsAuth')
const findingsRouter = require('./routes/findings')
const batchesRouter  = require('./routes/batches')
const auditRouter    = require('./routes/audit')
const agentRouter    = require('./routes/agent')

const app  = express()
const PORT = process.env.PORT || 3001

// Map Windows SAM account names to display info
const USER_MAP = {
  'padmasriv':  { name: 'Padmasri Varadharajan', role: 'Provider OPS Analyst' },
  'sandhiyar':  { name: 'Sandhiya Raja',          role: 'Provider OPS Analyst' },
  'gurpreetk':  { name: 'Gurpreet Kaur',           role: 'Admin' },
}

app.use(cors({ origin: ['http://localhost:5173', 'http://localhost:5174', 'http://localhost:5175'], credentials: true }))
app.use(express.json())
app.use(windowsAuth)

// Health check
app.get('/health', (_req, res) => res.json({ status: 'ok', db: 'postgres' }))

// Current Windows user — used by frontend to show logged-in identity
app.get('/api/me', (req, res) => {
  const raw      = req.windowsUser || 'unknown'          // e.g. "INFICS\\padmasriv"
  const username = raw.includes('\\') ? raw.split('\\')[1].toLowerCase() : raw.toLowerCase()
  const mapped   = USER_MAP[username] || { name: username, role: 'Provider OPS Analyst' }
  const initials = mapped.name.split(' ').map(p => p[0]).join('').slice(0, 2).toUpperCase()
  res.json({ windowsUser: raw, username, name: mapped.name, initials, role: mapped.role })
})

// Schema inspection
app.get('/api/schema', async (_req, res) => {
  const { query } = require('./db')
  try {
    const cols   = await query(`SELECT column_name, data_type FROM information_schema.columns WHERE table_schema = 'MarketPlace_Agent_HandOff' AND table_name = 'uc01_provider_issues' ORDER BY ordinal_position`)
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
  console.log(`ProviderGuard API running on http://localhost:${PORT}`)
  console.log('Schema:', process.env.DB_SCHEMA || 'MarketPlace_Agent_HandOff')
  agentRouter.warmupAuth()
})
