const express = require('express')
const https   = require('https')
const router  = express.Router()

const BASE_URL   = process.env.AGENT_BASE_URL  || ''
const PROJECT    = process.env.AGENT_PROJECT   || ''
const AGENT_NAME = process.env.AGENT_NAME      || ''
const API_KEY    = process.env.AGENT_API_KEY   || ''

function httpsPost(url, body, headers) {
  return new Promise((resolve, reject) => {
    const parsed  = new URL(url)
    const payload = JSON.stringify(body)
    const options = {
      hostname: parsed.hostname,
      path:     parsed.pathname + parsed.search,
      method:   'POST',
      headers:  { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(payload), ...headers },
    }
    const req = https.request(options, res => {
      let data = ''
      res.on('data', chunk => data += chunk)
      res.on('end', () => resolve({ status: res.statusCode, body: data }))
    })
    req.on('error', reject)
    req.write(payload)
    req.end()
  })
}

function httpsGet(url, headers) {
  return new Promise((resolve, reject) => {
    const parsed  = new URL(url)
    const options = {
      hostname: parsed.hostname,
      path:     parsed.pathname + parsed.search,
      method:   'GET',
      headers,
    }
    const req = https.request(options, res => {
      let data = ''
      res.on('data', chunk => data += chunk)
      res.on('end', () => resolve({ status: res.statusCode, body: data }))
    })
    req.on('error', reject)
    req.end()
  })
}

// POST /api/agent/trigger
router.post('/trigger', async (req, res) => {
  try {
    const triggerUrl = `${BASE_URL}/api/projects/${PROJECT}/agents/${AGENT_NAME}/runs`
    console.log('Triggering agent at:', triggerUrl)

    const result = await httpsPost(
      triggerUrl,
      { input: { trigger: 'manual', source: 'ProviderGuard UI' } },
      { 'api-key': API_KEY, 'Authorization': `Bearer ${API_KEY}` }
    )

    let data
    try { data = JSON.parse(result.body) } catch { data = { raw: result.body } }

    console.log('Agent response:', result.status, result.body)

    if (result.status >= 200 && result.status < 300) {
      return res.json({ success: true, status: result.status, data })
    } else {
      return res.status(result.status).json({ error: `Agent returned ${result.status}`, detail: data })
    }
  } catch (err) {
    console.error('Agent trigger error:', err.message)
    res.status(500).json({ error: err.message })
  }
})

// GET /api/agent/status
router.get('/status', async (_req, res) => {
  try {
    const statusUrl = `${BASE_URL}/api/projects/${PROJECT}/agents/${AGENT_NAME}`
    const result = await httpsGet(statusUrl, { 'api-key': API_KEY, 'Authorization': `Bearer ${API_KEY}` })
    let data
    try { data = JSON.parse(result.body) } catch { data = { raw: result.body } }
    res.json({ status: result.status, data })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

module.exports = router
