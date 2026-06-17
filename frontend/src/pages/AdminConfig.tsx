import { useState } from 'react'

const initialRules = [
  { id: 1, name: 'Duplicate NPI detection', desc: 'Flag same NPI in 2+ active records', req: 'ReqID_08', enabled: true },
  { id: 2, name: 'Conflict — address mismatch', desc: 'Flag address diff on same provider', req: 'ReqID_09', enabled: true },
  { id: 3, name: 'Directory compliance check', desc: 'Compare directory vs QNXT master data', req: 'ReqID_10', enabled: true },
  { id: 4, name: 'Claims activity mismatch', desc: 'Flag inactive providers with open claims', req: 'ReqID_06', enabled: false },
  { id: 5, name: 'Onboarding completeness', desc: 'Check all mandatory fields at intake', req: 'ReqID_01', enabled: true },
  { id: 6, name: 'Credentialing validation', desc: 'Compare credentialing vs onboarding data', req: 'ReqID_02', enabled: true },
]

const routingConfig = [
  { type: 'Duplicate record', queue: 'Provider Ops', priority: 'High', priColor: '#fff1f1|#c0392b' },
  { type: 'Conflict detected', queue: 'Provider Ops', priority: 'Medium', priColor: '#fff7ed|#b45309' },
  { type: 'Directory mismatch', queue: 'Directory Ops', priority: 'High', priColor: '#fff1f1|#c0392b' },
  { type: 'Compliance flag', queue: 'Compliance', priority: 'High', priColor: '#fff1f1|#c0392b' },
  { type: 'Claims mismatch', queue: 'Provider Ops', priority: 'Medium', priColor: '#fff7ed|#b45309' },
]

const roles = [
  { role: 'Provider OPS Analyst', users: 4, access: 'Work Queue, Issue Detail, Dashboard' },
  { role: 'Directory Analyst', users: 2, access: 'Directory Queue, Issue Detail, Dashboard' },
  { role: 'Compliance Analyst', users: 2, access: 'Compliance Queue, Audit Trail, Dashboard' },
  { role: 'Supervisor', users: 1, access: 'All queues, Dashboard, Audit Trail' },
  { role: 'System Admin', users: 1, access: 'Full access including Admin Config' },
]

function Tag({ label, colors }: { label: string; colors: string }) {
  const [bg, color] = colors.split('|')
  return <span style={{ background: bg, color, fontSize: 10, fontWeight: 500, padding: '2px 8px', borderRadius: 20 }}>{label}</span>
}

function Toggle({ enabled, onToggle }: { enabled: boolean; onToggle: () => void }) {
  return (
    <div onClick={onToggle} style={{ width: 38, height: 21, borderRadius: 11, background: enabled ? '#7c5dfa' : '#e5e3f0', position: 'relative', cursor: 'pointer', flexShrink: 0, transition: 'background 0.2s' }}>
      <div style={{ position: 'absolute', width: 15, height: 15, background: '#fff', borderRadius: '50%', top: 3, left: enabled ? 20 : 3, transition: 'left 0.2s' }} />
    </div>
  )
}

