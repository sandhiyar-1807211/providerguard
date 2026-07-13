import { authFetch } from '../auth/authFetch'
import { useState, useEffect, Fragment } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import type { Issue } from '../types'
import { QUEUE_LABELS, ISSUE_TYPE_LABELS, SEVERITY_LABELS } from '../types'

const API = 'http://localhost:3003'

const typeColors: Record<string, string> = {
  'DUPLICATE_RECORD':        '#faf5ff|#6d28d9',
  'CONFLICT_DETECTED':       '#fff7ed|#b45309',
  'DIRECTORY_MISMATCH':      '#f0fdfa|#0f766e',
  'CLAIMS_ACTIVITY_MISMATCH':'#eff6ff|#1d4ed8',
  'ONBOARDING_ISSUE':        '#F0FAF4|#15693B',
  'CREDENTIALING_MISMATCH':  '#fdf4ff|#86198f',
  'NETWORK_CONTRACT_MISMATCH':'#fff7ed|#c2410c',
  'ENROLLMENT_MISMATCH':     '#fefce8|#854d0e',
  'MASTER_DATA_QUALITY':     '#f0f9ff|#0369a1',
  'ENCOUNTER_MISMATCH':      '#f0fdfa|#0f766e',
}
const priColors: Record<string, string> = {
  'HIGH':   '#fff1f1|#D5493A',
  'MEDIUM': '#fff7ed|#b45309',
  'LOW':    '#F4F6FA|#565B66',
}
const statusColors: Record<string, string> = {
  'Open to Resolve': '#fff7ed|#b45309',
  'Resolved':        '#F0FAF4|#15693B',
  'False Positive':  '#F4F6FA|#565B66',
}

const statusDisplayLabel: Record<string, string> = {
  'Open to Resolve': 'Open',
  'Resolved':        'Resolved',
  'False Positive':  'False Positive',
}

function Tag({ label, colors }: { label: string; colors: string }) {
  const [bg, color] = colors.split('|')
  return (
    <span style={{ background: bg, color, fontSize: 10, fontWeight: 500, padding: '3px 9px', borderRadius: 20, whiteSpace: 'nowrap' }}>
      {label}
    </span>
  )
}

// Highlights matching search text in yellow
function Highlight({ text, query }: { text: string; query: string }) {
  if (!query.trim()) return <>{text}</>
  const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi')
  const parts = text.split(regex)
  return (
    <>
      {parts.map((part, i) =>
        regex.test(part) ? (
          <mark key={i} style={{ background: '#fef08a', color: '#713f12', borderRadius: 3, padding: '0 2px', fontWeight: 600 }}>
            {part}
          </mark>
        ) : (
          <span key={i}>{part}</span>
        )
      )}
    </>
  )
}

// Empty state component
function EmptyState({ search, typeFilter, priorityFilter, dateLabel, onClear }: {
  search: string; typeFilter: string; priorityFilter: string; dateLabel: string; onClear: () => void
}) {
  const hasFilter = search || typeFilter !== 'All types' || priorityFilter !== 'All priorities' || dateLabel !== 'All dates'
  return (
    <div style={{ padding: '52px 24px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#fff' }}>
      <svg width="120" height="100" viewBox="0 0 120 100" fill="none" style={{ marginBottom: 20 }}>
        <rect x="10" y="20" width="100" height="70" rx="10" fill="#F4F6FA" stroke="#e0d9ff" strokeWidth="1.5"/>
        <rect x="22" y="34" width="60" height="7" rx="3.5" fill="#ddd6fe"/>
        <rect x="22" y="47" width="45" height="7" rx="3.5" fill="#E6ECFA"/>
        <rect x="22" y="60" width="52" height="7" rx="3.5" fill="#E6ECFA"/>
        <circle cx="93" cy="30" r="18" fill="#fff" stroke="#e0d9ff" strokeWidth="1.5"/>
        <path d="M86 30 Q93 22 100 30" stroke="#1F3A93" strokeWidth="2" strokeLinecap="round" fill="none"/>
        <circle cx="90" cy="33" r="1.5" fill="#1F3A93"/>
        <circle cx="96" cy="33" r="1.5" fill="#1F3A93"/>
        <line x1="105" y1="43" x2="113" y2="51" stroke="#1F3A93" strokeWidth="2.5" strokeLinecap="round"/>
      </svg>
      <div style={{ fontSize: 15, fontWeight: 600, color: '#12141A', marginBottom: 8 }}>No issues found</div>
      <div style={{ fontSize: 13, color: '#565B66', textAlign: 'center', maxWidth: 320, lineHeight: 1.6, marginBottom: 16 }}>
        {hasFilter
          ? 'No issues match your current filters. Try adjusting the search or filter criteria.'
          : 'All issues have been resolved. Great work!'}
      </div>
      {hasFilter && (
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', justifyContent: 'center', marginBottom: 16 }}>
          {search && <span style={{ fontSize: 11, background: '#E6ECFA', color: '#1F3A93', padding: '3px 10px', borderRadius: 20, fontWeight: 500 }}>Search: "{search}"</span>}
          {typeFilter !== 'All types' && <span style={{ fontSize: 11, background: '#E6ECFA', color: '#1F3A93', padding: '3px 10px', borderRadius: 20, fontWeight: 500 }}>{typeFilter}</span>}
          {priorityFilter !== 'All priorities' && <span style={{ fontSize: 11, background: '#E6ECFA', color: '#1F3A93', padding: '3px 10px', borderRadius: 20, fontWeight: 500 }}>{priorityFilter}</span>}
          {dateLabel !== 'All dates' && <span style={{ fontSize: 11, background: '#E6ECFA', color: '#1F3A93', padding: '3px 10px', borderRadius: 20, fontWeight: 500 }}>{dateLabel}</span>}
        </div>
      )}
      {hasFilter && (
        <button
          onClick={onClear}
          style={{ padding: '8px 20px', background: '#1F3A93', color: '#fff', border: 'none', borderRadius: 8, fontSize: 12, fontWeight: 500, cursor: 'pointer' }}
        >
          Clear all filters
        </button>
      )}
    </div>
  )
}

const dateOptions = [
  { label: 'All dates', count: 0 },
  { label: 'Today', count: 0 },
  { label: 'Yesterday', count: 0 },
  { label: 'This week', count: 0 },
  { label: 'Last 7 days', count: 0 },
  { label: 'This month', count: 0 },
]

