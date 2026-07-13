import React, { useEffect, useState } from 'react'
import { MsalProvider, useMsal, useIsAuthenticated } from '@azure/msal-react'
import { msalInstance, loginRequest, AUTH_ENABLED } from './msalConfig'

// ── Inner component: handles redirect + auto-login ────────────
function AuthGate({ children }: { children: React.ReactNode }) {
  const { instance, inProgress } = useMsal()
  const isAuthenticated = useIsAuthenticated()
  const [ready, setReady] = useState(false)

  useEffect(() => {
    // Handle redirect response first
    instance.handleRedirectPromise()
      .then(response => {
        if (response) {
          instance.setActiveAccount(response.account)
        }
        setReady(true)
      })
      .catch(err => {
        console.error('MSAL redirect error:', err)
        setReady(true)
      })
  }, [instance])

  useEffect(() => {
    if (!ready || inProgress !== 'none') return
    if (!isAuthenticated) {
      instance.loginRedirect(loginRequest)
    } else {
      const accounts = instance.getAllAccounts()
      if (accounts.length > 0) instance.setActiveAccount(accounts[0])
    }
  }, [ready, isAuthenticated, inProgress, instance])

  if (!ready || !isAuthenticated) {
    return (
      <div style={{
        height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexDirection: 'column', gap: 16, fontFamily: 'Inter, sans-serif', background: '#F4F6FA',
      }}>
        <div style={{
          width: 48, height: 48, borderRadius: 12,
          background: 'linear-gradient(135deg, #152670 0%, #2B75A9 70%, #47B1BF 100%)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
          </svg>
        </div>
        <div style={{ fontSize: 18, fontWeight: 700, color: '#0E2A6B' }}>ProviderGuard AI</div>
        <div style={{ fontSize: 13, color: '#565B66' }}>Signing you in with Microsoft…</div>
      </div>
    )
  }

  return <>{children}</>
}

// ── Exported wrapper ──────────────────────────────────────────
export default function AuthProvider({ children }: { children: React.ReactNode }) {
  if (!AUTH_ENABLED || !msalInstance) {
    return <>{children}</>
  }
  return (
    <MsalProvider instance={msalInstance}>
      <AuthGate>{children}</AuthGate>
    </MsalProvider>
  )
}
