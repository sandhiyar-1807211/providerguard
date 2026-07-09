import { useState, useEffect } from 'react'

export interface WindowsUser {
  name: string
  initials: string
  role: string
  username: string
}

const FALLBACK: WindowsUser = { name: 'Loading...', initials: '??', role: '', username: '' }

export function useWindowsUser(): WindowsUser {
  const [user, setUser] = useState<WindowsUser>(FALLBACK)

  useEffect(() => {
    fetch('http://localhost:3003/api/me', { credentials: 'include' })
      .then(r => r.json())
      .then(data => setUser({ name: data.name, initials: data.initials, role: data.role, username: data.username }))
      .catch(() => setUser({ name: 'Unknown User', initials: 'UU', role: 'Provider OPS Analyst', username: 'unknown' }))
  }, [])

  return user
}
