const express = require('express')
const router  = express.Router()
const https   = require('https')
const { DeviceCodeCredential } = require('@azure/identity')

const BASE_URL    = process.env.AGENT_BASE_URL  || ''
const PROJECT     = process.env.AGENT_PROJECT   || ''
const AGENT_NAME  = process.env.AGENT_NAME      || ''
const AGENT_MODEL = process.env.AGENT_MODEL     || 'gpt-4.1'
const TENANT_ID   = process.env.AZURE_TENANT_ID || 'infics.onmicrosoft.com'

const SCOPE         = 'https://ml.azure.com/.default'
const API_VERSION   = '2025-11-15-preview'
const ENDPOINT_PATH = `/api/projects/${PROJECT}/agents/${AGENT_NAME}/endpoint/protocols/openai/responses`

let _credential  = null
let _token       = null
let _tokenExpiry = 0

async function getToken() {
  if (_token && Date.now() < _tokenExpiry - 60000) return _token
  if (!_credential) {
    _credential = new DeviceCodeCredential({
      tenantId: TENANT_ID,
      userPromptCallback: (info) => {
        console.log('\n========================================')
        console.log('AZURE AUTH REQUIRED — open this URL:')
        console.log(info.verificationUri)
        console.log('Enter code:', info.userCode)
        console.log('========================================\n')
      },
    })
  }
  const resp   = await _credential.getToken(SCOPE)
  _token       = resp.token
  _tokenExpiry = resp.expiresOnTimestamp
  return _token
}

function httpsPost(url, body, token) {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify(body)
    const parsed  = new URL(url)
    const req = https.request({
      hostname: parsed.hostname,
      path:     parsed.pathname + parsed.search,
      method:   'POST',
      headers:  {
        'Content-Type':   'application/json',
        'Content-Length': Buffer.byteLength(payload),
        'Authorization':  `Bearer ${token}`,
      },
    }, res => {
      let data = ''
      res.on('data', c => data += c)
      res.on('end', () => resolve({ status: res.statusCode, body: data }))
    })
    req.on('error', reject)
    req.write(payload)
    req.end()
  })
}

// Extract batch ID and step summary from agent output array
function parseAgentOutput(output) {
  if (!Array.isArray(output)) return { batchId: null, summary: null }
  // Look for Step 0 message with batch ID
  for (const item of output) {
    if (item.type === 'message' && item.content) {
      for (const c of item.content) {
        const text = c.text || ''
        const m = text.match(/Batch ID[:\s]+([A-Z_0-9]+)/)
        if (m) return { batchId: m[1], summary: text.slice(0, 300) }
      }
    }
  }
  return { batchId: null, summary: null }
}

// POST /api/agent/trigger
router.post('/trigger', async (req, res) => {
  if (!AGENT_NAME) return res.status(500).json({ error: 'AGENT_NAME not set in .env' })

  try {
    console.log('Getting Azure AD token (scope: ml.azure.com)...')
    const token = await getToken()
    console.log('Token acquired. Calling agent...')

    const url    = `${BASE_URL}${ENDPOINT_PATH}?api-version=${API_VERSION}`
    const result = await httpsPost(url, {
      model: AGENT_MODEL,
      input: 'Run provider data integrity pipeline — triggered from ProviderGuard UI',
    }, token)

    let data
    try { data = JSON.parse(result.body) } catch { data = { raw: result.body } }

    if (result.status >= 200 && result.status < 300) {
      const { batchId, summary } = parseAgentOutput(data.output)
      console.log(`✅ Agent triggered successfully. Batch: ${batchId}`)
      return res.json({
        success: true,
        batchId,
        summary,
        responseId: data.id || null,
      })
    }

    console.log(`Agent response [${result.status}]:`, JSON.stringify(data, null, 2))
    return res.status(result.status).json({ error: `Agent returned ${result.status}`, detail: data })
  } catch (err) {
    console.error('Agent trigger error:', err.message)
    res.status(500).json({ error: err.message })
  }
})

// GET /api/agent/status
router.get('/status', (_req, res) => {
  res.json({ agent: AGENT_NAME, model: AGENT_MODEL, apiVersion: API_VERSION, scope: SCOPE })
})

module.exports = router
