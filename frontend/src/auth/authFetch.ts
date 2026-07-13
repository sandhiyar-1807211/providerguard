import { msalInstance, loginRequest, AUTH_ENABLED } from './msalConfig'

export async function authFetch(url: string, options: RequestInit = {}): Promise<Response> {
  if (!AUTH_ENABLED || !msalInstance) {
    return fetch(url, { ...options, credentials: 'include' })
  }

  const account = msalInstance.getActiveAccount()
  if (!account) throw new Error('No active account — please sign in')

  // Acquire token silently — we use the ID token (not access token)
  // ID token has aud=CLIENT_ID and is verifiable by our backend
  const tokenResponse = await msalInstance.acquireTokenSilent({
    scopes: ['openid', 'profile'],
    account,
  })

  const idToken = tokenResponse.idToken
  if (!idToken) throw new Error('No ID token in response')

  const headers = new Headers(options.headers || {})
  headers.set('Authorization', `Bearer ${idToken}`)
  if (options.body && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json')
  }

  return fetch(url, { ...options, headers, credentials: 'include' })
}
