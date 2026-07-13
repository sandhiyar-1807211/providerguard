import { useState, useEffect } from 'react'
import { useMsal, useIsAuthenticated } from '@azure/msal-react'
import { AUTH_ENABLED, msalInstance } from '../auth/msalConfig'
import { authFetch } from '../auth/authFetch'

export interface WindowsUser {
  name: string
  initials: string
  role: string
  username: string
  email?: string
}

const FALLBACK: WindowsUser = { name: 'Loading...', initials: '??', role: '', username: '' }

// SSO mode: read user directly from MSAL token claims (no round-trip needed)
function useSSOUser(): WindowsUser {
  const { instance } = useMsal()
  const isAuthenticated = useIsAuthenticated()

  if (!isAuthenticated) return FALLBACK

  const account = instance.getActiveAccount()
  if (!account) return FALLBACK

  const name     = account.name || account.username || 'Unknown'
  const initials = name.split(' ').map((p: string) => p[0]).join('').slice(0, 2).toUpperCase()
  return {
    name,
    initials,
    email:    account.username,
    username: account.username?.split('@')[0] || '',
    role:     'Provider OPS Analyst',
  }
}

// NTLM mode: fetch from /api/me
function useNTLMUser(): WindowsUser {
  const [user, setUser] = useState<WindowsUser>(FALLBACK)
  useEffect(() => {
    authFetch('http://localhost:3003/api/me')
      .then(r => r.json())
      .then(data => setUser({ name: data.name, initials: data.initials, role: data.role, username: data.username }))
      .catch(() => setUser({ name: 'Unknown User', initials: 'UU', role: 'Provider OPS Analyst', username: 'unknown' }))
  }, [])
  return user
}

// Exported hook — picks the right mode automatically
export function useWindowsUser(): WindowsUser {
  const ssoUser  = AUTH_ENABLED ? useSSOUser()  : FALLBACK   // eslint-disable-line
  const ntlmUser = AUTH_ENABLED ? FALLBACK       : useNTLMUser() // eslint-disable-line
  return AUTH_ENABLED ? ssoUser : ntlmUser
}
