import { useNavigate } from 'react-router-dom'
import { useState, useEffect, useRef } from 'react'
import { TrendingDown, ClipboardList, Clock, CheckCheck } from 'lucide-react'
import { currentUser } from '../data/mockData'
import { ISSUE_TYPE_LABELS, SEVERITY_LABELS, QUEUE_LABELS } from '../types'

const API = 'http://localhost:3001'

// Count-up animation hook
function useCountUp(target: number, duration = 1200) {
  const [count, setCount] = useState(0)
  const startRef = useRef<number | null>(null)

  useEffect(() => {
    startRef.current = null
    setCount(0)
    let raf: number

    function step(timestamp: number) {
      if (!startRef.current) startRef.current = timestamp
      const progress = Math.min((timestamp - startRef.current) / duration, 1)
      // Ease-out curve
      const eased = 1 - Math.pow(1 - progress, 3)
      setCount(Math.floor(eased * target))
      if (progress < 1) raf = requestAnimationFrame(step)
      else setCount(target)
    }

    raf = requestAnimationFrame(step)
    return () => cancelAnimationFrame(raf)
  }, [target, duration])

  return count
}

// Animated number display
function AnimatedNumber({ value, suffix = '' }: { value: string; suffix?: string }) {
  const numericPart = parseInt(value.replace(/[^0-9]/g, '')) || 0
  const hasSuffix = value.includes('%')
  const count = useCountUp(numericPart, 1400)
  return <>{count}{hasSuffix ? '%' : ''}{suffix}</>
}


const typeTag: Record<string, string> = {
  'DUPLICATE_RECORD':         '#faf5ff|#4338ca',
  'CONFLICT_DETECTED':        '#fff7ed|#b45309',
  'DIRECTORY_MISMATCH':       '#f0fdfa|#0f766e',
  'CLAIMS_ACTIVITY_MISMATCH': '#eff6ff|#1d4ed8',
  'ONBOARDING_ISSUE':         '#f0fdf4|#166534',
  'CREDENTIALING_MISMATCH':   '#fdf4ff|#86198f',
  'NETWORK_CONTRACT_MISMATCH':'#fff7ed|#c2410c',
  'ENROLLMENT_MISMATCH':      '#fefce8|#854d0e',
  'MASTER_DATA_QUALITY':      '#f0f9ff|#0369a1',
  'ENCOUNTER_MISMATCH':       '#f0fdfa|#0f766e',
}

const priTag: Record<string, string> = {
  'HIGH':   '#fef2f2|#dc2626',
  'MEDIUM': '#fffbeb|#d97706',
  'LOW':    '#f4f3f8|#6b6880',
}


function Tag({ label, colors }: { label: string; colors: string }) {
  const [bg, color] = colors.split('|')
  return (
    <span style={{ background: bg, color, fontSize: 10, fontWeight: 600, padding: '3px 9px', borderRadius: 20, whiteSpace: 'nowrap' }}>
      {label}
    </span>
  )
}