// ── PREVIOUS RUNS MOCK DATA ──
const runHistories: Record<string, { title: string; sub: string; runs: any[] }> = {
  'PDM_Monitor_260605093022-ReqID_08-001': {
    title: 'Run History — ReqID_08-001',
    sub: 'Dr. Maria Lopez · DUPLICATE_RECORD · NPI 1234567890',
    runs: [
      { batch: 'PDM_Monitor_260605093022', date: 'Jun 5, 2026 · 09:12 AM', status: 'Success', agents: ['Duplicate', 'Conflict'], confidence: '92%', evidence: 'Two active provider records share NPI 1234567890 with differing service addresses.', impacted: ['npi', 'address'], action: 'open', actionLabel: 'Open — awaiting review', user: '', time: '' },
      { batch: 'PDM_Monitor_260604233022', date: 'Jun 4, 2026 · 11:30 PM', status: 'Success', agents: ['Duplicate'], confidence: '89%', evidence: 'High probability duplicate detected on NPI and TIN fields.', impacted: ['npi', 'tin'], action: 'open', actionLabel: 'Open — not yet reviewed', user: '', time: '' },
      { batch: 'PDM_Monitor_260603090000', date: 'Jun 3, 2026 · 09:00 AM', status: 'Partial', agents: ['Duplicate'], confidence: '75%', evidence: 'Probable match on name and address fields.', impacted: ['provider_name', 'address'], action: 'fp', actionLabel: 'Marked false positive — address updated since then', user: 'Ravi Kumar · Directory Analyst', time: 'Jun 3, 2026 · 10:15 AM' },
    ]
  },
  'PDM_Monitor_260605093022-ReqID_09-001': {
    title: 'Run History — ReqID_09-001',
    sub: 'Sunrise Medical Grp · CONFLICT_DETECTED · NPI 9876543210',
    runs: [
      { batch: 'PDM_Monitor_260605093022', date: 'Jun 5, 2026 · 08:54 AM', status: 'Success', agents: ['Conflict'], confidence: '78%', evidence: 'Same provider has conflicting phone numbers across two records.', impacted: ['phone_number'], action: 'open', actionLabel: 'Open — awaiting review', user: '', time: '' },
    ]
  },
  'PDM_Monitor_260605073022-ReqID_10-001': {
    title: 'Run History — ReqID_10-001',
    sub: 'Dr. James Patel · DIRECTORY_MISMATCH · NPI 1122334455',
    runs: [
      { batch: 'PDM_Monitor_260605073022', date: 'Jun 5, 2026 · 08:31 AM', status: 'Success', agents: ['Directory'], confidence: '85%', evidence: 'Provider directory shows different address than QNXT master data.', impacted: ['address', 'specialty'], action: 'open', actionLabel: 'Open — awaiting review', user: '', time: '' },
      { batch: 'PDM_Monitor_260604233022', date: 'Jun 4, 2026 · 11:30 PM', status: 'Success', agents: ['Directory', 'Master Data'], confidence: '81%', evidence: 'Directory address mismatch detected.', impacted: ['address'], action: 'open', actionLabel: 'Open — not reviewed', user: '', time: '' },
    ]
  },
}

// ── AUTO-GENERATE DEFAULT RUN HISTORY ──
const agentsByType: Record<string, string[]> = {
  'DUPLICATE_RECORD':          ['Duplicate Detection', 'NPI Validator'],
  'CONFLICT_DETECTED':         ['Conflict Analyzer', 'Directory Sync'],
  'DIRECTORY_MISMATCH':        ['Directory Validator', 'Address Verifier'],
  'CLAIMS_ACTIVITY_MISMATCH':  ['Claims Auditor', 'Enrollment Checker'],
  'ONBOARDING_ISSUE':          ['Onboarding Validator', 'Credentialing Agent'],
  'MASTER_DATA_QUALITY':       ['Data Quality Agent', 'MDM Checker'],
  'CREDENTIALING_MISMATCH':    ['Credentialing Agent', 'License Verifier'],
  'NETWORK_CONTRACT_MISMATCH': ['Network Validator', 'Contract Agent'],
  'ENROLLMENT_MISMATCH':       ['Enrollment Checker', 'NPI Validator'],
  'ENCOUNTER_MISMATCH':        ['Encounter Auditor', 'Claims Auditor'],
}

function generateDefaultHistory(issue: Issue) {
  const agents = agentsByType[issue.issue_type] || ['Detection Agent', 'Validation Agent']
  const batchId = issue.batchId
  const reqId   = issue.sequence_id.split('-').slice(-2).join('-')
  const raw  = batchId.replace('PDM_Monitor_', '')
  const day = raw.slice(4, 6)
  const hr   = raw.slice(6, 8), min = raw.slice(8, 10)
  const date1 = `Jun ${parseInt(day)}, 2026 · ${hr}:${min} AM`
  const date2 = `Jun ${Math.max(parseInt(day) - 1, 1)}, 2026 · 11:30 PM`
  const conf1 = issue.confidence_score >= 0.90 ? '94%' : issue.confidence_score >= 0.75 ? '84%' : '72%'
  const conf2 = issue.confidence_score >= 0.90 ? '88%' : issue.confidence_score >= 0.75 ? '76%' : '65%'

  return {
    title: `Run History — ${reqId}`,
    sub: `${issue.provider} · ${issue.issue_type} · NPI ${issue.npi}`,
    runs: [
      {
        batch: batchId,
        date: date1,
        status: 'Success',
        agents,
        confidence: conf1,
        evidence: issue.evidence_summary || 'Provider data anomaly detected across source systems.',
        impacted: typeof issue.impacted_fields === 'string' ? issue.impacted_fields.split(',') : issue.impacted_fields || [],
        action: issue.status === 'Resolved' ? 'accepted' : issue.status === 'False Positive' ? 'fp' : 'open',
        actionLabel: issue.status === 'Resolved' ? `Resolved by ${issue.resolution_by || 'Analyst'}` : issue.status === 'False Positive' ? `Marked false positive — ${issue.resolution_done || ''}` : 'Open — awaiting review',
        user: issue.resolution_by || '',
        time: issue.resolution_timestamp || '',
      },
      {
        batch: batchId.replace(raw.slice(0, 6), String(parseInt(raw.slice(0, 6)) - 1).padStart(6, '0')),
        date: date2,
        status: 'Success',
        agents: [agents[0]],
        confidence: conf2,
        evidence: 'Initial scan flagged this provider for further review based on data inconsistency patterns.',
        impacted: typeof issue.impacted_fields === 'string' ? issue.impacted_fields.split(',').slice(0, 1) : [],
        action: 'open',
        actionLabel: 'Open — not yet reviewed',
        user: '',
        time: '',
      },
    ],
  }
}

