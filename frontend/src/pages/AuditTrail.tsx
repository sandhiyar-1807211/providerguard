import { useState, useEffect } from 'react'

const API = 'http://localhost:3003'

const iconMap: Record<string, { bg: string; color: string; icon: string }> = {
  accept:  { bg: '#F0FAF4', color: '#15693B', icon: '✓' },
  reject:  { bg: '#fff1f1', color: '#D5493A', icon: '✕' },
  system:  { bg: '#faf5ff', color: '#6d28d9', icon: '⚙' },
  flag:    { bg: '#fff7ed', color: '#b45309', icon: '⚑' },
}

type AuditLog = {
  id: number
  issueId: string
  action: string
  user: string
  performed_by: string
  detail: string
  details: string
  time: string
  type: string
  batch_id: string
}

function exportCSV(logs: AuditLog[]) {
  const headers = ['Issue ID', 'Action', 'User', 'Detail', 'Time']
  const rows = logs.map(l => [l.issueId, l.action, l.user || l.performed_by, `"${l.detail || l.details}"`, l.time])
  const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n')
  const blob = new Blob([csv], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `ProviderGuard_AuditTrail_${new Date().toISOString().slice(0,10)}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

function exportPDF(logs: AuditLog[]) {
  const html = `
    <html><head><title>ProviderGuard AI — Audit Trail</title>
    <style>
      body { font-family: system-ui, sans-serif; padding: 32px; color: #12141A; }
      h1 { font-size: 20px; font-weight: 700; margin-bottom: 4px; }
      .meta { font-size: 12px; color: #565B66; margin-bottom: 24px; }
      .notice { background: #F4F6FA; border: 1px solid #e0d9ff; border-radius: 8px; padding: 10px 14px; font-size: 12px; color: #5b21b6; margin-bottom: 20px; }
      table { width: 100%; border-collapse: collapse; font-size: 12px; }
      th { background: #F4F6FA; padding: 9px 12px; text-align: left; font-weight: 600; color: #565B66; border-bottom: 1px solid #e5e3f0; }
      td { padding: 9px 12px; border-bottom: 1px solid #F4F6FA; vertical-align: top; }
      .badge { display: inline-block; padding: 2px 8px; border-radius: 20px; font-size: 10px; font-weight: 600; }
      .accept { background: #F0FAF4; color: #15693B; }
      .reject { background: #fff1f1; color: #D5493A; }
      .system { background: #faf5ff; color: #6d28d9; }
      .flag   { background: #fff7ed; color: #b45309; }
      .footer { margin-top: 32px; font-size: 11px; color: #737985; text-align: center; border-top: 1px solid #F4F6FA; padding-top: 16px; }
    </style></head><body>
    <h1>ProviderGuard AI — Audit Trail</h1>
    <div class="meta">Generated: ${new Date().toLocaleString()} · Infinite Computer Solutions</div>
    <div class="notice">🔒 Immutable log — entries cannot be altered or deleted without System Admin access</div>
    <table>
      <thead><tr><th>Issue ID</th><th>Action</th><th>User</th><th>Detail</th><th>Time</th></tr></thead>
      <tbody>
        ${logs.map(l => `
          <tr>
            <td><strong>${l.issueId}</strong></td>
            <td><span class="badge ${l.type}">${l.action}</span></td>
            <td>${l.user || l.performed_by || 'System'}</td>
            <td>${l.detail || l.details || ''}</td>
            <td style="white-space:nowrap;color:#737985">${l.time}</td>
          </tr>`).join('')}
      </tbody>
    </table>
    <div class="footer">ProviderGuard AI · Infinite Computer Solutions AI COE · All actions are logged permanently</div>
    </body></html>`

  const win = window.open('', '_blank')
  if (!win) return
  win.document.write(html)
  win.document.close()
  win.focus()
  setTimeout(() => { win.print(); win.close() }, 500)
}

export default function AuditTrail() {
  const [logs, setLogs] = useState<AuditLog[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterAction, setFilterAction] = useState('All actions')
  const [filterDate, setFilterDate] = useState('Last 7 days')
  const [exporting, _setExporting] = useState(false)

  useEffect(() => {
    setLoading(true)
    const params = new URLSearchParams()
    if (search) params.set('search', search)
    if (filterAction !== 'All actions') params.set('action', filterAction)

    fetch(`${API}/api/audit?${params}`, { credentials: 'include' })
      .then(r => r.json())
      .then(data => {
        setLogs(Array.isArray(data) ? data : [])
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [search, filterAction])

  // Client-side date filter
  const filtered = logs.filter(log => {
    if (filterDate === 'All' || filterDate === 'Last 7 days') return true
    if (filterDate === 'Today') return log.time?.startsWith(new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' }))
    return true
  })

  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px', background: '#F4F6FA' }}>

      {/* TOPBAR */}
      <div style={{ background: '#fff', borderRadius: 12, padding: '12px 18px', marginBottom: 18, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontSize: 15, fontWeight: 600, color: '#12141A' }}>Audit Trail</div>
          <div style={{ fontSize: 11, color: '#737985', marginTop: 1 }}>Immutable activity log — all actions recorded</div>
        </div>
        {loading && <span style={{ fontSize: 11, color: '#1F3A93', background: '#E6ECFA', padding: '4px 12px', borderRadius: 20 }}>⟳ Loading from database…</span>}
      </div>

      {/* FILTERS */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 14, flexWrap: 'wrap', alignItems: 'center' }}>
        <input
          type="text"
          placeholder="Search by issue ID, user or action…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ flex: 1, minWidth: 200, padding: '7px 11px', border: '1px solid rgba(0,0,0,0.09)', borderRadius: 8, fontSize: 12, background: '#fff', color: '#12141A', outline: 'none' }}
        />
        <select value={filterAction} onChange={e => setFilterAction(e.target.value)} style={{ fontSize: 12, padding: '7px 11px', border: '1px solid rgba(0,0,0,0.09)', borderRadius: 8, background: '#fff', color: '#12141A', height: 34, outline: 'none' }}>
          <option>All actions</option>
          <option>Accepted</option>
          <option>False Positive</option>
          <option>Flagged by AI</option>
          <option>Reassigned</option>
          <option>Agent Run Completed</option>
          <option>Resolved</option>
          <option>OPEN</option>
        </select>
        <select value={filterDate} onChange={e => setFilterDate(e.target.value)} style={{ fontSize: 12, padding: '7px 11px', border: '1px solid rgba(0,0,0,0.09)', borderRadius: 8, background: '#fff', color: '#12141A', height: 34, outline: 'none' }}>
          <option>Last 7 days</option>
          <option>Today</option>
          <option>Last 30 days</option>
        </select>
        <button
          onClick={() => exportCSV(filtered)}
          style={{ padding: '7px 14px', background: '#fff', color: '#565B66', border: '1px solid rgba(0,0,0,0.09)', borderRadius: 8, fontSize: 12, fontWeight: 500, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5 }}
        >
          ↓ CSV
        </button>
        <button
          onClick={() => exportPDF(filtered)}
          disabled={exporting}
          style={{ padding: '7px 14px', background: exporting ? '#E6ECFA' : '#1F3A93', color: exporting ? '#1F3A93' : '#fff', border: 'none', borderRadius: 8, fontSize: 12, fontWeight: 500, cursor: exporting ? 'default' : 'pointer', display: 'flex', alignItems: 'center', gap: 5 }}
        >
          {exporting ? '⏳ Generating…' : '↓ Export PDF'}
        </button>
      </div>

      {/* IMMUTABLE NOTICE */}
      <div style={{ background: '#F4F6FA', border: '1px solid rgba(124,93,250,0.15)', borderRadius: 10, padding: '9px 14px', marginBottom: 14, fontSize: 11, color: '#565B66', display: 'flex', alignItems: 'center', gap: 6 }}>
        <span style={{ color: '#1F3A93', fontSize: 14 }}>🔒</span>
        Immutable log — entries cannot be altered or deleted without System Admin access
      </div>

      {/* AUDIT LOG */}
      <div style={{ background: '#fff', border: '1px solid rgba(0,0,0,0.07)', borderRadius: 12, overflow: 'hidden' }}>
        {loading ? (
          [1,2,3,4].map(n => (
            <div key={n} style={{ display: 'flex', gap: 12, padding: '14px 18px', borderBottom: '1px solid rgba(0,0,0,0.05)', alignItems: 'flex-start' }}>
              <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#F4F6FA', flexShrink: 0 }} />
              <div style={{ flex: 1 }}>
                <div style={{ width: 200, height: 13, background: '#F4F6FA', borderRadius: 6, marginBottom: 8 }} />
                <div style={{ width: '80%', height: 11, background: '#F4F6FA', borderRadius: 6 }} />
              </div>
            </div>
          ))
        ) : filtered.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center', color: '#737985', fontSize: 13 }}>No audit log entries found</div>
        ) : (
          filtered.map((log, idx) => {
            const ic = iconMap[log.type] || iconMap.system
            const displayUser = log.user || log.performed_by || 'System'
            const displayDetail = log.detail || log.details || ''
            return (
              <div key={log.id || idx} style={{ display: 'flex', gap: 12, padding: '12px 18px', borderBottom: idx < filtered.length - 1 ? '1px solid rgba(0,0,0,0.05)' : 'none', alignItems: 'flex-start' }}>
                <div style={{ width: 32, height: 32, borderRadius: '50%', background: ic.bg, color: ic.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, flexShrink: 0, marginTop: 2 }}>
                  {ic.icon}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
                    {log.issueId && log.issueId !== 'SYSTEM' && (
                      <span style={{ fontSize: 11, fontWeight: 700, color: '#1F3A93' }}>{log.issueId}</span>
                    )}
                    {log.batch_id && (
                      <span style={{ fontSize: 10, color: '#737985', background: '#F4F6FA', padding: '1px 6px', borderRadius: 10 }}>{log.batch_id.replace('PDM_Monitor_', 'PDM-')}</span>
                    )}
                    <span style={{ fontSize: 12, fontWeight: 500, color: '#12141A' }}>{log.action}</span>
                    <span style={{ fontSize: 10, fontWeight: 500, padding: '2px 8px', borderRadius: 20, background: ic.bg, color: ic.color }}>{log.action}</span>
                  </div>
                  <div style={{ fontSize: 12, color: '#4a4560', lineHeight: 1.5 }}>{displayDetail}</div>
                  <div style={{ fontSize: 11, color: '#737985', marginTop: 3 }}>{displayUser}</div>
                </div>
                <div style={{ fontSize: 11, color: '#737985', whiteSpace: 'nowrap', marginTop: 3 }}>{log.time}</div>
              </div>
            )
          })
        )}
      </div>

      <div style={{ marginTop: 10, fontSize: 11, color: '#737985', textAlign: 'right' }}>
        Showing {filtered.length} of {logs.length} entries
      </div>

      <div style={{ borderTop: '1px solid #f1f5f9', padding: '12px 28px', display: 'flex', alignItems: 'center', gap: 16, marginTop: 8 }}>
        <span style={{ fontSize: 11, color: '#94a3b8' }}>© 2026 ProviderGuard AI</span>
        <span style={{ color: '#cbd5e1', fontSize: 11 }}>|</span>
        <span style={{ fontSize: 11, color: '#94a3b8' }}>All outputs are advisory only</span>
      </div>
    </div>
  )
}