export default function Dashboard() {
  const navigate = useNavigate()
  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'
  const [apiIssues, setApiIssues] = useState<any[]>([])
  const [apiBatches, setApiBatches] = useState<any[]>([])
  const [apiSummary, setApiSummary] = useState<any>(null)
  const [dashLoading, setDashLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      fetch(`${API}/api/findings`).then(r => r.json()),
      fetch(`${API}/api/batches`).then(r => r.json()),
      fetch(`${API}/api/findings/summary`).then(r => r.json()),
    ]).then(([issues, batches, summary]) => {
      setApiIssues(issues)
      setApiBatches(batches)
      setApiSummary(summary)
      setDashLoading(false)
    }).catch(() => setDashLoading(false))
  }, [])

  // Build KPI cards from real summary data
  // Compute FP rate: false_positive / total * 100
  const fpRate = apiSummary
    ? Math.round((parseInt(apiSummary.false_positive ?? apiSummary.false_positive_rate ?? 0) / Math.max(parseInt(apiSummary.total ?? 1), 1)) * 100)
    : 0
  // Build issue type chart from real issues data
  const issueTypes = (() => {
    const rows = [
      { label: 'Duplicate Record',   count: apiIssues.filter(i => i.issue_type === 'DUPLICATE_RECORD').length,         color: '#6366f1' },
      { label: 'Conflict Detected',  count: apiIssues.filter(i => i.issue_type === 'CONFLICT_DETECTED').length,        color: '#ef4444' },
      { label: 'Directory Mismatch', count: apiIssues.filter(i => i.issue_type === 'DIRECTORY_MISMATCH').length,       color: '#0ea5e9' },
      { label: 'Onboarding Gap',     count: apiIssues.filter(i => i.issue_type === 'ONBOARDING_ISSUE').length,         color: '#f59e0b' },
      { label: 'Claims Mismatch',    count: apiIssues.filter(i => i.issue_type === 'CLAIMS_ACTIVITY_MISMATCH').length, color: '#10b981' },
    ]
    const max = Math.max(...rows.map(r => r.count), 1)
    return rows.map(r => ({ ...r, pct: Math.round((r.count / max) * 100) }))
  })()

  // Build queue load chart from real issues data
  const openIssues = apiIssues.filter(i => i.status === 'Open to Resolve')
  const totalOpen = openIssues.length || 1
  const queues = [
    { label: 'Provider Ops',  count: openIssues.filter(i => i.queue_name === 'PROVIDER_OPS').length,  pct: Math.round((openIssues.filter(i => i.queue_name === 'PROVIDER_OPS').length  / totalOpen) * 100), color: '#6366f1' },
    { label: 'Directory Ops', count: openIssues.filter(i => i.queue_name === 'DIRECTORY_OPS').length, pct: Math.round((openIssues.filter(i => i.queue_name === 'DIRECTORY_OPS').length / totalOpen) * 100), color: '#0ea5e9' },
    { label: 'Compliance',    count: openIssues.filter(i => i.queue_name === 'COMPLIANCE').length,    pct: Math.round((openIssues.filter(i => i.queue_name === 'COMPLIANCE').length    / totalOpen) * 100), color: '#f59e0b' },
  ]

  const myIssues = apiIssues.filter(i => i.status === 'Open to Resolve').slice(0, 3)

  return (
    <div style={{ flex: 1, overflowY: 'auto', background: '#f4f6ff', padding: '0' }}>

      {/* ── TOP HEADER BANNER ── */}
      <div style={{ background: '#eef2ff', borderBottom: '1px solid #e0e7ff', padding: '22px 28px 20px' }}>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ width: 46, height: 46, borderRadius: '50%', background: '#6366f1', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, fontWeight: 700, color: '#fff', flexShrink: 0 }}>
              {currentUser.initials}
            </div>
            <div>
              <div style={{ fontSize: 18, fontWeight: 700, color: '#1e1b4b' }}>{greeting}, {currentUser.name.split(' ')[0]} 👋</div>
              <div style={{ fontSize: 12, color: '#4338ca', marginTop: 2 }}>{currentUser.role} · ProviderGuard AI</div>
            </div>
          </div>
          <button
            onClick={() => navigate('/queue')}
            style={{ padding: '9px 20px', background: '#6366f1', color: '#fff', border: 'none', borderRadius: 10, fontSize: 12, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}
          >
            ▶ Run agents
          </button>
        </div>

        {/* Personal stats row */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginTop: 16 }}>
          {[
            { val: dashLoading ? '—' : (apiSummary?.open ?? 0), lbl: 'Assigned to me', Icon: ClipboardList, color: '#3730a3', iconBg: '#eef2ff', border: '#e0e7ff', bg: '#f5f2ff' },
            { val: dashLoading ? '—' : (apiSummary?.resolved ?? 0), lbl: 'Resolved today', Icon: CheckCheck, color: '#16a34a', iconBg: '#f0fdf4', border: '#bbf7d0', bg: '#f0fdf4' },
            { val: dashLoading ? '—' : currentUser.pendingOver24h, lbl: 'Pending >24h', Icon: Clock, color: '#d97706', iconBg: '#fffbeb', border: '#fde68a', bg: '#fffbeb' },
            { val: apiSummary ? `${fpRate}%` : '—',  lbl: 'False positive rate', Icon: TrendingDown,  color: '#dc2626', iconBg: '#fef2f2', border: '#fecaca', bg: '#fef2f2' },
          ].map(s => (
            <div key={s.lbl} className="pg-card" style={{ background: '#fff', borderRadius: 14, padding: '18px 20px', border: `1px solid ${s.border}`, position: 'relative', overflow: 'hidden' }}>
              {/* decorative corner */}
              <div style={{ position: 'absolute', top: 0, right: 0, width: 72, height: 72, borderRadius: '0 14px 0 72px', background: s.bg, opacity: 0.5 }} />
              <div style={{ width: 38, height: 38, borderRadius: 10, background: s.iconBg, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}>
                <s.Icon size={20} color={s.color} strokeWidth={2} />
              </div>
              <div style={{ fontSize: 11, color: '#6b6880', marginBottom: 4, fontWeight: 500 }}>{s.lbl}</div>
              <div style={{ fontSize: 30, fontWeight: 700, color: s.color, lineHeight: 1 }}><AnimatedNumber value={String(s.val)} /></div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ padding: '20px 28px' }}>

        {/* ── MY OPEN ISSUES ── */}
        <div style={{ background: '#fff', borderRadius: 14, border: '1px solid rgba(0,0,0,0.06)', marginBottom: 20, overflow: 'hidden' }} className="pg-card-sm">
          <div style={{ padding: '14px 18px', borderBottom: '1px solid rgba(0,0,0,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#ef4444', display: 'inline-block', boxShadow: '0 0 0 3px #fecaca' }} />
              <span style={{ fontSize: 13, fontWeight: 600, color: '#0d0d12' }}>My Open Issues — Needs Attention</span>
            </div>
            <span onClick={() => navigate('/queue?status=open')} style={{ fontSize: 11, color: '#6366f1', cursor: 'pointer', fontWeight: 500 }}>View all →</span>
          </div>
          <div style={{ padding: '8px 10px' }}>
            {dashLoading ? (
              /* Skeleton rows while loading */
              [1,2,3].map(n => (
                <div key={n} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 10px', borderRadius: 9, marginBottom: 4 }}>
                  <div style={{ width: 80, height: 20, borderRadius: 20, background: '#eef2ff', animation: 'pulse 1.5s ease-in-out infinite' }} />
                  <div style={{ flex: 1, height: 14, borderRadius: 6, background: '#f4f3f8', animation: 'pulse 1.5s ease-in-out infinite' }} />
                  <div style={{ width: 60, height: 14, borderRadius: 6, background: '#f4f3f8', animation: 'pulse 1.5s ease-in-out infinite' }} />
                </div>
              ))
            ) : myIssues.length === 0 ? (
              <div style={{ padding: '16px 10px', fontSize: 12, color: '#a09db8', textAlign: 'center' }}>No open issues assigned to you 🎉</div>
            ) : (
              myIssues.map(issue => (
                <div key={issue.sequence_id} onClick={() => navigate('/queue')} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 10px', borderRadius: 9, marginBottom: 4, cursor: 'pointer', transition: 'background 0.15s' }}
                  onMouseEnter={e => (e.currentTarget.style.background = '#f5f8ff')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                >
                  <div style={{ fontSize: 10, fontWeight: 700, color: '#6366f1', background: '#eef2ff', padding: '2px 8px', borderRadius: 20, flexShrink: 0 }}>{issue.sequence_id.split('-').slice(-2).join('-')}</div>
                  <div style={{ flex: 1, fontSize: 12, color: '#0d0d12', fontWeight: 500 }}>{issue.provider}</div>
                  <div style={{ fontSize: 11, color: '#6b6880' }}>{issue.specialty}</div>
                  <Tag label={ISSUE_TYPE_LABELS[issue.issue_type as keyof typeof ISSUE_TYPE_LABELS]} colors={typeTag[issue.issue_type] || '#f4f3f8|#6b6880'} />
                  <Tag label={SEVERITY_LABELS[issue.severity as keyof typeof SEVERITY_LABELS]} colors={priTag[issue.severity]} />
                </div>
              ))
            )}
          </div>
        </div>

        {/* ── CHARTS ROW ── */}
        <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 16, marginBottom: 20 }}>

          {/* Issues by type */}
          <div style={{ background: '#fff', borderRadius: 14, padding: '18px 20px', border: '1px solid rgba(0,0,0,0.06)' }} className="pg-card-sm">
            <div style={{ fontSize: 13, fontWeight: 600, color: '#0d0d12', marginBottom: 16 }}>Issues by Detection Type</div>
            {issueTypes.map(t => (
              <div key={t.label} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: t.color, flexShrink: 0 }} />
                <div style={{ width: 135, fontSize: 12, color: '#374151', flexShrink: 0 }}>{t.label}</div>
                <div style={{ flex: 1, height: 8, background: '#f3f4f6', borderRadius: 4, overflow: 'hidden' }}>
                  <div style={{ width: `${t.pct}%`, height: '100%', background: t.color, borderRadius: 4, transition: 'width 0.3s' }} />
                </div>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#0d0d12', width: 30, textAlign: 'right' }}>{t.count}</div>
              </div>
            ))}
          </div>

          {/* Queue load */}
          <div style={{ background: '#fff', borderRadius: 14, padding: '18px 20px', border: '1px solid rgba(0,0,0,0.06)' }} className="pg-card-sm">
            <div style={{ fontSize: 13, fontWeight: 600, color: '#0d0d12', marginBottom: 16 }}>Queue Load by Team</div>
            {queues.map(q => (
              <div key={q.label} style={{ marginBottom: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: q.color }} />
                    <span style={{ fontSize: 12, color: '#374151' }}>{q.label}</span>
                  </div>
                  <span style={{ fontSize: 13, fontWeight: 700, color: '#0d0d12' }}>{q.count}</span>
                </div>
                <div style={{ height: 10, background: '#f3f4f6', borderRadius: 5, overflow: 'hidden' }}>
                  <div style={{ width: `${q.pct}%`, height: '100%', background: q.color, borderRadius: 5 }} />
                </div>
              </div>
            ))}
            <div style={{ marginTop: 8, padding: '10px 14px', background: '#f5f8ff', borderRadius: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 11, color: '#6b6880' }}>Total issues</span>
              <span style={{ fontSize: 14, fontWeight: 700, color: '#6366f1' }}>{apiSummary ? (apiSummary.open ?? apiSummary.total_open ?? '—') : '—'}</span>
            </div>
          </div>
        </div>

        {/* ── AGENT RUN HISTORY ── */}
        <div style={{ background: '#fff', borderRadius: 14, border: '1px solid rgba(0,0,0,0.06)', marginBottom: 20, overflow: 'hidden' }}>
          <div style={{ padding: '14px 20px', borderBottom: '1px solid rgba(0,0,0,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#fafafa' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ width: 9, height: 9, borderRadius: '50%', background: '#22c55e', display: 'inline-block', animation: 'pulse 2s infinite' }} />
              <span style={{ fontSize: 13, fontWeight: 600, color: '#0d0d12' }}>Agent Run History</span>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <span style={{ fontSize: 11, color: '#6366f1', background: '#eef2ff', padding: '3px 10px', borderRadius: 20, fontWeight: 500 }}>14 runs today</span>
              <span style={{ fontSize: 11, color: '#6b6880', background: '#f4f3f8', padding: '3px 10px', borderRadius: 20 }}>Next run in 1h 24m</span>
            </div>
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <thead>
              <tr style={{ background: '#f5f8ff' }}>
                {['Batch ID', 'Time', 'Status', 'Agents Ran', 'Issues Found', 'Duration'].map(h => (
                  <th key={h} style={{ padding: '9px 16px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: '#6b6880', borderBottom: '1px solid rgba(0,0,0,0.06)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {apiBatches.map(run => (
                <tr
                  key={run.batchId}
                  style={{ borderBottom: '1px solid rgba(0,0,0,0.04)', cursor: 'pointer' }}
                  onClick={() => navigate(`/queue?batch=${run.batchId}`)}
                  onMouseEnter={e => { e.currentTarget.style.background = '#f5f8ff' }}
                  onMouseLeave={e => { e.currentTarget.style.background = '' }}
                >
                  <td style={{ padding: '12px 16px' }}>
                    <span style={{ fontSize: 10, fontWeight: 700, color: '#6366f1', background: '#eef2ff', padding: '3px 9px', borderRadius: 20 }}>
                      {run.batchId.replace('PDM_Monitor_', 'PDM-')}
                    </span>
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <div style={{ fontWeight: 500, color: '#0d0d12' }}>{new Date(run.run_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                    <div style={{ fontSize: 10, color: '#a09db8', marginTop: 1 }}>{new Date(run.run_time).toLocaleDateString()}</div>
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <span style={{ fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 20, background: '#f0fdf4', color: '#166534' }}>
                      ✓ Complete
                    </span>
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <span style={{ fontSize: 10, background: '#eef2ff', color: '#6366f1', padding: '2px 7px', borderRadius: 20, fontWeight: 500 }}>Detection</span>
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ fontSize: 18, fontWeight: 700, color: Number(run.total_issues) > 0 ? '#dc2626' : '#9ca3af' }}>{run.total_issues || '—'}</span>
                      {Number(run.total_issues) > 0 && <span style={{ fontSize: 10, color: '#6b6880' }}>issues</span>}
                    </div>
                  </td>
                  <td style={{ padding: '12px 16px', color: '#6b6880', fontSize: 11 }}>
                    <span style={{ fontSize: 10, background: '#fef2f2', color: '#dc2626', padding: '2px 7px', borderRadius: 20, fontWeight: 600 }}>{run.high} H</span>{' '}
                    <span style={{ fontSize: 10, background: '#fffbeb', color: '#d97706', padding: '2px 7px', borderRadius: 20, fontWeight: 600 }}>{run.medium} M</span>
                  </td>
                </tr>
              ))}
              {apiBatches.length === 0 && (
                <tr><td colSpan={6} style={{ padding: 24, textAlign: 'center', color: '#a09db8', fontSize: 12 }}>Loading…</td></tr>
              )}
            </tbody>
          </table>
        </div>

        {/* ── RECENT FLAGGED ISSUES ── */}
        <div style={{ background: '#fff', borderRadius: 14, border: '1px solid rgba(0,0,0,0.06)', overflow: 'hidden' }} className="pg-card-sm">
          <div style={{ padding: '14px 20px', borderBottom: '1px solid rgba(0,0,0,0.06)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#fafafa' }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: '#0d0d12' }}>Recent Flagged Issues</span>
            <span onClick={() => navigate('/queue')} style={{ fontSize: 11, color: '#6366f1', cursor: 'pointer', fontWeight: 500, padding: '4px 12px', background: '#eef2ff', borderRadius: 20 }}>View all →</span>
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <thead>
              <tr style={{ background: '#f5f8ff' }}>
                {['Issue ID', 'Provider', 'NPI', 'Type', 'Priority', 'Queue', 'Detected'].map(h => (
                  <th key={h} style={{ padding: '9px 16px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: '#6b6880', borderBottom: '1px solid rgba(0,0,0,0.06)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {apiIssues.slice(0, 4).map((issue, idx) => (
                <tr key={issue.sequence_id}
                  onClick={() => navigate('/queue')}
                  style={{ borderBottom: idx < 3 ? '1px solid rgba(0,0,0,0.04)' : 'none', cursor: 'pointer' }}
                  onMouseEnter={e => { e.currentTarget.style.background = '#f5f8ff' }}
                  onMouseLeave={e => { e.currentTarget.style.background = '' }}
                >
                  <td style={{ padding: '11px 16px', color: '#6366f1', fontWeight: 700, fontSize: 11 }}>{issue.sequence_id.split('-').slice(-2).join('-')}</td>
                  <td style={{ padding: '11px 16px' }}>
                    <div style={{ fontWeight: 500, color: '#0d0d12' }}>{issue.provider}</div>
                    <div style={{ fontSize: 10, color: '#9ca3af', marginTop: 1 }}>{issue.specialty}</div>
                  </td>
                  <td style={{ padding: '11px 16px', color: '#6b6880', fontFamily: 'monospace', fontSize: 11 }}>{issue.npi}</td>
                  <td style={{ padding: '11px 16px' }}><Tag label={ISSUE_TYPE_LABELS[issue.issue_type as keyof typeof ISSUE_TYPE_LABELS]} colors={typeTag[issue.issue_type] || '#f4f3f8|#6b6880'} /></td>
                  <td style={{ padding: '11px 16px' }}><Tag label={SEVERITY_LABELS[issue.severity as keyof typeof SEVERITY_LABELS]} colors={priTag[issue.severity]} /></td>
                  <td style={{ padding: '11px 16px' }}><Tag label={QUEUE_LABELS[issue.queue_name as keyof typeof QUEUE_LABELS]} colors='#eff6ff|#1d4ed8' /></td>
                  <td style={{ padding: '11px 16px', color: '#9ca3af', fontSize: 11 }}>{new Date(issue.detectedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

      </div>

        {/* ── FOOTER ── */}
        <div style={{ borderTop: '1px solid #f1f5f9', padding: '12px 28px', display: 'flex', alignItems: 'center', gap: 16, marginTop: 8 }}>
          <span style={{ fontSize: 11, color: '#94a3b8' }}>© 2026 ProviderGuard AI</span>
          <span style={{ color: '#cbd5e1', fontSize: 11 }}>|</span>
          <span style={{ fontSize: 11, color: '#94a3b8' }}>All outputs are advisory only</span>
        </div>
      <style>{`
        .pg-card {
          transition: transform 0.22s ease, box-shadow 0.22s ease, border-color 0.22s ease;
        }
        .pg-card:hover {
          transform: translateY(-5px);
          box-shadow: 0 12px 28px rgba(99, 102, 241, 0.14);
          border-color: #c7d2fe !important;
        }
        .pg-card-sm {
          transition: transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease;
        }
        .pg-card-sm:hover {
          transform: translateY(-3px);
          box-shadow: 0 8px 20px rgba(99, 102, 241, 0.10);
          border-color: #e0e7ff !important;
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>
    </div>
  )
}
