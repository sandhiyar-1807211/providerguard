const express    = require('express')
const cors       = require('cors')
require('dotenv').config()

const findingsRouter = require('./routes/findings')
const batchesRouter  = require('./routes/batches')
const auditRouter    = require('./routes/audit')

const app  = express()
const PORT = process.env.PORT || 3001

app.use(cors({ origin: ['http://localhost:5173', 'http://localhost:5174'] }))
app.use(express.json())

// Health check
app.get('/health', (_req, res) => res.json({ status: 'ok', db: 'postgres' }))

// Routes
app.use('/api/findings', findingsRouter)
app.use('/api/batches',  batchesRouter)
app.use('/api/audit',    auditRouter)

app.listen(PORT, () => {
  console.log(`ProviderGuard API running on http://localhost:${PORT}`)
  console.log(`Schema: ${process.env.DB_SCHEMA}`)
})
