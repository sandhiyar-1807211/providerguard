import { PublicClientApplication, LogLevel } from '@azure/msal-browser'

const AUTH_ENABLED = import.meta.env.VITE_AUTH_ENABLED === 'true'

export { AUTH_ENABLED }

export const msalConfig = {
  auth: {
    clientId:    import.meta.env.VITE_CLIENT_ID   || '',
    authority:   `https://login.microsoftonline.com/${import.meta.env.VITE_TENANT_ID}`,
    redirectUri: import.meta.env.VITE_REDIRECT_URI || 'http://localhost:5175',
  },
  cache: {
    cacheLocation:           'sessionStorage' as const,
    storeAuthStateInCookie:  false,
  },
  system: {
    loggerOptions: {
      logLevel: LogLevel.Warning,
    },
  },
}

export const loginRequest = {
  scopes: ['openid', 'profile', 'email', 'User.Read'],
}

export const msalInstance = AUTH_ENABLED
  ? new PublicClientApplication(msalConfig)
  : null
