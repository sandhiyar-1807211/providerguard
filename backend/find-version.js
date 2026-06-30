/**
 * Uses the installed openai npm SDK (v6) to test api-versions.
 * The SDK formats requests correctly — so any error is purely about the version.
 * Run: node find-version.js
 */
require('dotenv').config()
const https      = require('https')
const { OpenAI } = require('openai')
const { DeviceCodeCredential } = require('@azure/identity')
const API_KEY    = process.env.AGENT_API_KEY || ''

const BASE_URL   = 'https://senzai-lab.services.ai.azure.com'
const PROJECT    = 'senzai-lab-project'
const AGENT_NAME = 'Test-Agent-pg'
const TENANT_ID  = 'infics.onmicrosoft.com'
const SCOPE      = 'https://cognitiveservices.azure.com/.default'

// The base URL that the Python SDK uses for get_openai_client(agent_name=...)
const AGENT_BASE = `${BASE_URL}/api/projects/${PROJECT}/agents/${AGENT_NAME}/endpoint/protocols/openai`

const versions = [
  // ── Versions the backend TOLD US it supports (from UnsupportedApiVersionValue error) ──
  '2025-11-15-preview',   // newest — backend listed this explicitly
  '2025-10-15-preview',   // backend listed this explicitly
  '2025-07-31-preview',   // backend listed this explicitly
  '2025-05-15-preview',   // backend listed this — NOTE: different from 2025-05-01-preview
  '2025-05-01',           // backend listed this (GA) — previously blocked by gateway
  '2024-07-01-preview',   // backend listed this explicitly
  // ── Previously tested (all blocked by services.ai.azure.com gateway) ──
  '2025-04-01-preview',
  '2025-03-01-preview',
  '2025-05-01-preview',
  '2025-01-01-preview',
  '2024-12-01-preview',
  '2024-10-01-preview',
]

;(async () => {
  console.log('Authenticating...')
  const cred = new DeviceCodeCredential({ tenantId: TENANT_ID, userPromptCallback: i => console.log(`\nGo to ${i.verificationUri}\nCode: ${i.userCode}\n`) })
  const { token } = await cred.getToken(SCOPE)
  console.log('Token acquired.\n')

  for (const v of versions) {
    const client = new OpenAI({
      baseURL:      AGENT_BASE,
      apiKey:       token,            // Bearer token — openai SDK sends as Authorization: Bearer <apiKey>
      defaultQuery: v ? { 'a