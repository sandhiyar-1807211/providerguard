const NodeSSPI = require('node-sspi')

const sspi = new NodeSSPI({ retrieveGroups: false })

const ALLOWED_ORIGINS = [
  'http://localhost:5173',
  'http://localhost:5174',
  'http://localhost:5175',
]

module.exports = function windowsAuth(req, res, next) {
  // Skip NTLM for CORS preflight — cors() middleware handles it
  if (req.method === 'OPTIONS') return next()

  // Inject CORS headers BEFORE node-sspi runs so they appear on the
  // 401 Negotiate challenge too — without this the browser drops NTLM
  const origin = req.headers.origin
  if (origin && ALLOWED_ORIGINS.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin)
    res.setHeader('Access-Control-Allow-Credentials', 'true')
  }

  sspi.authenticate(req, res, (err) => {
    if (err) return next(err)
    if (res.finished) return   // NTLM round-trip — browser will retry with token
    req.windowsUser = req.connection.user || 'unknown'
    next()
  })
}
