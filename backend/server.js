const express    = require('express')
const cors       = require('cors')
require('dotenv').config()

const windowsAuth    = require('./middleware/windowsAuth')
const findingsRouter = require('./routes/findings')
const batchesRouter  = require('./routes/batches')
const auditRouter    = require('./routes/audit')
const agentRouter    = require('./routes/agent')

const app  = express()
const PORT = process.env.PORT || 3003

const USER_MAP = {
  'padmasriv':  { name: 'Padmasri Varadharajan', role: 'Provider OPS Analyst' },
  'sandhiyar':  { name: 'Sandhiya Raja',          role: 'Provider OPS Analyst' },
  'gurpreetk':  { name: 'Gurpreet Kaur',           role: 'Admin' },
}

app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:5174', 'http://localhost:5175'],
  credentials: true,
}))
app.use(express.json())

// ── Public route: frontend reads this to decide auth mode ──────
app.get('/api/auth/config', (_req, res) => {
  res.json({
    authEnabled: windowsAuth.AUTH_ENABLED,
    clientId:    process.env.CLIENT_ID   || '',
    tenantId:    process.env.TENANT_ID   || '',
    redirectUri: 'http://localhost:5175',
  })
})

// ── All routes below require auth ──────────────────────────────
app.use(windowsAuth)

// Health check
app.get('/health', (_req, res) => res.json({ status: 'ok' }))

// Current user — returns SSO claims or NTLM-mapped user
app.get('/api/me', (req, res) => {
  if (windowsAuth.AUTH_ENABLED && req.ssoUser) {
    return res.json(req.ssoUser)
  }
  // NTLM fallback
  const raw      = req.windowsUser || 'unknown'
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
  } catch (e) { res.status(500).json({ error: e.message }) }
})

app.use('/api/findings', findingsRouter)
app.use('/api/batches',  batchesRouter)
app.use('/api/audit',    auditRouter)
app.use('/api/agent',    agentRouter)

app.listen(PORT, () => {
  console.log(`ProviderGuard API running on http://localhost:${PORT}`)
  console.log(`Auth mode: ${windowsAuth.AUTH_ENABLED ? 'Azure AD SSO' : 'NTLM Windows Auth'}`)
  agentRouter.warmupAuth()
})
