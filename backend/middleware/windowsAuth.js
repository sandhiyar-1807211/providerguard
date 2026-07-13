const NodeSSPI   = require('node-sspi')
const jwt        = require('jsonwebtoken')
const jwksClient = require('jwks-rsa')

const AUTH_ENABLED = (process.env.AUTH_ENABLED || '').toLowerCase() === 'yes'
const TENANT_ID    = process.env.TENANT_ID || process.env.AZURE_TENANT_ID || ''
const CLIENT_ID    = process.env.CLIENT_ID || ''

const ALLOWED_ORIGINS = [
  'http://localhost:5173',
  'http://localhost:5174',
  'http://localhost:5175',
]

// ── NTLM (AUTH_ENABLED=no) ────────────────────────────────────
const sspi = new NodeSSPI({ retrieveGroups: false })

// ── JWKS client ───────────────────────────────────────────────
const jwks = jwksClient({
  jwksUri: `https://login.microsoftonline.com/${TENANT_ID}/discovery/v2.0/keys`,
  cache:     true,
  rateLimit: true,
})

function getSigningKey(header, callback) {
  jwks.getSigningKey(header.kid, (err, key) => {
    if (err) return callback(err)
    callback(null, key.getPublicKey())
  })
}

// ── SSO: validate Azure AD ID token ──────────────────────────
// Frontend sends the ID token (aud = CLIENT_ID) — fully verifiable here
function validateSSOToken(req, res, next) {
  const authHeader = req.headers['authorization'] || ''
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null

  if (!token) {
    return res.status(401).json({ error: 'No Bearer token — please sign in via SSO' })
  }

  jwt.verify(token, getSigningKey, {
    algorithms: ['RS256'],
    audience:   CLIENT_ID,
    issuer: [
      `https://login.microsoftonline.com/${TENANT_ID}/v2.0`,
      `https://sts.windows.net/${TENANT_ID}/`,
    ],
  }, (err, decoded) => {
    if (err) {
      console.error('SSO token validation failed:', err.message)
      return res.status(401).json({ error: 'Invalid or expired token', detail: err.message })
    }
    const name = decoded.name || decoded.preferred_username || 'Unknown'
    req.windowsUser = decoded.preferred_username || decoded.upn || 'unknown'
    req.ssoUser = {
      name,
      email:    decoded.preferred_username || decoded.upn || '',
      initials: name.split(' ').map(p => p[0]).join('').slice(0, 2).toUpperCase(),
      role:     'Provider OPS Analyst',
      oid:      decoded.oid,
    }
    next()
  })
}

// ── NTLM validation ───────────────────────────────────────────
function validateNTLM(req, res, next) {
  if (req.method === 'OPTIONS') return next()
  const origin = req.headers.origin
  if (origin && ALLOWED_ORIGINS.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin)
    res.setHeader('Access-Control-Allow-Credentials', 'true')
  }
  sspi.authenticate(req, res, (err) => {
    if (err) return next(err)
    if (res.finished) return
    req.windowsUser = req.connection.user || 'unknown'
    next()
  })
}

module.exports = function windowsAuth(req, res, next) {
  if (AUTH_ENABLED) return validateSSOToken(req, res, next)
  return validateNTLM(req, res, next)
}

module.exports.AUTH_ENABLED = AUTH_ENABLED