export default function AdminConfig() {
  const [rules, setRules] = useState(initialRules)

  function toggleRule(id: number) {
    setRules(rules.map(r => r.id === id ? { ...r, enabled: !r.enabled } : r))
  }

  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px', background: '#f0eef8' }}>

      {/* TOPBAR */}
      <div style={{ background: '#fff', borderRadius: 12, padding: '12px 18px', marginBottom: 18 }}>
        <div style={{ fontSize: 15, fontWeight: 600, color: '#0d0d12' }}>Admin Config</div>
        <div style={{ fontSize: 11, color: '#a09db8', marginTop: 1 }}>Rules, routing and schedule configuration — System Admin only</div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>

        {/* LEFT COLUMN */}
        <div>
          {/* DETECTION RULES */}
          <div style={{ fontSize: 13, fontWeight: 600, color: '#0d0d12', marginBottom: 12 }}>Detection rules</div>
          {rules.map(rule => (
            <div key={rule.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 14px', border: '1px solid rgba(0,0,0,0.07)', borderRadius: 10, marginBottom: 8, background: '#fff' }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 12, fontWeight: 500, color: '#0d0d12' }}>{rule.name}</div>
                <div style={{ fontSize: 11, color: '#6b6880', marginTop: 2 }}>{rule.desc} — <span style={{ color: '#7c5dfa' }}>{rule.req}</span></div>
              </div>
              <Toggle enabled={rule.enabled} onToggle={() => toggleRule(rule.id)} />
            </div>
          ))}

          {/* ROLES */}
          <div style={{ fontSize: 13, fontWeight: 600, color: '#0d0d12', marginBottom: 12, marginTop: 20 }}>Role management</div>
          <div style={{ background: '#fff', border: '1px solid rgba(0,0,0,0.07)', borderRadius: 12, overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <thead>
                <tr style={{ background: '#f8f7fc' }}>
                  <th style={{ padding: '9px 14px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: '#6b6880', borderBottom: '1px solid rgba(0,0,0,0.07)' }}>Role</th>
                  <th style={{ padding: '9px 14px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: '#6b6880', borderBottom: '1px solid rgba(0,0,0,0.07)' }}>Users</th>
                  <th style={{ padding: '9px 14px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: '#6b6880', borderBottom: '1px solid rgba(0,0,0,0.07)' }}>Access</th>
                </tr>
              </thead>
              <tbody>
                {roles.map((r, i) => (
                  <tr key={r.role} style={{ borderBottom: i < roles.length - 1 ? '1px solid rgba(0,0,0,0.05)' : 'none' }}>
                    <td style={{ padding: '10px 14px', fontWeight: 500 }}>{r.role}</td>
                    <td style={{ padding: '10px 14px', color: '#6b6880' }}>{r.users}</td>
                    <td style={{ padding: '10px 14px', color: '#6b6880', fontSize: 11 }}>{r.access}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* RIGHT COLUMN */}
        <div>
          {/* QUEUE ROUTING */}
          <div style={{ fontSize: 13, fontWeight: 600, color: '#0d0d12', marginBottom: 12 }}>Queue routing config</div>
          <div style={{ background: '#fff', border: '1px solid rgba(0,0,0,0.07)', borderRadius: 12, overflow: 'hidden', marginBottom: 16 }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <thead>
                <tr style={{ background: '#f8f7fc' }}>
                  <th style={{ padding: '9px 14px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: '#6b6880', borderBottom: '1px solid rgba(0,0,0,0.07)' }}>Issue type</th>
                  <th style={{ padding: '9px 14px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: '#6b6880', borderBottom: '1px solid rgba(0,0,0,0.07)' }}>Routes to</th>
                  <th style={{ padding: '9px 14px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: '#6b6880', borderBottom: '1px solid rgba(0,0,0,0.07)' }}>Priority</th>
                </tr>
              </thead>
              <tbody>
                {routingConfig.map((r, i) => (
                  <tr key={r.type} style={{ borderBottom: i < routingConfig.length - 1 ? '1px solid rgba(0,0,0,0.05)' : 'none' }}>
                    <td style={{ padding: '10px 14px' }}>{r.type}</td>
                    <td style={{ padding: '10px 14px' }}><Tag label={r.queue} colors='#eff6ff|#1d4ed8' /></td>
                    <td style={{ padding: '10px 14px' }}><Tag label={r.priority} colors={r.priColor} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* SYSTEM INFO */}
          <div style={{ fontSize: 13, fontWeight: 600, color: '#0d0d12', marginBottom: 12, marginTop: 20 }}>System info</div>
          <div style={{ background: '#fff', border: '1px solid rgba(0,0,0,0.07)', borderRadius: 12, padding: '14px 16px' }}>
            {[
              { key: 'Environment', val: 'UAT' },
              { key: 'Data source', val: 'QNXT (read-only)' },
              { key: 'AI model', val: 'Azure OpenAI GPT-4o' },
              { key: 'Version', val: 'v1.0.0' },
              { key: 'PHI exposure', val: 'None — masked' },
            ].map((item, i, arr) => (
              <div key={item.key} style={{ display: 'flex', justifyContent: 'space-between', padding: '7px 0', borderBottom: i < arr.length - 1 ? '1px solid rgba(0,0,0,0.05)' : 'none', fontSize: 12 }}>
                <span style={{ color: '#6b6880' }}>{item.key}</span>
                <span style={{ fontWeight: 500, color: item.key === 'PHI exposure' ? '#166534' : '#0d0d12' }}>{item.val}</span>
              </div>
            ))}
          </div>
        </div>
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
