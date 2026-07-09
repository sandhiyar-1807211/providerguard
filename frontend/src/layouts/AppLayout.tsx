import React, { useState, useRef, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useWindowsUser } from '../hooks/useWindowsUser'
import { Bell, Shield } from 'lucide-react'

const navItems = [
  { label: 'Dashboard',    icon: '⊞', path: '/',      badge: 0,  desc: 'Monitor your provider issues at a glance' },
  { label: 'Work Queue',   icon: '≡', path: '/queue',  badge: 0,  desc: 'Manage and resolve open provider issues' },
  { label: 'Audit Trail',  icon: '◷', path: '/audit',  badge: 0,  desc: 'Track all actions and changes' },
  { label: 'Admin Config', icon: '⚙', path: '/admin',  badge: 0,  desc: 'Configure system settings and agents' },
]

// alerts will be loaded from live API

const severityColor: Record<string, string> = {
  HIGH:   '#dc2626',
  MEDIUM: '#d97706',
  LOW:    '#16a34a',
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate()
  const location = useLocation()
  const [showNotif, setShowNotif] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)
  const [readIds, setReadIds] = useState<Set<string>>(new Set())
  const [hoveredNav, setHoveredNav] = useState<string | null>(null)
  const bellRef = useRef<HTMLDivElement>(null)
  const userRef = useRef<HTMLDivElement>(null)
  const [showUser, setShowUser] = useState(false)
  const currentUser = useWindowsUser()
  const darkMode = false
  const [openCount, setOpenCount] = useState(0)
  const [alerts, setAlerts] = useState<{ id: string; title: string; provider: string; severity: string; time: string }[]>([])

  useEffect(() => {
    // Fetch live open issues for notifications + badge count
    fetch('http://localhost:3003/api/findings', { credentials: 'include' })
      .then(r => r.json())
      .then(data => {
        const open = Array.isArray(data) ? data.filter((i: any) => i.status === 'Open to Resolve' || i.status === 'OPEN') : []
        setOpenCount(open.length)
        setUnreadCount(Math.min(open.length, 5))
        setAlerts(open.slice(0, 5).map((i: any) => ({
          id: i.sequence_id,
          title: `${(i.issue_type || '').replace(/_/g, ' ')} detected`,
          provider: i.provider || i.provider_name || 'Unknown',
          severity: i.severity || 'LOW',
          time: new Date(i.detectedAt || i.detected_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        })))
      })
      .catch(() => {})
  }, [])

  useEffect(() => {
    localStorage.setItem('pg-theme', darkMode ? 'dark' : 'light')
    document.documentElement.setAttribute('data-theme', darkMode ? 'dark' : 'light')
  }, [darkMode])

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (bellRef.current && !bellRef.current.contains(e.target as Node)) {
        setShowNotif(false)
      }
      if (userRef.current && !userRef.current.contains(e.target as Node)) {
        setShowUser(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  function handleBellClick() {
    setShowNotif(prev => !prev)
    if (!showNotif) {
      setUnreadCount(0)
      setReadIds(new Set(alerts.map(a => a.id)))
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', width: '100vw', overflow: 'hidden', fontFamily: 'system-ui, sans-serif' }}>

      {/* ── TOP NAV ── */}
      <nav style={{
        background: '#ffffff',
        height: 72,
        display: 'flex',
        alignItems: 'center',
        padding: '0 36px',
        flexShrink: 0,
        boxShadow: '0 1px 0 rgba(0,0,0,0.08), 0 2px 12px rgba(0,0,0,0.06)',
        position: 'relative',
        zIndex: 100,
      }}>

        {/* Brand */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginRight: 40, flexShrink: 0 }}>
          <div style={{ width: 40, height: 40, background: '#6366f1', borderRadius: 11, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Shield size={20} color="#fff" strokeWidth={2} />
          </div>
          <div style={{ lineHeight: 1 }}>
            <div style={{ fontSize: 16, fontWeight: 700, color: '#1e1b4b', letterSpacing: '-0.3px' }}>ProviderGuard AI</div>
            <div style={{ fontSize: 10, color: '#9ca3af', marginTop: 3, letterSpacing: '0.4px' }}>Infinite Computer Solutions</div>
          </div>
        </div>

        {/* Divider */}
        <div style={{ width: 1, height: 32, background: '#e5e7eb', marginRight: 28, flexShrink: 0 }} />

        {/* Nav Items */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 2, height: '100%' }}>
          {navItems.map(item => {
            const isActive = location.pathname === item.path
            const isHovered = hoveredNav === item.path
            return (
              <div
                key={item.path}
                onClick={() => navigate(item.path)}
                onMouseEnter={() => setHoveredNav(item.path)}
                onMouseLeave={() => setHoveredNav(null)}
                style={{ position: 'relative' }}
              >
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  padding: '8px 16px',
                  borderRadius: 10,
                  cursor: 'pointer',
                  fontSize: 14,
                  fontWeight: isActive ? 600 : 500,
                  color: isActive ? '#4338ca' : isHovered ? '#1f2937' : '#4b5563',
                  background: isActive ? '#eef2ff' : isHovered ? '#f3f4f6' : 'transparent',
                  transition: 'background 0.15s, color 0.15s',
                  whiteSpace: 'nowrap',
                }}>
                  <span style={{ fontSize: 16 }}>{item.icon}</span>
                  <span>{item.label}</span>
                  {item.label === 'Work Queue' && openCount > 0 ? (
                    <span style={{ background: '#dc2626', color: '#fff', fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 20 }}>
                      {openCount}
                    </span>
                  ) : item.badge > 0 && (
                    <span style={{ background: '#dc2626', color: '#fff', fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 20 }}>
                      {item.badge}
                    </span>
                  )}
                </div>

                {/* Hover tooltip */}
                {isHovered && (
                  <div style={{
                    position: 'absolute',
                    top: 'calc(100% + 8px)',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    background: '#ffffff',
                    border: '1px solid #e5e7eb',
                    borderRadius: 8,
                    padding: '7px 14px',
                    fontSize: 12,
                    fontWeight: 500,
                    color: '#4338ca',
                    whiteSpace: 'nowrap',
                    boxShadow: '0 4px 16px rgba(0,0,0,0.10)',
                    zIndex: 200,
                    pointerEvents: 'none',
                  }}>
                    {item.desc}
                    <div style={{
                      position: 'absolute',
                      top: -5,
                      left: '50%',
                      transform: 'translateX(-50%) rotate(45deg)',
                      width: 8, height: 8,
                      background: '#ffffff',
                      border: '1px solid #e5e7eb',
                      borderBottom: 'none',
                      borderRight: 'none',
                    }} />
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {/* Right side */}
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>



          {/* Bell */}
          <div ref={bellRef} style={{ position: 'relative' }}>
            <div
              onClick={handleBellClick}
              style={{ width: 40, height: 40, borderRadius: 10, border: '1px solid #e5e7eb', background: '#f9fafb', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', position: 'relative' }}
            >
              <Bell size={19} color="#6b7280" strokeWidth={2} />
              {unreadCount > 0 && (
                <div style={{ position: 'absolute', top: -4, right: -4, width: 18, height: 18, borderRadius: '50%', background: '#dc2626', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 700, color: '#fff', border: '2px solid #fff' }}>
                  {unreadCount}
                </div>
              )}
            </div>

            {showNotif && (
              <div style={{ position: 'absolute', top: 50, right: 0, width: 340, background: '#fff', border: '1px solid rgba(0,0,0,0.1)', borderRadius: 12, boxShadow: '0 8px 30px rgba(0,0,0,0.12)', zIndex: 999, overflow: 'hidden' }}>
                <div style={{ padding: '12px 16px', borderBottom: '1px solid rgba(0,0,0,0.07)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#0d0d12' }}>Notifications</div>
                  <span style={{ fontSize: 10, color: '#6366f1', cursor: 'pointer', fontWeight: 500 }} onClick={() => { setUnreadCount(0); setReadIds(new Set(alerts.map(a => a.id))) }}>Mark all read</span>
                </div>
                {alerts.map((alert, idx) => {
                  const isUnread = !readIds.has(alert.id)
                  return (
                    <div
                      key={alert.id}
                      onClick={() => { navigate('/queue'); setShowNotif(false) }}
                      style={{ padding: '11px 16px', borderBottom: idx < alerts.length - 1 ? '1px solid rgba(0,0,0,0.05)' : 'none', cursor: 'pointer', background: isUnread ? '#faf9fe' : '#fff', display: 'flex', gap: 10, alignItems: 'flex-start' }}
                    >
                      <div style={{ width: 8, height: 8, borderRadius: '50%', background: severityColor[alert.severity] || '#6b6880', marginTop: 5, flexShrink: 0 }} />
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 12, fontWeight: isUnread ? 600 : 400, color: '#0d0d12' }}>{alert.title}</div>
                        <div style={{ fontSize: 11, color: '#6b6880', marginTop: 2 }}>{alert.provider}</div>
                        <div style={{ fontSize: 10, color: '#a09db8', marginTop: 2 }}>{alert.time}</div>
                      </div>
                      <span style={{ fontSize: 9, fontWeight: 600, padding: '2px 7px', borderRadius: 20, background: alert.severity === 'HIGH' ? '#fef2f2' : alert.severity === 'MEDIUM' ? '#fffbeb' : '#f0fdf4', color: severityColor[alert.severity] }}>
                        {alert.severity}
                      </span>
                    </div>
                  )
                })}
                <div onClick={() => { navigate('/queue'); setShowNotif(false) }} style={{ padding: '10px 16px', background: '#f5f8ff', textAlign: 'center', fontSize: 12, color: '#6366f1', cursor: 'pointer', fontWeight: 500 }}>
                  View all in Work Queue →
                </div>
              </div>
            )}
          </div>

          {/* User pill + dropdown */}
          <div ref={userRef} style={{ position: 'relative', marginLeft: 4 }}>
            <div
              onClick={() => setShowUser(p => !p)}
              style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 14px 6px 7px', borderRadius: 10, border: '1px solid #e5e7eb', background: showUser ? '#f0f4ff' : '#f9fafb', cursor: 'pointer', transition: 'background 0.15s' }}
            >
              <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#6366f1', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: '#fff', flexShrink: 0 }}>
                {currentUser.initials}
              </div>
              <div style={{ lineHeight: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#1e1b4b' }}>{currentUser.name}</div>
                <div style={{ fontSize: 10, color: '#9ca3af', marginTop: 3 }}>{currentUser.role}</div>
              </div>
            </div>

            {/* User dropdown */}
            {showUser && (
              <div style={{ position: 'absolute', top: 'calc(100% + 10px)', right: 0, width: 240, background: '#fff', border: '1px solid #e5e7eb', borderRadius: 14, boxShadow: '0 8px 30px rgba(0,0,0,0.10)', zIndex: 999, overflow: 'hidden' }}>
                {/* Profile section */}
                <div style={{ padding: '16px 16px 14px' }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: '#1e1b4b', marginBottom: 3 }}>{currentUser.name}</div>
                  <div style={{ fontSize: 12, color: '#9ca3af', marginBottom: 12 }}>{`${currentUser.username}@infinite.com`}</div>

                </div>

                {/* Divider */}
                <div style={{ height: 1, background: '#f1f5f9' }} />

                {/* Sign out */}
                <div
                  style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', fontSize: 13, color: '#374151', fontWeight: 500 }}
                  onMouseEnter={e => (e.currentTarget.style.background = '#f8f9ff')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                  onClick={() => setShowUser(false)}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
                  </svg>
                  Sign out
                </div>
              </div>
            )}
          </div>
        </div>
      </nav>

      {/* ── MAIN CONTENT ── */}
      <div className="main-content" style={{ flex: 1, overflow: 'hidden', background: darkMode ? '#0f0f1a' : '#eef2ff', display: 'flex', flexDirection: 'column' }}>
        {children}
      </div>

      <style>{`
        @keyframes ping {
          0%, 100% { transform: scale(1); opacity: 0.4; }
          50% { transform: scale(2); opacity: 0; }
        }
      `}</style>
    </div>
  )
}
