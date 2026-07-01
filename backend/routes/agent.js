const express = require('express')
const router  = express.Router()
const https   = require('https')
const fs      = require('fs')
const path    = require('path')
const msal    = require('@azure/msal-node')

const BASE_URL    = process.env.AGENT_BASE_URL  || ''
const PROJECT     = process.env.AGENT_PROJECT   || ''
const AGENT_NAME  = process.env.AGENT_NAME      || ''
const AGENT_MODEL = process.env.AGENT_MODEL     || 'gpt-4.1'
const TENANT_ID   = process.env.AZURE_TENANT_ID || 'infics.onmicrosoft.com'

const SCOPE         = 'https://ml.azure.com/.default'
const API_VERSION   = '2025-11-15-preview'
const ENDPOINT_PATH = `/api/projects/${PROJECT}/agents/${AGENT_NAME}/endpoint/protocols/openai/responses`

// Token cache file — stores refresh token so device code is only needed ~once per 90 days
const CACHE_FILE = path.join(__dirname, '..', '.token-cache.json')

// ── MSAL file-based cache plugin ──────────────────────────────────────────────
const cachePlugin = {
  beforeCacheAccess: async (cacheContext) => {
    if (fs.existsSync(CACHE_FILE)) {
      try {
        cacheContext.tokenCache.deserialize(fs.readFileSync(CACHE_FILE, 'utf8'))
      } catch (_) {
        // Corrupted cache — ignore, will re-auth
      }
    }
  },
  afterCacheAccess: async (cacheContext) => {
    if (cacheContext.cacheHasChanged) {
      fs.writeFileSync(CACHE_FILE, cacheContext.tokenCache.serialize(), 'utf8')
    }
  },
}

// Azure CLI public client ID — registered in every Azure AD tenant
const CLIENT_ID = '04b07795-8ddb-461a-bbee-02f9e1bf7b46'

const msalApp = new msal.PublicClientApplication({
  auth: {
    clientId:  CLIENT_ID,
    authority: `https://login.microsoftonline.com/${TENANT_ID}`,
  },
  cache: { cachePlugin },
})

// ── Token acquisition ─────────────────────────────────────────────────────────
let _cachedAccount = null  // keep account reference after first auth

async function getToken() {
  // 1. Try silent refresh using previously cached account
  const accounts = await msalApp.getTokenCache().getAllAccounts()
  const account  = _cachedAccount || (accounts.length > 0 ? accounts[0] : null)

  if (account) {
    try {
      const result = await msalApp.acquireTokenSilent({ account, scopes: [SCOPE] })
      _cachedAccount = result.account
      return result.accessToken
    } catch (silentErr) {
      console.log('Silent token refresh failed — falling back to device code:', silentErr.message)
    }
  }

  // 2. Device code flow (only runs when no valid cached session)
  console.log('\n========================================')
  console.log('AZURE SIGN-IN REQUIRED (first run or token expired)')
  console.log('========================================')
  const result = await msalApp.acquireTokenByDeviceCode({
    scopes: [SCOPE],
    deviceCodeCallback: (response) => {
      console.log('Open this URL in your browser:')
      console.log(response.verificationUri)
      console.log('Enter code:', response.userCode)
      console.log('Waiting for sign-in...\n')
    },
  })

  _cachedAccount = result.account
  console.log('✅ Azure sign-in successful — token cached to disk (valid ~90 days)\n')
  return result.accessToken
}

// ── Called by server.js on startup so auth happens immediately, not on first button click ──
async function warmupAuth() {
  console.log('🔐 Pre-authenticating with Azure AD...')
  try {
    await getToken()
    console.log('🔐 Azure AD auth ready.')
  } catch (err) {
    console.error('🔐 Azure AD pre-auth failed:', err.message)
    console.error('    The /api/agent/trigger endpoint will retry auth when called.')
  }
}

// ── HTTPS helper ──────────────────────────────────────────────────────────────
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

// ── Parse batch ID from agent response output array ───────────────────────────
function parseAgentOutput(output) {
  if (!Array.isArray(output)) return { batchId: null, summary: null }
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

// ── POST /api/agent/trigger ───────────────────────────────────────────────────
router.post('/trigger', async (req, res) => {
  if (!AGENT_NAME) return res.status(500).json({ error: 'AGENT_NAME not set in .env' })

  try {
    console.log('Getting Azure AD token...')
    const token = await getToken()
    console.log('Token ready. Calling agent...')

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
      return res.json({ success: true, batchId, summary, responseId: data.id || null })
    }

    console.log(`Agent response [${result.status}]:`, JSON.stringify(data, null, 2))
    return res.status(result.status).json({ error: `Agent returned ${result.status}`, detail: data })
  } catch (err) {
    console.error('Agent trigger error:', err.message)
    res.status(500).json({ error: err.message })
  }
})

// ── GET /api/agent/status ─────────────────────────────────────────────────────
router.get('/status', (_req, res) => {
  const cacheExists = fs.existsSync(CACHE_FILE)
  res.json({ agent: AGENT_NAME, model: AGENT_MODEL, apiVersion: API_VERSION, scope: SCOPE, tokenCached: cacheExists })
})

module.exports = router
module.exports.warmupAuth = warmupAuth
