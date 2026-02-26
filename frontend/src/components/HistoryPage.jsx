import { useState } from 'react'

export default function HistoryPage({ history, clearHistory }) {
  const [filter, setFilter]     = useState('all')
  const [search, setSearch]     = useState('')
  const [selected, setSelected] = useState(null)

  const filtered = history.filter(h => {
    const matchFilter = filter === 'all' ||
      h.decision?.decision?.toLowerCase().replace(' ', '') === filter
    const matchSearch = !search ||
      h.fileName?.toLowerCase().includes(search.toLowerCase()) ||
      h.decision?.category?.toLowerCase().includes(search.toLowerCase())
    return matchFilter && matchSearch
  })

  const exportCSV = () => {
    const headers = ['File', 'Category', 'Decision', 'Risk', 'Confidence', 'Time']
    const rows = history.map(h => [
      h.fileName || 'Document',
      h.decision?.category || '',
      h.decision?.decision || '',
      h.decision?.risk_level || '',
      h.decision?.confidence || '',
      h.timestamp || ''
    ])
    const csv = [headers, ...rows].map(r => r.map(c => `"${c}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href = url; a.download = 'decision_history.csv'; a.click()
  }

  return (
    <div className="fade-in">
      <div className="page-header">
        <div className="page-tag">Records</div>
        <h1 className="page-title">Decision <span>History</span></h1>
        <p className="page-subtitle">
          Persistent log of all AI decisions — saved across sessions automatically
          {history.length > 0 && (
            <span style={{ marginLeft: '12px', fontFamily: 'DM Mono, monospace',
              fontSize: '11px', color: 'var(--accent)' }}>
              {history.length} records stored
            </span>
          )}
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: selected ? '1fr 1fr' : '1fr', gap: '24px', alignItems: 'start' }}>
        <div>
          {/* Filters row */}
          <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', flexWrap: 'wrap', alignItems: 'center' }}>
            <input
              type="text"
              placeholder="Search by file name or category..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{
                flex: 1, minWidth: '200px', padding: '10px 14px',
                background: 'var(--surface)', border: '1px solid var(--border2)',
                borderRadius: '8px', color: 'var(--text)',
                fontFamily: 'Outfit, sans-serif', fontSize: '14px', outline: 'none'
              }}
            />
            {['all', 'approved', 'rejected', 'needsreview'].map(f => (
              <button key={f}
                onClick={() => setFilter(f)}
                className={`btn ${filter === f ? 'btn-primary' : 'btn-secondary'}`}
                style={{ padding: '8px 14px', fontSize: '12px' }}>
                {f === 'all' ? 'All' : f === 'needsreview' ? 'Review' :
                  f.charAt(0).toUpperCase() + f.slice(1)}
              </button>
            ))}
            {history.length > 0 && (
              <>
                <button className="btn btn-secondary" onClick={exportCSV}
                  style={{ padding: '8px 14px', fontSize: '12px' }}>
                  ↓ Export CSV
                </button>
                <button onClick={clearHistory}
                  style={{
                    padding: '8px 14px', fontSize: '12px',
                    background: 'rgba(242,107,107,0.1)', border: '1px solid rgba(242,107,107,0.3)',
                    color: 'var(--danger)', borderRadius: '8px', cursor: 'pointer',
                    fontFamily: 'Outfit, sans-serif', fontWeight: 600
                  }}>
                  🗑 Clear All
                </button>
              </>
            )}
          </div>

         
          <div className="card">
            {filtered.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">◷</div>
                <div className="empty-title">
                  {history.length === 0 ? 'No history yet' : 'No matches found'}
                </div>
                <div className="empty-sub">
                  {history.length === 0
                    ? 'Analyze a document — it will be saved here permanently'
                    : 'Try a different filter or search term'}
                </div>
              </div>
            ) : (
              <table className="history-table">
                <thead>
                  <tr>
                    <th>Document</th>
                    <th>Category</th>
                    <th>Decision</th>
                    <th>Risk</th>
                    <th>Confidence</th>
                    <th>Time</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(entry => (
                    <tr key={entry.id}
                      onClick={() => setSelected(selected?.id === entry.id ? null : entry)}
                      style={{
                        cursor: 'pointer',
                        background: selected?.id === entry.id ? 'var(--surface2)' : ''
                      }}>
                      <td style={{ color: 'var(--text)', fontWeight: 500, maxWidth: '140px',
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {entry.fileName || 'Document'}
                      </td>
                      <td>{entry.decision?.category || '—'}</td>
                      <td>
                        <span className={`decision-badge ${
                          entry.decision?.decision === 'Approved'     ? 'badge-approved' :
                          entry.decision?.decision === 'Rejected'     ? 'badge-rejected' : 'badge-review'
                        }`} style={{ padding: '3px 10px', fontSize: '12px' }}>
                          {entry.decision?.decision}
                        </span>
                      </td>
                      <td style={{ color:
                        entry.decision?.risk_level === 'High'   ? 'var(--danger)'  :
                        entry.decision?.risk_level === 'Medium' ? 'var(--warning)' : 'var(--success)'
                      }}>{entry.decision?.risk_level}</td>
                      <td style={{ fontFamily: 'DM Mono, monospace', color: 'var(--accent)' }}>
                        {entry.decision?.confidence}%
                      </td>
                      <td style={{ fontSize: '12px' }}>{entry.timestamp}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Detail Panel */}
        {selected && (
          <div className="fade-in">
            <div className="card" style={{ marginBottom: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <div className="section-title" style={{ margin: 0 }}>Decision Detail</div>
                <button className="btn btn-secondary"
                  onClick={() => setSelected(null)}
                  style={{ padding: '6px 12px', fontSize: '12px' }}>
                  ✕ Close
                </button>
              </div>

              <span className={`decision-badge ${
                selected.decision?.decision === 'Approved'     ? 'badge-approved' :
                selected.decision?.decision === 'Rejected'     ? 'badge-rejected' : 'badge-review'
              }`} style={{ marginBottom: '16px', display: 'inline-flex' }}>
                {selected.decision?.decision === 'Approved' ? '✓' :
                 selected.decision?.decision === 'Rejected' ? '✗' : '⚠'}&nbsp;
                {selected.decision?.decision}
              </span>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', margin: '16px 0' }}>
                <div style={{ padding: '14px', background: 'var(--surface2)', borderRadius: '8px', border: '1px solid var(--border)' }}>
                  <div style={{ fontSize: '10px', fontFamily: 'DM Mono, monospace', color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '6px' }}>Confidence</div>
                  <div style={{ fontSize: '30px', fontFamily: 'DM Serif Display, serif', color: 'var(--accent)' }}>{selected.decision?.confidence}%</div>
                  <div style={{ height: '4px', background: 'var(--border)', borderRadius: '2px', marginTop: '8px', overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${selected.decision?.confidence}%`, background: 'var(--accent)', borderRadius: '2px' }}></div>
                  </div>
                </div>
                <div style={{ padding: '14px', background: 'var(--surface2)', borderRadius: '8px', border: '1px solid var(--border)' }}>
                  <div style={{ fontSize: '10px', fontFamily: 'DM Mono, monospace', color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '6px' }}>Risk Level</div>
                  <div style={{ fontSize: '30px', fontFamily: 'DM Serif Display, serif', color:
                    selected.decision?.risk_level === 'High'   ? 'var(--danger)'  :
                    selected.decision?.risk_level === 'Medium' ? 'var(--warning)' : 'var(--success)'
                  }}>{selected.decision?.risk_level}</div>
                </div>
              </div>

              <div style={{ padding: '10px 14px', background: 'var(--surface2)', borderRadius: '8px', border: '1px solid var(--border)' }}>
                <div style={{ fontSize: '10px', fontFamily: 'DM Mono, monospace', color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '1px' }}>Category</div>
                <div style={{ fontSize: '15px', color: 'var(--accent)', fontWeight: 600, marginTop: '4px' }}>{selected.decision?.category}</div>
              </div>
            </div>

            <div className="card" style={{ marginBottom: '16px' }}>
              <div className="section-title">Extracted Fields</div>
              <table className="field-table">
                <tbody>
                  {selected.extracted_fields && Object.entries(selected.extracted_fields)
                    .filter(([k]) => k !== 'raw_text')
                    .map(([k, v]) => (
                    <tr key={k}>
                      <td>{k.replace(/_/g, ' ')}</td>
                      <td>{String(v)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="card">
              <div className="section-title">Full AI Reasoning</div>
              <div className="reasoning-box" style={{ lineHeight: '1.9', fontSize: '13px' }}>
                {selected.decision?.reasoning}
              </div>
              <div style={{ marginTop: '12px', padding: '10px', background: 'var(--surface2)',
                borderRadius: '6px', fontSize: '11px', fontFamily: 'DM Mono, monospace', color: 'var(--text3)' }}>
                Document ID: {selected.document_id} &nbsp;|&nbsp; Analyzed: {selected.timestamp}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
