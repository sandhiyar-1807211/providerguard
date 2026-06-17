import { useState } from 'react'

const auditLogs = [
  { id: 1, issueId: 'ISS-2039', action: 'Accepted', user: 'Sandhiya Raja', role: 'Provider OPS Analyst', detail: 'Address mismatch confirmed in provider directory', time: 'Jun 5 · 09:44 AM', type: 'accept' },
  { id: 2, issueId: 'ISS-2041', action: 'Flagged by AI', user: 'System', role: 'Duplicate Detection Agent (ReqID_08)', detail: 'Duplicate NPI 1234567890 found in records P-00441 and P-00893', time: 'Jun 5 · 09:12 AM', type: 'system' },
  { id: 3, issueId: 'ISS-2035', action: 'False Positive', user: 'Ravi Kumar', role: 'Directory Analyst', detail: 'Provider has two legitimate service locations per contract', time: 'Jun 5 · 08:55 AM', type: 'reject' },
  { id: 4, issueId: 'SYSTEM', action: 'Agent Run Completed', user: 'System', role: 'Orchestrator', detail: '18 new issues flagged across 4 detection modules', time: 'Jun 5 · 08:30 AM', type: 'system' },
  { id: 5, issueId: 'ISS-2030', action: 'Resolved', user: 'Meena Iyer', role: 'Compliance Analyst', detail: 'Data corrected in QNXT, directory refresh triggered', time: 'Jun 4 · 04:12 PM', type: 'accept' },
  { id: 6, issueId: 'ISS-2028', action: 'Reassigned', user: 'Admin', role: 'System Admin', detail: 'Escalated from Provider Ops to Compliance for regulatory review', time: 'Jun 4 · 02:30 PM', type: 'flag' },
  { id: 7, issueId: 'ISS-2025', action: 'False Positive', user: 'Sandhiya Raja', role: 'Provider OPS Analyst', detail: 'Same provider — two different contract periods, not a duplicate', time: 'Jun 4 · 11:20 AM', type: 'reject' },
  { id: 8, issueId: 'SYSTEM', action: 'Agent Run Completed', user: 'System', role: 'Orchestrator', detail: '21 new issues flagged across 6 detection modules', time: 'Jun 4 · 09:30 AM', type: 'system' },
]

const iconMap: Record<string, { bg: string; color: string; icon: string }> = {
  accept:  { bg: '#f0fdf4', color: '#166534', icon: '✓' },
  reject:  { bg: '#fff1f1', color: '#c0392b', icon: '✕' },
  system:  { bg: '#faf5ff', color: '#6d28d9', icon: '⚙' },
  flag:    { bg: '#fff7ed', color: '#b45309', icon: '⚑' },
}

