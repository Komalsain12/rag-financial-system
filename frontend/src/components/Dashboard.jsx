export default function Dashboard({ history, setPage }) {
  const total = history.length
  const approved = history.filter(h => h.decision?.decision === 'Approved').length
  const rejected = history.filter(h => h.decision?.decision === 'Rejected').length
  const highRisk = history.filter(h => h.decision?.risk_level === 'High').length
  const avgConf = total > 0
    ? Math.round(history.reduce((s, h) => s + (h.decision?.confidence || 0), 0) / total)
    : 0

  return (
    <div className="fade-in">
      <div className="page-header">
        <div className="page-tag">Overview</div>
        <h1 className="page-title">Financial <span>Intelligence</span> Dashboard</h1>
        <p className="page-subtitle">RAG-powered expert decision system for automated document analysis</p>
      </div>

      <div className="stats-grid">
        <div className="stat-card gold">
          <div className="stat-label">Total Analyzed</div>
          <div className="stat-value">{total}</div>
          <div className="stat-sub">documents processed</div>
        </div>
        <div className="stat-card green">
          <div className="stat-label">Approved</div>
          <div className="stat-value">{approved}</div>
          <div className="stat-sub">{total > 0 ? Math.round(approved/total*100) : 0}% approval rate</div>
        </div>
        <div className="stat-card purple">
          <div className="stat-label">Avg Confidence</div>
          <div className="stat-value">{avgConf}%</div>
          <div className="stat-sub">AI certainty score</div>
        </div>
        <div className="stat-card teal">
          <div className="stat-label">High Risk</div>
          <div className="stat-value">{highRisk}</div>
          <div className="stat-sub">flagged for review</div>
        </div>
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'20px', marginBottom:'24px' }}>
        <div className="card">
          <div className="section-title">Quick Actions</div>
          <div style={{ display:'flex', flexDirection:'column', gap:'10px' }}>
            <button className="btn btn-primary" onClick={() => setPage('analyze')} style={{ justifyContent:'flex-start' }}>
              ◈ &nbsp; Analyze Single Document
            </button>
            <button className="btn btn-secondary" onClick={() => setPage('batch')} style={{ justifyContent:'flex-start' }}>
              ◫ &nbsp; Batch Upload Multiple Files
            </button>
            <button className="btn btn-secondary" onClick={() => setPage('history')} style={{ justifyContent:'flex-start' }}>
              ◷ &nbsp; View Decision History
            </button>
          </div>
        </div>

        <div className="card">
          <div className="section-title">System Architecture</div>
          <div style={{ display:'flex', flexDirection:'column', gap:'10px' }}>
            {[
              { label:'OCR Engine',    value:'Tesseract 5.x' },
              { label:'Vector DB',     value:'FAISS Index' },
              { label:'LLM',           value:'Llama 3.3 70B (Groq)' },
              { label:'RAG Pipeline',  value:'Active' },
            ].map(item => (
              <div key={item.label} style={{
                display:'flex', alignItems:'center', justifyContent:'space-between',
                padding:'10px 12px', background:'var(--surface2)',
                borderRadius:'8px', border:'1px solid var(--border)'
              }}>
                <span style={{ fontFamily:'DM Mono,monospace', fontSize:'11px', color:'var(--text3)' }}>{item.label}</span>
                <div style={{ display:'flex', alignItems:'center', gap:'8px' }}>
                  <span style={{ fontSize:'13px', color:'var(--text)' }}>{item.value}</span>
                  <div style={{ width:'6px', height:'6px', borderRadius:'50%', background:'var(--success)', boxShadow:'0 0 6px var(--success)' }}></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="card">
        <div className="section-title">Recent Decisions</div>
        {history.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">◈</div>
            <div className="empty-title">No documents analyzed yet</div>
            <div className="empty-sub">Upload your first invoice to see AI decisions here</div>
            <button className="btn btn-primary" onClick={() => setPage('analyze')} style={{ marginTop:'20px' }}>
              Start Analyzing
            </button>
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
              {history.slice(0,5).map(entry => (
                <tr key={entry.id}>
                  <td style={{ color:'var(--text)', fontWeight:500 }}>{entry.fileName || 'Document'}</td>
                  <td>{entry.decision?.category || '—'}</td>
                  <td>
                    <span className={`decision-badge ${
                      entry.decision?.decision === 'Approved' ? 'badge-approved' :
                      entry.decision?.decision === 'Rejected' ? 'badge-rejected' : 'badge-review'
                    }`} style={{ padding:'3px 10px', fontSize:'12px' }}>
                      {entry.decision?.decision}
                    </span>
                  </td>
                  <td style={{ color:
                    entry.decision?.risk_level === 'High'   ? 'var(--danger)'  :
                    entry.decision?.risk_level === 'Medium' ? 'var(--warning)' : 'var(--success)'
                  }}>{entry.decision?.risk_level}</td>
                  <td style={{ color:'var(--accent)', fontFamily:'DM Mono,monospace' }}>{entry.decision?.confidence}%</td>
                  <td style={{ fontSize:'12px' }}>{entry.timestamp}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}