// ── PREVIOUS RUNS MODAL ──
function PrevRunsModal({ sequenceId, issue, onClose }: { sequenceId: string; issue: Issue; onClose: () => void }) {
  const data = runHistories[sequenceId] || generateDefaultHistory(issue)

  return (
    <div
      style={{ position: 'fixed', inset: 0, background: 'rgba(15,17,23,0.45)', backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}
      onClick={onClose}
    >
      <div
        style={{ background: '#fff', borderRadius: 16, width: 640, maxWidth: '100%', maxHeight: '88vh', display: 'flex', flexDirection: 'column', boxShadow: '0 24px 60px rgba(0,0,0,0.2)' }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{ padding: '18px 22px 14px', borderBottom: '1px solid rgba(0,0,0,0.07)', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexShrink: 0 }}>
          <div>
            <div style={{ fontSize: 16, fontWeight: 600, color: '#12141A', marginBottom: 4 }}>{data?.title || 'Run History'}</div>
            <div style={{ fontSize: 12, color: '#565B66' }}>{data?.sub || sequenceId}</div>
          </div>
          <button onClick={onClose} style={{ width: 30, height: 30, borderRadius: 8, border: '1px solid rgba(0,0,0,0.09)', background: '#fff', cursor: 'pointer', fontSize: 15, color: '#565B66', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
        </div>
        <div style={{ padding: '18px 22px', overflowY: 'auto', flex: 1 }}>
          {!data ? (
            <div style={{ textAlign: 'center', color: '#737985', padding: 30 }}>No run history available for this issue.</div>
          ) : (
            <div style={{ position: 'relative', paddingLeft: 28 }}>
              <div style={{ position: 'absolute', left: 10, top: 0, bottom: 0, width: 2, background: '#e9e4fe', borderRadius: 2 }} />
              {data.runs.map((run, idx) => {
                const dotColor = run.status === 'Success' ? '#15693B' : run.status === 'Partial' ? '#b45309' : '#D5493A'
                const acBg = run.action === 'accepted' ? '#F0FAF4' : run.action === 'fp' ? '#F4F6FA' : '#fff7ed'
                const acBorder = run.action === 'accepted' ? '#B6EDD0' : run.action === 'fp' ? '#D0D4DD' : '#fed7aa'
                const acColor = run.action === 'accepted' ? '#15693B' : run.action === 'fp' ? '#565B66' : '#b45309'
                const acIcon = run.action === 'accepted' ? '✅' : run.action === 'fp' ? '🚫' : '⏳'
                const isLatest = idx === 0
                return (
                  <div key={idx} style={{ position: 'relative', marginBottom: 18 }}>
                    <div style={{ position: 'absolute', left: -23, top: 14, width: 14, height: 14, borderRadius: '50%', background: dotColor, border: '2px solid #fff', boxShadow: `0 0 0 2px ${dotColor}`, zIndex: 1 }} />
                    <div style={{ background: '#fff', border: '1px solid rgba(0,0,0,0.07)', borderRadius: 10, padding: '12px 14px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span style={{ fontSize: 10, fontWeight: 700, color: '#1F3A93', background: '#E6ECFA', padding: '2px 8px', borderRadius: 20 }}>
                            {run.batch.replace('PDM_Monitor_', 'PDM-')}
                          </span>
                          {isLatest && <span style={{ fontSize: 10, color: '#1F3A93', background: '#E6ECFA', padding: '1px 7px', borderRadius: 20 }}>Latest</span>}
                        </div>
                        <span style={{ fontSize: 11, color: '#737985' }}>{run.date}</span>
                      </div>
                      <div style={{ display: 'flex', gap: 8, marginBottom: 7, flexWrap: 'wrap', alignItems: 'center' }}>
                        <span style={{ fontSize: 10, fontWeight: 500, padding: '2px 8px', borderRadius: 20, background: run.status === 'Success' ? '#F0FAF4' : run.status === 'Partial' ? '#fff7ed' : '#fff1f1', color: run.status === 'Success' ? '#15693B' : run.status === 'Partial' ? '#b45309' : '#D5493A' }}>{run.status}</span>
                        <span style={{ fontSize: 11, color: '#565B66' }}>Confidence: <strong>{run.confidence}</strong></span>
                      </div>
                      <div style={{ fontSize: 11, color: '#565B66', marginBottom: 5 }}>
                        <strong>Agents ran: </strong>
                        {run.agents.map((a: string, i: number) => (
                          <span key={i} style={{ fontSize: 10, background: '#F4F6FA', color: '#1F3A93', padding: '2px 7px', borderRadius: 20, marginRight: 4 }}>{a}</span>
                        ))}
                      </div>
                      <div style={{ fontSize: 11, color: '#565B66', marginBottom: 5 }}><strong>Evidence: </strong>{run.evidence}</div>
                      <div style={{ fontSize: 11, color: '#565B66', marginBottom: 7 }}>
                        <strong>Impacted: </strong>
                        {run.impacted.map((f: string, i: number) => (
                          <span key={i} style={{ fontSize: 10, background: '#F4F6FA', color: '#565B66', padding: '2px 7px', borderRadius: 20, marginRight: 4 }}>{f}</span>
                        ))}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 6, padding: '7px 10px', borderRadius: 8, background: acBg, border: `1px solid ${acBorder}` }}>
                        <span style={{ fontSize: 14 }}>{acIcon}</span>
                        <div>
                          <div style={{ fontSize: 11, color: acColor }}>{run.actionLabel}</div>
                          {run.user && <div style={{ fontSize: 10, color: acColor, opacity: 0.75, marginTop: 2 }}>{run.user} · {run.time}</div>}
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ── TOAST ──
function Toast({ msg, type, onDone }: { msg: string; type: 'success' | 'info' | 'error'; onDone: () => void }) {
  useEffect(() => {
    const t = setTimeout(onDone, 3000)
    return () => clearTimeout(t)
  }, [onDone])

  const cfg = {
    success: { bg: '#F0FAF4', border: '#B6EDD0', color: '#15693B', icon: '✓' },
    info:    { bg: '#F4F6FA', border: '#D0D4DD', color: '#565B66',  icon: '•' },
    error:   { bg: '#fff1f1', border: '#fecaca', color: '#D5493A',  icon: '✕' },
  }[type]

  return (
    <div style={{
      position: 'fixed', bottom: 28, right: 28, zIndex: 9999,
      background: cfg.bg, border: `1px solid ${cfg.border}`,
      borderRadius: 12, padding: '13px 18px',
      display: 'flex', alignItems: 'center', gap: 10,
      boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
      animation: 'slideIn 0.25s ease',
      minWidth: 260,
    }}>
      <div style={{ width: 26, height: 26, borderRadius: '50%', background: cfg.border, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, color: cfg.color, flexShrink: 0 }}>
        {cfg.icon}
      </div>
      <span style={{ fontSize: 13, color: cfg.color, fontWeight: 500 }}>{msg}</span>
    </div>
  )
}

// Modal component
function IssueModal({ issue, onClose, onStatusChange }: { issue: Issue; onClose: () => void; onStatusChange: (id: string, status: 'Resolved' | 'False Positive') => void }) {
  const [expanded, setExpanded] = useState(false)
  const [resolved, setResolved] = useState(issue.status === 'Resolved')
  const [resolvedTime, setResolvedTime] = useState(issue.resolution_timestamp || '')
  const [showFpForm, setShowFpForm] = useState(false)
  const [fpReason, setFpReason] = useState('')
  const [fpError, setFpError] = useState(false)
  const [fpDone, setFpDone] = useState(issue.status === 'False Positive')
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'info' | 'error' } | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.target instanceof HTMLTextAreaElement) return
      if (resolved || fpDone || showFpForm || saving) return
      if (e.key === 'a' || e.key === 'A') handleAccept()
      if (e.key === 'f' || e.key === 'F') setShowFpForm(true)
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [resolved, fpDone, showFpForm, saving])

  const impactedSet = new Set(
    (Array.isArray(issue.impacted_fields) ? issue.impacted_fields : [])
      .map((f: string) => f.toLowerCase().trim())
  )
  const isImpacted = (...keys: string[]) => keys.some(k => impactedSet.has(k))

  const recordAId = issue.provider_id_a || 'Record A'
  const recordBId = issue.provider_id_b || 'Record B'
  const isDuplicate = issue.issue_type === 'DUPLICATE_RECORD'

  const allFields = [
    { field: 'NPI',           a: String(issue.provider_npi || issue.npi || 'N/A'),        b: issue.record_b_npi != null ? String(issue.record_b_npi) : 'N/A', impacted: isImpacted('npi', 'provider_npi') },
    { field: 'TIN',           a: issue.provider_tin           || 'N/A',                   b: issue.record_b_tin           || 'N/A', impacted: isImpacted('tin', 'provider_tin', 'fedid') },
    { field: 'Address',       a: issue.provider_address       || 'N/A',                   b: issue.record_b_address       || 'N/A', impacted: isImpacted('address', 'provider_address') },
    { field: 'Specialty',     a: issue.provider_specialty || issue.specialty || 'N/A',    b: issue.record_b_specialty     || 'N/A', impacted: isImpacted('specialty', 'provider_specialty') },
    { field: 'Active Status', a: issue.provider_active_status || 'N/A',                   b: issue.record_b_active_status || 'N/A', impacted: isImpacted('active_status', 'provider_active_status', 'status') },
    { field: 'Phone',         a: issue.provider_phone         || 'N/A',                   b: 'N/A', impacted: isImpacted('phone', 'provider_phone') },
    { field: 'Taxonomy',      a: issue.provider_taxonomy      || 'N/A',                   b: 'N/A', impacted: isImpacted('taxonomy', 'provider_taxonomy') },
    { field: 'Network',       a: issue.provider_network       || 'N/A',                   b: 'N/A', impacted: isImpacted('network', 'provider_network') },
    { field: 'Contract Start',a: issue.provider_contract_start|| 'N/A',                   b: 'N/A', impacted: isImpacted('contract_start', 'provider_contract_start') },
    { field: 'Provider Type', a: issue.provider_type          || 'N/A',                   b: 'N/A', impacted: isImpacted('type', 'provider_type', 'provtype') },
    { field: 'Billing NPI',   a: issue.provider_billing_npi   || 'N/A',                   b: 'N/A', impacted: isImpacted('billing_npi', 'provider_billing_npi') },
  ]

  const visibleFields = expanded ? allFields : allFields.slice(0, 5)
  const scoreColor = issue.confidence_score >= 0.90 ? '#15693B' : issue.confidence_score >= 0.75 ? '#1F3A93' : '#b45309'

  async function handleAccept() {
    setSaving(true)
    try {
      await authFetch(`${API}/api/findings/${encodeURIComponent(issue.sequence_id)}/resolve`, { credentials: 'include',
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'Resolved',
          resolution_done: 'Accepted — valid issue, resolution confirmed',
          resolution_by: 'Sandhiya Raja',
        }),
      })
      const now = new Date()
      const timeStr = now.toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })
      setResolvedTime(timeStr)
      setResolved(true)
      onStatusChange(issue.sequence_id, 'Resolved')
      setToast({ msg: `Issue ${issue.sequence_id.split('-').slice(-2).join('-')} resolved and saved!`, type: 'success' })
    } catch {
      setToast({ msg: 'Failed to save. Please try again.', type: 'error' })
    } finally {
      setSaving(false)
    }
  }

  async function handleFpSubmit() {
    if (!fpReason.trim()) { setFpError(true); return }
    setFpError(false)
    setSaving(true)
    try {
      await authFetch(`${API}/api/findings/${encodeURIComponent(issue.sequence_id)}/resolve`, { credentials: 'include',
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'False Positive',
          resolution_done: fpReason,
          resolution_by: 'Sandhiya Raja',
        }),
      })
      setFpDone(true)
      onStatusChange(issue.sequence_id, 'False Positive')
      setToast({ msg: 'Marked as false positive and saved.', type: 'info' })
    } catch {
      setToast({ msg: 'Failed to save. Please try again.', type: 'error' })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div
      style={{ position: 'fixed', inset: 0, background: 'rgba(15,17,23,0.45)', backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)', zIndex: 999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}
      onClick={onClose}
    >
      <div
        style={{ background: '#fff', borderRadius: 16, width: 700, maxWidth: '100%', maxHeight: '90vh', display: 'flex', flexDirection: 'column', boxShadow: '0 24px 60px rgba(0,0,0,0.2)' }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{ padding: '18px 22px 14px', borderBottom: '1px solid rgba(0,0,0,0.07)', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexShrink: 0 }}>
          <div>
            <div style={{ fontSize: 17, fontWeight: 600, color: '#12141A', marginBottom: 6 }}>{issue.sequence_id.split('-').slice(-2).join('-')} — {issue.provider}</div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
              <Tag label={ISSUE_TYPE_LABELS[issue.issue_type]} colors={typeColors[issue.issue_type] || '#F4F6FA|#565B66'} />
              <Tag label={`${SEVERITY_LABELS[issue.severity]} priority`} colors={priColors[issue.severity]} />
              {resolved ? <Tag label="Resolved" colors="#F0FAF4|#15693B" /> : fpDone ? <Tag label="False Positive" colors="#F4F6FA|#565B66" /> : <Tag label={issue.status} colors={statusColors[issue.status]} />}
              <span style={{ fontSize: 11, color: '#737985', marginLeft: 4 }}>NPI: {issue.npi}</span>
            </div>
          </div>
          <button onClick={onClose} style={{ width: 32, height: 32, borderRadius: 8, border: '1px solid rgba(0,0,0,0.09)', background: '#fff', cursor: 'pointer', fontSize: 16, color: '#565B66', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginLeft: 12 }}>✕</button>
        </div>

        <div style={{ padding: '18px 22px', overflowY: 'auto', flex: 1 }}>
          <div style={{ background: 'linear-gradient(135deg,#F4F6FA,#faf8ff)', border: '1px solid rgba(124,93,250,0.2)', borderRadius: 12, padding: '16px 18px', marginBottom: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              <div style={{ width: 26, height: 26, background: '#1F3A93', borderRadius: 7, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 14 }}>✦</div>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#1F3A93' }}>AI Recommendation</div>
              <span style={{ marginLeft: 'auto', fontSize: 11, color: '#1F3A93', background: 'rgba(124,93,250,0.1)', padding: '3px 10px', borderRadius: 20 }}>{issue.req_id}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 12 }}>
              <div style={{ width: 64, height: 64, borderRadius: '50%', border: `3px solid ${scoreColor}`, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flexShrink: 0, background: '#fff' }}>
                <div style={{ fontSize: 20, fontWeight: 700, color: scoreColor, lineHeight: 1, animation: 'fadeIn 0.6s ease forwards' }}>{Math.round(issue.confidence_score * 100)}%</div>
                <style>{`@keyframes fadeIn { from { opacity:0; transform:scale(0.7); } to { opacity:1; transform:scale(1); } }`}</style>
                <div style={{ fontSize: 9, color: '#737985', marginTop: 1 }}>confidence</div>
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#565B66', marginBottom: 5 }}>
                  <span>AI confidence score</span>
                  <span style={{ fontWeight: 600, color: scoreColor }}>{Math.round(issue.confidence_score * 100)}% — {issue.confidence_score >= 0.90 ? 'Very high' : issue.confidence_score >= 0.75 ? 'High' : 'Moderate'} confidence</span>
                </div>
                <div style={{ height: 10, background: '#e9e4fe', borderRadius: 5, overflow: 'hidden' }}>
                  <div style={{
                    width: `${Math.round(issue.confidence_score * 100)}%`,
                    height: '100%',
                    background: `linear-gradient(90deg, ${scoreColor}88, ${scoreColor})`,
                    borderRadius: 5,
                    animation: 'growBar 1.2s cubic-bezier(0.22,1,0.36,1) forwards',
                    transformOrigin: 'left',
                  }} />
                </div>
                <style>{`
                  @keyframes growBar {
                    from { width: 0%; opacity: 0.4; }
                    to   { width: ${Math.round(issue.confidence_score * 100)}%; opacity: 1; }
                  }
                `}</style>
                <div style={{ fontSize: 11, color: '#737985', marginTop: 5 }}>Based on NPI match strength, attribute overlap, and historical pattern similarity</div>
              </div>
            </div>
            <div style={{ fontSize: 12, color: '#4a4560', lineHeight: 1.7, paddingTop: 10, borderTop: '1px solid rgba(124,93,250,0.15)' }}>
              <strong>Evidence:</strong> {issue.evidence_summary || '—'}<br/>
              {issue.ai_rationale && <><br/><strong>Risk:</strong> {issue.ai_rationale}</>}
            </div>
          </div>

          <div style={{ marginBottom: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: '#12141A' }}>Field comparison — evidence</div>
              <button onClick={() => setExpanded(!expanded)} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: '#1F3A93', background: '#E6ECFA', border: 'none', padding: '4px 10px', borderRadius: 6, cursor: 'pointer' }}>
                {expanded ? '▲ Show less' : '▼ Show all fields'}
              </button>
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse', borderRadius: 10, overflow: 'hidden', border: '1px solid rgba(0,0,0,0.07)', fontSize: 12 }}>
              <thead>
                <tr style={{ background: '#F4F6FA' }}>
                  <th style={{ padding: '9px 12px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: '#565B66', width: 120 }}>Field</th>
                  <th style={{ padding: '9px 12px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: '#565B66' }}>{recordAId} <span style={{ fontWeight: 400, color: '#737985' }}>(live)</span></th>
                  {isDuplicate && <th style={{ padding: '9px 12px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: '#565B66' }}>{recordBId} <span style={{ fontWeight: 400, color: '#737985' }}>(duplicate)</span></th>}
                  <th style={{ padding: '9px 12px', textAlign: 'center', fontSize: 11, fontWeight: 600, color: '#565B66', width: 90 }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {visibleFields.map(row => (
                  <tr key={row.field} style={{ borderBottom: '1px solid rgba(0,0,0,0.05)' }}>
                    <td style={{ padding: '9px 12px', color: '#565B66', fontWeight: 500 }}>{row.field}</td>
                    <td style={{ padding: '9px 12px', background: row.impacted ? '#fff5f5' : '#fff', color: row.impacted ? '#D5493A' : row.a === 'N/A' ? '#737985' : '#12141A', fontWeight: row.impacted ? 500 : 400, fontStyle: row.a === 'N/A' ? 'italic' : 'normal' }}>{row.a}</td>
                    {isDuplicate && <td style={{ padding: '9px 12px', color: '#737985', fontStyle: 'italic' }}>{row.b}</td>}
                    <td style={{ padding: '9px 12px', textAlign: 'center' }}>
                      {row.impacted
                        ? <Tag label="Impacted" colors="#fff1f1|#D5493A" />
                        : row.a === 'N/A'
                          ? <span style={{ fontSize: 11, color: '#737985' }}>— N/A</span>
                          : <span style={{ fontSize: 11, color: '#15693B' }}>● OK</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div style={{ padding: '14px 22px', borderTop: '1px solid rgba(0,0,0,0.07)', background: '#F4F6FA', flexShrink: 0 }}>
          {resolved ? (
            <div style={{ background: '#F0FAF4', border: '1px solid #B6EDD0', borderRadius: 10, padding: '14px 16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                <span style={{ fontSize: 18 }}>✅</span>
                <span style={{ fontSize: 13, fontWeight: 600, color: '#15693B' }}>Issue Resolved</span>
              </div>
              <div style={{ fontSize: 12, color: '#15693B' }}>Resolved by <strong>Sandhiya Raja</strong> (Provider OPS Analyst)</div>
              <div style={{ fontSize: 11, color: '#4ade80', marginTop: 3 }}>🕐 {resolvedTime}</div>
            </div>
          ) : fpDone ? (
            <div style={{ background: '#F4F6FA', border: '1px solid #D0D4DD', borderRadius: 10, padding: '14px 16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                <span style={{ fontSize: 18 }}>🚫</span>
                <span style={{ fontSize: 13, fontWeight: 600, color: '#565B66' }}>Marked as False Positive</span>
              </div>
              <div style={{ fontSize: 12, color: '#565B66' }}>By <strong>Sandhiya Raja</strong> — {fpReason}</div>
            </div>
          ) : showFpForm ? (
            <div>
              <div style={{ fontSize: 12, fontWeight: 600, color: '#12141A', marginBottom: 8 }}>Review & Action — Reason required</div>
              <textarea
                value={fpReason}
                onChange={e => { setFpReason(e.target.value); setFpError(false) }}
                placeholder="Type your reason for marking as false positive… (required)"
                style={{ width: '100%', padding: '9px 12px', border: `1px solid ${fpError ? '#D5493A' : 'rgba(0,0,0,0.09)'}`, borderRadius: 8, fontSize: 12, background: '#fff', resize: 'none', height: 64, fontFamily: 'inherit', outline: 'none', marginBottom: 4 }}
              />
              {fpError && <div style={{ fontSize: 11, color: '#D5493A', marginBottom: 8 }}>⚠ Reason is required before submitting.</div>}
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={handleFpSubmit} disabled={saving} style={{ padding: '8px 16px', background: saving ? '#F4F6FA' : '#fff1f1', color: saving ? '#737985' : '#D5493A', border: `1px solid ${saving ? '#D0D4DD' : '#fecaca'}`, borderRadius: 8, fontSize: 12, fontWeight: 500, cursor: saving ? 'default' : 'pointer' }}>
                  {saving ? '⟳ Saving…' : '✕ Submit false positive'}
                </button>
                <button onClick={() => { setShowFpForm(false); setFpError(false) }} disabled={saving} style={{ padding: '8px 14px', background: '#fff', color: '#565B66', border: '1px solid rgba(0,0,0,0.09)', borderRadius: 8, fontSize: 12, cursor: saving ? 'default' : 'pointer' }}>Cancel</button>
              </div>
            </div>
          ) : (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: '#12141A' }}>Review & Action</div>
                <div style={{ display: 'flex', gap: 6 }}>
                  <span style={{ fontSize: 10, background: '#F0FAF4', color: '#15693B', border: '1px solid #B6EDD0', padding: '2px 8px', borderRadius: 6, fontWeight: 500 }}>A — Accept</span>
                  <span style={{ fontSize: 10, background: '#fff1f1', color: '#D5493A', border: '1px solid #fecaca', padding: '2px 8px', borderRadius: 6, fontWeight: 500 }}>F — False positive</span>
                  <span style={{ fontSize: 10, background: '#F4F6FA', color: '#565B66', border: '1px solid #e5e3f0', padding: '2px 8px', borderRadius: 6, fontWeight: 500 }}>Esc — Close</span>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 9, alignItems: 'center' }}>
                <button onClick={handleAccept} disabled={saving} style={{ padding: '9px 18px', background: saving ? '#F4F6FA' : '#F0FAF4', color: saving ? '#737985' : '#15693B', border: `1px solid ${saving ? '#D0D4DD' : '#B6EDD0'}`, borderRadius: 8, fontSize: 12, fontWeight: 500, cursor: saving ? 'default' : 'pointer' }}>
                  {saving ? '⟳ Saving…' : '✓ Accept — valid issue'}
                </button>
                <button onClick={() => setShowFpForm(true)} disabled={saving} style={{ padding: '9px 18px', background: '#fff1f1', color: '#D5493A', border: '1px solid #fecaca', borderRadius: 8, fontSize: 12, fontWeight: 500, cursor: saving ? 'default' : 'pointer' }}>✕ Mark as false positive</button>
              </div>
            </div>
          )}
        </div>
      </div>
      {toast && <Toast msg={toast.msg} type={toast.type} onDone={() => setToast(null)} />}
      <style>{`@keyframes slideIn { from { transform: translateY(20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }`}</style>
    </div>
  )
}

export default function WorkQueue() {
  const navigate = useNavigate()
  const [issues, setIssues] = useState<Issue[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedIssue, setSelectedIssue] = useState<Issue | null>(null)
  const [activeTab, setActiveTab] = useState('All')
  const [dateLabel, setDateLabel] = useState('All dates')
  const [showDateDrop, setShowDateDrop] = useState(false)
  const [batchFilter, setBatchFilter] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('All types')
  const [priorityFilter, setPriorityFilter] = useState('All priorities')
  const [tabs, setTabs] = useState(['All', 'Provider Ops', 'Directory', 'Compliance'])
  const [searchParams] = useSearchParams()
  const [prevRunsId, setPrevRunsId] = useState<{ id: string; issue: Issue } | null>(null)

  // Fetch issues from API — polls every 30 seconds
  useEffect(() => {
    function loadIssues() {
      authFetch(`${API}/api/findings`, { credentials: 'include' })
        .then(r => r.json())
        .then(data => {
          const normalized = data.map((i: any) => ({
            ...i,
            impacted_fields: Array.isArray(i.impacted_fields)
              ? i.impacted_fields
              : typeof i.impacted_fields === 'string'
                ? (() => { try { return JSON.parse(i.impacted_fields) } catch { return i.impacted_fields.split(',') } })()
                : [],
          }))
          setIssues(normalized)
          const total = normalized.length
          const ops   = normalized.filter((i: any) => i.queue_name === 'PROVIDER_OPS').length
          const dir   = normalized.filter((i: any) => i.queue_name === 'DIRECTORY_OPS').length
          const comp  = normalized.filter((i: any) => i.queue_name === 'COMPLIANCE').length
          setTabs([`All (${total})`, `Provider Ops (${ops})`, `Directory (${dir})`, `Compliance (${comp})`])
          setLoading(false)
        })
        .catch(() => setLoading(false))
    }

    setLoading(true)
    loadIssues()
    const interval = setInterval(loadIssues, 30000)
    return () => clearInterval(interval)
  }, [])

  const [statusFilter, setStatusFilter] = useState('All')
  const [currentPage, setCurrentPage] = useState(1)
  const PAGE_SIZE = 25

  useEffect(() => {
    const batch = searchParams.get('batch')
    if (batch) setBatchFilter(batch)
    const status = searchParams.get('status')
    if (status === 'open') setStatusFilter('Open to Resolve')
  }, [searchParams])

  function handleStatusChange(sequenceId: string, newStatus: 'Resolved' | 'False Positive') {
    setIssues(prev => prev.map(i => i.sequence_id === sequenceId ? { ...i, status: newStatus } : i))
  }

  useEffect(() => { setCurrentPage(1) }, [search, typeFilter, priorityFilter, dateLabel, activeTab, statusFilter, batchFilter])

  const filteredIssues = issues.filter(i => {
    const matchSearch = search === '' ||
      i.provider.toLowerCase().includes(search.toLowerCase()) ||
      i.npi.includes(search) ||
      i.sequence_id.toLowerCase().includes(search.toLowerCase())
    const matchType = typeFilter === 'All types' || i.issue_type === typeFilter
    const matchPriority = priorityFilter === 'All priorities' || i.severity === priorityFilter
    const matchBatch = !batchFilter || i.batchId === batchFilter
    const matchStatus = statusFilter === 'All' || i.status === statusFilter
    const today = new Date().toISOString().slice(0, 10)
    const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10)
    const matchDate = dateLabel === 'All dates' ||
      (dateLabel === 'Today' && i.detectedAt.startsWith(today)) ||
      (dateLabel === 'Yesterday' && i.detectedAt.startsWith(yesterday)) ||
      (dateLabel === 'This week' || dateLabel === 'Last 7 days' || dateLabel === 'This month')
    const matchTab = activeTab.startsWith('All') ||
      (activeTab.includes('Provider Ops') && i.queue_name === 'PROVIDER_OPS') ||
      (activeTab.includes('Directory') && i.queue_name === 'DIRECTORY_OPS') ||
      (activeTab.includes('Compliance') && i.queue_name === 'COMPLIANCE')
    return matchSearch && matchType && matchPriority && matchBatch && matchTab && matchDate && matchStatus
  })

  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px', background: '#F4F6FA' }}>

      {/* TOPBAR */}
      <div style={{ background: '#fff', borderRadius: 12, padding: '12px 18px', marginBottom: 18, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontSize: 15, fontWeight: 600, color: '#12141A' }}>Work Queue</div>
          <div style={{ fontSize: 11, color: '#737985', marginTop: 1 }}>Review and act on AI-flagged issues</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {statusFilter !== 'All' && (
            <span style={{ fontSize: 11, color: '#15693B', background: '#F0FAF4', border: '1px solid #B6EDD0', padding: '4px 12px', borderRadius: 20, display: 'flex', alignItems: 'center', gap: 6 }}>
              ● Showing: Open issues only
              <span onClick={() => { setStatusFilter('All'); navigate('/queue', { replace: true }) }} style={{ cursor: 'pointer', color: '#1E9E57', fontWeight: 700, marginLeft: 2 }}>✕</span>
            </span>
          )}
          {loading && <span style={{ fontSize: 11, color: '#1F3A93', background: '#E6ECFA', padding: '4px 12px', borderRadius: 20 }}>⟳ Loading from database…</span>}
        </div>
      </div>

      {/* TABS */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 14 }}>
        {tabs.map(t => (
          <div key={t} onClick={() => { setActiveTab(t); setBatchFilter(null); setSearch(''); setTypeFilter('All types'); setPriorityFilter('All priorities') }} style={{ padding: '6px 14px', fontSize: 12, borderRadius: 8, cursor: 'pointer', border: '1px solid rgba(0,0,0,0.09)', background: activeTab === t ? '#E6ECFA' : '#fff', color: activeTab === t ? '#1F3A93' : '#565B66', fontWeight: activeTab === t ? 500 : 400 }}>
            {t}
          </div>
        ))}
      </div>

      {/* FILTERS */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 14, flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ flex: 1, minWidth: 200, position: 'relative', display: 'flex', alignItems: 'center' }}>
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search provider name, NPI or issue ID…"
            style={{ width: '100%', padding: '7px 32px 7px 11px', border: `1px solid ${search ? '#1F3A93' : 'rgba(0,0,0,0.09)'}`, borderRadius: 8, fontSize: 12, background: '#fff', color: '#12141A', outline: 'none' }}
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              style={{ position: 'absolute', right: 8, background: 'none', border: 'none', cursor: 'pointer', color: '#737985', fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', width: 20, height: 20, borderRadius: '50%', padding: 0 }}
              title="Clear search"
            >✕</button>
          )}
        </div>
        <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)} style={{ fontSize: 12, padding: '7px 11px', border: `1px solid ${typeFilter !== 'All types' ? '#1F3A93' : 'rgba(0,0,0,0.09)'}`, borderRadius: 8, background: typeFilter !== 'All types' ? '#E6ECFA' : '#fff', color: typeFilter !== 'All types' ? '#1F3A93' : '#12141A', height: 34, outline: 'none', fontWeight: typeFilter !== 'All types' ? 500 : 400 }}>
          <option value="All types">All types</option>
          <option value="DUPLICATE_RECORD">Duplicate</option>
          <option value="CONFLICT_DETECTED">Conflict</option>
          <option value="DIRECTORY_MISMATCH">Dir Mismatch</option>
          <option value="CLAIMS_ACTIVITY_MISMATCH">Claims Mismatch</option>
          <option value="ONBOARDING_ISSUE">Onboarding Gap</option>
          <option value="MASTER_DATA_QUALITY">Master Data</option>
          <option value="CREDENTIALING_MISMATCH">Credentialing</option>
        </select>
        <select value={priorityFilter} onChange={e => setPriorityFilter(e.target.value)} style={{ fontSize: 12, padding: '7px 11px', border: `1px solid ${priorityFilter !== 'All priorities' ? '#1F3A93' : 'rgba(0,0,0,0.09)'}`, borderRadius: 8, background: priorityFilter !== 'All priorities' ? '#E6ECFA' : '#fff', color: priorityFilter !== 'All priorities' ? '#1F3A93' : '#12141A', height: 34, outline: 'none', fontWeight: priorityFilter !== 'All priorities' ? 500 : 400 }}>
          <option value="All priorities">All priorities</option>
          <option value="HIGH">High</option>
          <option value="MEDIUM">Medium</option>
          <option value="LOW">Low</option>
        </select>
        <div style={{ position: 'relative' }}>
          <button onClick={() => setShowDateDrop(!showDateDrop)} style={{ padding: '7px 12px', border: '1px solid rgba(0,0,0,0.09)', borderRadius: 8, background: '#fff', fontSize: 12, color: '#565B66', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5 }}>
            📅 {dateLabel} ▾
          </button>
          {showDateDrop && (
            <div style={{ position: 'absolute', top: 'calc(100% + 4px)', right: 0, background: '#fff', border: '1px solid rgba(0,0,0,0.1)', borderRadius: 10, boxShadow: '0 8px 24px rgba(0,0,0,0.1)', minWidth: 160, zIndex: 100 }}>
              {dateOptions.map(opt => (
                <div key={opt.label} onClick={() => { setDateLabel(opt.label); setShowDateDrop(false) }} style={{ padding: '9px 14px', fontSize: 12, color: '#12141A', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  {opt.label}
                  <span style={{ fontSize: 10, color: '#737985', background: '#F4F6FA', padding: '1px 6px', borderRadius: 10 }}>{opt.count}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── VIEW 1: MAIN WORK QUEUE ── */}
      {!batchFilter && filteredIssues.length === 0 && !loading && (
        <div style={{ border: '1px solid rgba(0,0,0,0.07)', borderRadius: 12, overflow: 'hidden' }}>
          <EmptyState search={search} typeFilter={typeFilter} priorityFilter={priorityFilter} dateLabel={dateLabel}
            onClear={() => { setSearch(''); setTypeFilter('All types'); setPriorityFilter('All priorities'); setDateLabel('All dates') }} />
        </div>
      )}
      {!batchFilter && filteredIssues.length > 0 && (
        <div style={{ background: '#fff', border: '1px solid rgba(0,0,0,0.07)', borderRadius: 12, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <thead>
              <tr style={{ background: '#F4F6FA' }}>
                <th style={{ padding: '10px 12px', width: 36 }}><input type="checkbox" /></th>
                <th style={{ padding: '10px 12px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: '#565B66' }}>Batch ID</th>
                <th style={{ padding: '10px 12px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: '#565B66' }}>Issue ID</th>
                <th style={{ padding: '10px 12px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: '#565B66' }}>Provider</th>
                <th style={{ padding: '10px 12px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: '#565B66' }}>NPI</th>
                <th style={{ padding: '10px 12px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: '#565B66' }}>Type</th>
                <th style={{ padding: '10px 12px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: '#565B66' }}>Priority</th>
                <th style={{ padding: '10px 12px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: '#565B66' }}>Queue</th>
                <th style={{ padding: '10px 12px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: '#565B66' }}>Status</th>
                <th style={{ padding: '10px 12px', textAlign: 'left', fontSize: 11, fontWeight: 600, cursor: 'pointer', color: '#1F3A93' }}>Detected ▾</th>
              </tr>
            </thead>
            <tbody>
              {(() => {
                const pagedIssues = filteredIssues.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)
                const dateMap: Record<string, Issue[]> = {}
                pagedIssues.forEach(i => {
                  const d = i.detectedAt ? i.detectedAt.slice(0, 10) : 'Unknown'
                  if (!dateMap[d]) dateMap[d] = []
                  dateMap[d].push(i)
                })
                const sortedDates = Object.keys(dateMap).sort((a, b) => b.localeCompare(a))
                const todayStr = new Date().toISOString().slice(0, 10)
                const yesterdayStr = new Date(Date.now() - 86400000).toISOString().slice(0, 10)
                const formatDateLabel = (d: string) => {
                  if (d === todayStr) return `Today — ${new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`
                  if (d === yesterdayStr) return `Yesterday — ${new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`
                  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                }
                return sortedDates.map(date => {
                  const groupIssues = dateMap[date]
                  if (!groupIssues.length) return null
                  return (
                    <Fragment key={date}>
                      <tr>
                        <td colSpan={10} style={{ padding: '6px 14px', background: '#F4F6FA', fontSize: 11, fontWeight: 600, color: '#1F3A93', borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
                          📅 {formatDateLabel(date)}
                        </td>
                      </tr>
                      {groupIssues.map((issue) => (
                        <tr key={issue.sequence_id} onClick={() => setSelectedIssue(issue)} style={{ borderBottom: '1px solid rgba(0,0,0,0.05)', cursor: 'pointer' }}>
                          <td style={{ padding: '10px 12px' }} onClick={e => e.stopPropagation()}><input type="checkbox" /></td>
                          <td style={{ padding: '10px 12px' }} onClick={e => e.stopPropagation()}>
                            <span onClick={() => setBatchFilter(issue.batchId)} style={{ fontSize: 10, fontWeight: 600, color: '#1F3A93', background: '#E6ECFA', padding: '2px 8px', borderRadius: 20, cursor: 'pointer', whiteSpace: 'nowrap' }}>
                              {issue.batchId.replace('PDM_Monitor_', 'PDM-')}
                            </span>
                          </td>
                          <td style={{ padding: '10px 12px', color: '#1F3A93', fontWeight: 600, fontSize: 11 }}><Highlight text={issue.sequence_id.split('-').slice(-2).join('-')} query={search} /></td>
                          <td style={{ padding: '10px 12px' }}>
                            <div style={{ fontWeight: 500 }}><Highlight text={issue.provider || ''} query={search} /></div>
                            <div style={{ fontSize: 10, color: '#737985' }}>{issue.specialty || ''}</div>
                          </td>
                          <td style={{ padding: '10px 12px', color: '#565B66' }}><Highlight text={issue.npi || ''} query={search} /></td>
                          <td style={{ padding: '10px 12px' }}><Tag label={ISSUE_TYPE_LABELS[issue.issue_type]} colors={typeColors[issue.issue_type] || '#F4F6FA|#565B66'} /></td>
                          <td style={{ padding: '10px 12px' }}><Tag label={SEVERITY_LABELS[issue.severity]} colors={priColors[issue.severity]} /></td>
                          <td style={{ padding: '10px 12px' }}><Tag label={QUEUE_LABELS[issue.queue_name]} colors='#eff6ff|#1d4ed8' /></td>
                          <td style={{ padding: '10px 12px' }}><Tag label={statusDisplayLabel[issue.status] || issue.status} colors={statusColors[issue.status] || '#F4F6FA|#565B66'} /></td>
                          <td style={{ padding: '10px 12px', color: '#737985', fontSize: 11 }}>{new Date(issue.detectedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</td>
                        </tr>
                      ))}
                    </Fragment>
                  )
                })
              })()}
            </tbody>
          </table>
          <div style={{ padding: '10px 18px', borderTop: '1px solid rgba(0,0,0,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 11, color: '#737985' }}>
            <span>Showing {Math.min(currentPage * PAGE_SIZE, filteredIssues.length)} of {filteredIssues.length} issues</span>
            <div style={{ display: 'flex', gap: 5 }}>
              <div onClick={() => setCurrentPage(p => Math.max(1, p - 1))} style={{ padding: '4px 10px', fontSize: 11, borderRadius: 7, cursor: currentPage === 1 ? 'default' : 'pointer', border: '1px solid rgba(0,0,0,0.09)', background: '#fff', color: currentPage === 1 ? '#D0D4DD' : '#565B66' }}>← Prev</div>
              {Array.from({ length: Math.ceil(filteredIssues.length / PAGE_SIZE) }, (_, i) => i + 1).map(p => (
                <div key={p} onClick={() => setCurrentPage(p)} style={{ padding: '4px 10px', fontSize: 11, borderRadius: 7, cursor: 'pointer', border: '1px solid rgba(0,0,0,0.09)', background: p === currentPage ? '#E6ECFA' : '#fff', color: p === currentPage ? '#1F3A93' : '#565B66', fontWeight: p === currentPage ? 600 : 400 }}>{p}</div>
              ))}
              <div onClick={() => setCurrentPage(p => Math.min(Math.ceil(filteredIssues.length / PAGE_SIZE), p + 1))} style={{ padding: '4px 10px', fontSize: 11, borderRadius: 7, cursor: currentPage === Math.ceil(filteredIssues.length / PAGE_SIZE) ? 'default' : 'pointer', border: '1px solid rgba(0,0,0,0.09)', background: '#fff', color: currentPage === Math.ceil(filteredIssues.length / PAGE_SIZE) ? '#D0D4DD' : '#565B66' }}>Next →</div>
            </div>
          </div>
        </div>
      )}

      {/* ── VIEW 2: BATCH DETAIL ── */}
      {batchFilter && (
        <div>
          <div onClick={() => setBatchFilter(null)} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12, color: '#565B66', cursor: 'pointer', marginBottom: 14, padding: '4px 8px', borderRadius: 6 }}>
            ← Back to all issues
          </div>

          {Array.from(new Set(issues.map(i => i.batchId))).filter(b => b === batchFilter).map(batchId => {
            const g = { batchId, shortLabel: batchId.replace('PDM_Monitor_', 'PDM-') }
            const batchIssues = issues.filter(i => i.batchId === g.batchId)
            const highCount   = batchIssues.filter(i => i.severity === 'HIGH').length
            const medCount    = batchIssues.filter(i => i.severity === 'MEDIUM').length
            const lowCount    = batchIssues.filter(i => i.severity === 'LOW').length
            const resolvedCnt = batchIssues.filter(i => i.status === 'Resolved').length
            const agentRun    = null as any
            return (
              <div key={g.batchId} style={{ background: '#fff', border: '1px solid rgba(0,0,0,0.07)', borderRadius: 14, padding: '16px 20px', marginBottom: 14 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
                  <div style={{ width: 38, height: 38, borderRadius: 9, background: '#E6ECFA', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <span style={{ fontSize: 18 }}>📦</span>
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: '#12141A' }}>{g.shortLabel}</div>
                    <div style={{ fontSize: 11, color: '#737985', marginTop: 2 }}>{g.batchId}</div>
                  </div>
                  <span style={{ fontSize: 11, background: '#F0FAF4', color: '#15693B', border: '1px solid #B6EDD0', padding: '4px 12px', borderRadius: 20, fontWeight: 500 }}>✓ Run complete</span>
                </div>
                <div style={{ fontSize: 13, color: '#374151', marginBottom: 14, padding: '10px 14px', background: '#F4F6FA', borderRadius: 9, lineHeight: 1.6 }}>
                  This batch found <strong style={{ color: '#12141A' }}>{batchIssues.length} issues</strong>
                  {highCount > 0 && <> — <strong style={{ color: '#D5493A' }}>{highCount} HIGH</strong></>}
                  {medCount > 0  && <>, <strong style={{ color: '#D99E00' }}>{medCount} MEDIUM</strong></>}
                  {lowCount > 0  && <>, <strong style={{ color: '#1E9E57' }}>{lowCount} LOW</strong></>}
                  {resolvedCnt > 0 && <> · <strong style={{ color: '#1E9E57' }}>{resolvedCnt} resolved</strong></>}
                </div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: '6px 12px' }}>
                    <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#D5493A' }} />
                    <span style={{ fontSize: 12, fontWeight: 700, color: '#D5493A' }}>{highCount}</span>
                    <span style={{ fontSize: 11, color: '#D5493A' }}>High</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 8, padding: '6px 12px' }}>
                    <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#D99E00' }} />
                    <span style={{ fontSize: 12, fontWeight: 700, color: '#D99E00' }}>{medCount}</span>
                    <span style={{ fontSize: 11, color: '#D99E00' }}>Medium</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#F0FAF4', border: '1px solid #B6EDD0', borderRadius: 8, padding: '6px 12px' }}>
                    <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#1E9E57' }} />
                    <span style={{ fontSize: 12, fontWeight: 700, color: '#1E9E57' }}>{lowCount}</span>
                    <span style={{ fontSize: 11, color: '#1E9E57' }}>Low</span>
                  </div>
                  {agentRun && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#F4F6FA', border: '1px solid #e0d9ff', borderRadius: 8, padding: '6px 12px' }}>
                      <span style={{ fontSize: 12 }}>⏱</span>
                      <span style={{ fontSize: 12, fontWeight: 700, color: '#1F3A93' }}>{agentRun.duration}</span>
                      <span style={{ fontSize: 11, color: '#1F3A93' }}>duration</span>
                    </div>
                  )}
                </div>
              </div>
            )
          })}

          <div style={{ background: '#fff', border: '1px solid rgba(0,0,0,0.07)', borderRadius: 12, overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <thead>
                <tr style={{ background: '#F4F6FA' }}>
                  <th style={{ padding: '10px 12px', width: 36 }}><input type="checkbox" /></th>
                  <th style={{ padding: '10px 12px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: '#565B66' }}>Issue ID</th>
                  <th style={{ padding: '10px 12px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: '#565B66' }}>Provider</th>
                  <th style={{ padding: '10px 12px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: '#565B66' }}>NPI</th>
                  <th style={{ padding: '10px 12px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: '#565B66' }}>Type</th>
                  <th style={{ padding: '10px 12px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: '#565B66' }}>Priority</th>
                  <th style={{ padding: '10px 12px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: '#565B66' }}>Queue</th>
                  <th style={{ padding: '10px 12px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: '#565B66' }}>Status</th>
                  <th style={{ padding: '10px 12px', textAlign: 'left', fontSize: 11, fontWeight: 600, cursor: 'pointer', color: '#1F3A93' }}>Detected ▾</th>
                  <th style={{ padding: '10px 12px', textAlign: 'center', fontSize: 11, fontWeight: 600, color: '#565B66' }}>Prev Runs</th>
                </tr>
              </thead>
              <tbody>
                {filteredIssues.map(issue => (
                  <tr key={issue.sequence_id} onClick={() => setSelectedIssue(issue)} style={{ borderBottom: '1px solid rgba(0,0,0,0.05)', cursor: 'pointer' }}>
                    <td style={{ padding: '10px 12px' }} onClick={e => e.stopPropagation()}><input type="checkbox" /></td>
                    <td style={{ padding: '10px 12px', color: '#1F3A93', fontWeight: 600, fontSize: 11 }}><Highlight text={issue.sequence_id.split('-').slice(-2).join('-')} query={search} /></td>
                    <td style={{ padding: '10px 12px' }}>
                      <div style={{ fontWeight: 500 }}><Highlight text={issue.provider} query={search} /></div>
                      <div style={{ fontSize: 10, color: '#737985' }}>{issue.specialty}</div>
                    </td>
                    <td style={{ padding: '10px 12px', color: '#565B66' }}><Highlight text={issue.npi} query={search} /></td>
                    <td style={{ padding: '10px 12px' }}><Tag label={ISSUE_TYPE_LABELS[issue.issue_type]} colors={typeColors[issue.issue_type] || '#F4F6FA|#565B66'} /></td>
                    <td style={{ padding: '10px 12px' }}><Tag label={SEVERITY_LABELS[issue.severity]} colors={priColors[issue.severity]} /></td>
                    <td style={{ padding: '10px 12px' }}><Tag label={QUEUE_LABELS[issue.queue_name]} colors='#eff6ff|#1d4ed8' /></td>
                    <td style={{ padding: '10px 12px' }}><Tag label={statusDisplayLabel[issue.status] || issue.status} colors={statusColors[issue.status]} /></td>
                    <td style={{ padding: '10px 12px', color: '#737985', fontSize: 11 }}>{new Date(issue.detectedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</td>
                    <td style={{ padding: '10px 8px', textAlign: 'center' }} onClick={e => e.stopPropagation()}>
                      <button
                        onClick={() => setPrevRunsId({ id: issue.sequence_id, issue })}
                        style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '5px 10px', background: '#F4F6FA', color: '#1F3A93', border: '1px solid rgba(124,93,250,0.25)', borderRadius: 7, fontSize: 11, fontWeight: 500, cursor: 'pointer', whiteSpace: 'nowrap' }}
                      >
                        🕐 Previous
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filteredIssues.length === 0 && (
              <EmptyState search={search} typeFilter={typeFilter} priorityFilter={priorityFilter} dateLabel={dateLabel}
                onClear={() => { setSearch(''); setTypeFilter('All types'); setPriorityFilter('All priorities'); setDateLabel('All dates') }} />
            )}
            <div style={{ padding: '10px 18px', borderTop: '1px solid rgba(0,0,0,0.05)', fontSize: 11, color: '#737985' }}>
              Showing {filteredIssues.length} issues in this batch
            </div>
          </div>
        </div>
      )}

      {prevRunsId && <PrevRunsModal sequenceId={prevRunsId.id} issue={prevRunsId.issue} onClose={() => setPrevRunsId(null)} />}

      {selectedIssue && (
        <IssueModal
          issue={selectedIssue}
          onClose={() => setSelectedIssue(null)}
          onStatusChange={(id, status) => handleStatusChange(id, status)}
        />
      )}

      {!loading && (
        <div style={{ borderTop: '1px solid #f1f5f9', padding: '12px 28px', display: 'flex', alignItems: 'center', gap: 16, marginTop: 8 }}>
          <span style={{ fontSize: 11, color: '#94a3b8' }}>© 2026 ProviderGuard AI</span>
          <span style={{ color: '#cbd5e1', fontSize: 11 }}>|</span>
          <span style={{ fontSize: 11, color: '#94a3b8' }}>All outputs are advisory only</span>
        </div>
      )}
    </div>
  )
}