// ── EXPORT CSV ──
function exportCSV(logs: typeof auditLogs) {
  const headers = ['Issue ID', 'Action', 'User', 'Role', 'Detail', 'Time']
  const rows = logs.map(l => [l.issueId, l.action, l.user, l.role, `"${l.detail}"`, l.time])
  const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n')
  const blob = new Blob([csv], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `ProviderGuard_AuditTrail_${new Date().toISOString().slice(0,10)}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

// ── EXPORT PDF (print-based) ──
function exportPDF(logs: typeof auditLogs) {
  const html = `
    <html><head><title>ProviderGuard AI — Audit Trail</title>
    <style>
      body { font-family: system-ui, sans-serif; padding: 32px; color: #0d0d12; }
      h1 { font-size: 20px; font-weight: 700; margin-bottom: 4px; }
      .meta { font-size: 12px; color: #6b6880; margin-bottom: 24px; }
      .notice { background: #f5f2ff; border: 1px solid #e0d9ff; border-radius: 8px; padding: 10px 14px; font-size: 12px; color: #5b21b6; margin-bottom: 20px; }
      table { width: 100%; border-collapse: collapse; font-size: 12px; }
      th { background: #f8f7fc; padding: 9px 12px; text-align: left; font-weight: 600; color: #6b6880; border-bottom: 1px solid #e5e3f0; }
      td { padding: 9px 12px; border-bottom: 1px solid #f0eef8; vertical-align: top; }
      tr:last-child td { border-bottom: none; }
      .badge { display: inline-block; padding: 2px 8px; border-radius: 20px; font-size: 10px; font-weight: 600; }
      .accept { background: #f0fdf4; color: #166534; }
      .reject { background: #fff1f1; color: #c0392b; }
      .system { background: #faf5ff; color: #6d28d9; }
      .flag   { background: #fff7ed; color: #b45309; }
      .footer { margin-top: 32px; font-size: 11px; color: #a09db8; text-align: center; border-top: 1px solid #f0eef8; padding-top: 16px; }
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
            <td>${l.user}<br/><span style="color:#a09db8;font-size:10px">${l.role}</span></td>
            <td>${l.detail}</td>
            <td style="white-space:nowrap;color:#a09db8">${l.time}</td>
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
  const [search, setSearch] = useState('')
  const [filterAction, setFilterAction] = useState('All actions')
  const [filterDate, setFilterDate] = useState('Last 7 days')
  const [exporting, _setExporting] = useState(false)

  const filtered = auditLogs.filter(log => {
    const matchSearch = search === '' || log.issueId.toLowerCase().includes(search.toLowerCase()) || log.user.toLowerCase().includes(search.toLowerCase()) || log.detail.toLowerCase().includes(search.toLowerCase())
    const matchAction = filterAction === 'All actions' || log.action === filterAction
    return matchSearch && matchAction
  })

  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px', background: '#f0eef8' }}>

      {/* TOPBAR */}
      <div style={{ background: '#fff', borderRadius: 12, padding: '12px 18px', marginBottom: 18 }}>
        <div style={{ fontSize: 15, fontWeight: 600, color: '#0d0d12' }}>Audit Trail</div>
        <div style={{ fontSize: 11, color: '#a09db8', marginTop: 1 }}>Immutable activity log — all actions recorded</div>
      </div>

      {/* FILTERS */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 14, flexWrap: 'wrap', alignItems: 'center' }}>
        <input
          type="text"
          placeholder="Search by issue ID, user or action…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ flex: 1, minWidth: 200, padding: '7px 11px', border: '1px solid rgba(0,0,0,0.09)', borderRadius: 8, fontSize: 12, background: '#fff', color: '#0d0d12', outline: 'none' }}
        />
        <select value={filterAction} onChange={e => setFilterAction(e.target.value)} style={{ fontSize: 12, padding: '7px 11px', border: '1px solid rgba(0,0,0,0.09)', borderRadius: 8, background: '#fff', color: '#0d0d12', height: 34, outline: 'none' }}>
          <option>All actions</option>
          <option>Accepted</option>
          <option>False Positive</option>
          <option>Flagged by AI</option>
          <option>Reassigned</option>
          <option>Agent Run Completed</option>
        </select>
        <select value={filterDate} onChange={e => setFilterDate(e.target.value)} style={{ fontSize: 12, padding: '7px 11px', border: '1px solid rgba(0,0,0,0.09)', borderRadius: 8, background: '#fff', color: '#0d0d12', height: 34, outline: 'none' }}>
          <option>Last 7 days</option>
          <option>Today</option>
          <option>Last 30 days</option>
        </select>
        {/* Export CSV */}
        <button
          onClick={() => exportCSV(filtered)}
          style={{ padding: '7px 14px', background: '#fff', color: '#6b6880', border: '1px solid rgba(0,0,0,0.09)', borderRadius: 8, fontSize: 12, fontWeight: 500, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5 }}
        >
          ↓ CSV
        </button>
        {/* Export PDF */}
        <button
          onClick={() => exportPDF(filtered)}
          disabled={exporting}
          style={{ padding: '7px 14px', background: exporting ? '#ede9ff' : '#7c5dfa', color: exporting ? '#7c5dfa' : '#fff', border: 'none', borderRadius: 8, fontSize: 12, fontWeight: 500, cursor: exporting ? 'default' : 'pointer', display: 'flex', alignItems: 'center', gap: 5 }}
        >
          {exporting ? '⏳ Generating…' : '↓ Export PDF'}
        </button>
      </div>

      {/* IMMUTABLE NOTICE */}
      <div style={{ background: '#faf9fe', border: '1px solid rgba(124,93,250,0.15)', borderRadius: 10, padding: '9px 14px', marginBottom: 14, fontSize: 11, color: '#6b6880', display: 'flex', alignItems: 'center', gap: 6 }}>
        <span style={{ color: '#7c5dfa', fontSize: 14 }}>🔒</span>
        Immutable log — entries cannot be altered or deleted without System Admin access
      </div>

      {/* AUDIT LOG */}
      <div style={{ background: '#fff', border: '1px solid rgba(0,0,0,0.07)', borderRadius: 12, overflow: 'hidden' }}>
        {filtered.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center', color: '#a09db8', fontSize: 13 }}>No results found</div>
        ) : (
          filtered.map((log, idx) => {
            const ic = iconMap[log.type]
            return (
              <div key={log.id} style={{ display: 'flex', gap: 12, padding: '12px 18px', borderBottom: idx < filtered.length - 1 ? '1px solid rgba(0,0,0,0.05)' : 'none', alignItems: 'flex-start' }}>
                {/* Icon */}
                <div style={{ width: 32, height: 32, borderRadius: '50%', background: ic.bg, color: ic.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, flexShrink: 0, marginTop: 2 }}>
                  {ic.icon}
                </div>

                {/* Content */}
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
                    {log.issueId !== 'SYSTEM' && (
                      <span style={{ fontSize: 11, fontWeight: 700, color: '#7c5dfa' }}>{log.issueId}</span>
                    )}
                    <span style={{ fontSize: 12, fontWeight: 500, color: '#0d0d12' }}>{log.action}</span>
                    <span style={{ fontSize: 10, fontWeight: 500, padding: '2px 8px', borderRadius: 20, background: ic.bg, color: ic.color }}>{log.action}</span>
                  </div>
                  <div style={{ fontSize: 12, color: '#4a4560', lineHeight: 1.5 }}>{log.detail}</div>
                  <div style={{ fontSize: 11, color: '#a09db8', marginTop: 3 }}>{log.user} · {log.role}</div>
                </div>

                {/* Time */}
                <div style={{ fontSize: 11, color: '#a09db8', whiteSpace: 'nowrap', marginTop: 3 }}>{log.time}</div>
              </div>
            )
          })
        )}
      </div>

      <div style={{ marginTop: 10, fontSize: 11, color: '#a09db8', textAlign: 'right' }}>
        Showing {filtered.length} of {auditLogs.length} entries
      </div>
      {/* ── FOOTER ── */}
      <div style={{ borderTop: '1px solid #f1f5f9', padding: '12px 28px', display: 'flex', alignItems: 'center', gap: 16, marginTop: 8 }}>
        <span style={{ fontSize: 11, color: '#94a3b8' }}>© 2026 ProviderGuard AI</span>
        <span style={{ color: '#cbd5e1', fontSize: 11 }}>|</span>
        <span style={{ fontSize: 11, color: '#94a3b8' }}>All outputs are advisory only</span>
      </div>
    </div>
  )
}
