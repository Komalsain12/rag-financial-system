import { useState, useRef } from 'react'
import axios from 'axios'

export default function BatchPage({ onResults }) {
  const [files, setFiles]         = useState([])
  const [results, setResults]     = useState([])
  const [processing, setProcessing] = useState(false)
  const [currentIdx, setCurrentIdx] = useState(-1)
  const inputRef = useRef()

  const handleFiles = (fileList) => { setFiles(Array.from(fileList)); setResults([]) }

  const handleProcess = async () => {
    setProcessing(true); setResults([])
    const allResults = []
    for (let i = 0; i < files.length; i++) {
      setCurrentIdx(i)
      const formData = new FormData()
      formData.append('file', files[i])
      try {
        const res = await axios.post('http://localhost:8000/upload', formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        })
        allResults.push({ ...res.data, fileName: files[i].name, status:'done' })
      } catch (err) {
        allResults.push({ fileName: files[i].name, status:'error', error: err.message })
      }
      setResults([...allResults])
    }
    const invoiceNums = allResults.map(r => r.extracted_fields?.invoice_number).filter(Boolean)
    const duplicates  = invoiceNums.filter((n,i) => invoiceNums.indexOf(n) !== i)
    if (duplicates.length > 0) alert(`⚠️ Duplicate invoice numbers detected: ${duplicates.join(', ')}`)
    onResults(allResults.filter(r => r.status === 'done').map(r => ({ ...r, timestamp: new Date().toLocaleString() })))
    setProcessing(false); setCurrentIdx(-1)
  }

  return (
    <div className="fade-in">
      <div className="page-header">
        <div className="page-tag">Batch Processing</div>
        <h1 className="page-title">Batch <span>Upload</span></h1>
        <p className="page-subtitle">Analyze multiple invoices at once and detect anomalies automatically</p>
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'1fr 1.5fr', gap:'24px', alignItems:'start' }}>
        <div>
          <div className="card" style={{ marginBottom:'16px' }}>
            <div className="upload-zone" onClick={() => inputRef.current?.click()} style={{ padding:'32px' }}>
              <input ref={inputRef} type="file" className="file-input"
                accept=".jpg,.jpeg,.png,.pdf" multiple
                onChange={e => handleFiles(e.target.files)} />
              <span className="upload-icon">◫</span>
              <div className="upload-title">Select Multiple Files</div>
              <div className="upload-sub">Hold Ctrl to select multiple</div>
              <div className="upload-formats">
                <span className="format-chip">PDF</span>
                <span className="format-chip">JPG</span>
                <span className="format-chip">PNG</span>
              </div>
            </div>

            {files.length > 0 && (
              <>
                <div style={{ margin:'16px 0 8px', fontSize:'13px', color:'var(--text2)', fontFamily:'DM Mono,monospace' }}>
                  {files.length} file{files.length > 1 ? 's' : ''} selected
                </div>
                <div className="batch-list">
                  {files.map((f,i) => (
                    <div className="batch-item" key={i}>
                      <span style={{ fontSize:'18px' }}>📄</span>
                      <span className="file-name">{f.name}</span>
                      <span className="file-size">{(f.size/1024).toFixed(0)}KB</span>
                      <span className="batch-status">
                        {processing && currentIdx === i ? '⏳' :
                         results[i]?.status === 'done'  ? '✅' :
                         results[i]?.status === 'error' ? '❌' : '○'}
                      </span>
                    </div>
                  ))}
                </div>
                <button className="btn btn-primary" onClick={handleProcess}
                  disabled={processing}
                  style={{ width:'100%', justifyContent:'center', marginTop:'8px' }}>
                  {processing ? `◷ Processing ${currentIdx+1}/${files.length}...` : `◈ Process ${files.length} Files`}
                </button>
              </>
            )}
          </div>

          <div className="card">
            <div className="section-title">Auto Detection</div>
            {[
              { icon:'🔍', label:'Duplicate Invoices', desc:'Same invoice number flagged' },
              { icon:'⚠️', label:'Missing GST',        desc:'Non-compliant invoices flagged' },
              { icon:'📊', label:'Batch Summary',      desc:'Overall risk and approval stats' },
              { icon:'↓',  label:'Export Results',     desc:'Download CSV for your report' },
            ].map(item => (
              <div key={item.label} style={{ display:'flex', gap:'12px', padding:'10px 0', borderBottom:'1px solid var(--border)' }}>
                <span style={{ fontSize:'18px' }}>{item.icon}</span>
                <div>
                  <div style={{ fontSize:'13px', fontWeight:600, color:'var(--text)' }}>{item.label}</div>
                  <div style={{ fontSize:'12px', color:'var(--text2)' }}>{item.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="card">
          <div className="section-title">Batch Results</div>
          {results.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">◫</div>
              <div className="empty-title">No results yet</div>
              <div className="empty-sub">Select files and click Process to begin</div>
            </div>
          ) : (
            <>
              <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:'10px', marginBottom:'20px' }}>
                {[
                  { label:'Approved', count: results.filter(r => r.decision?.decision === 'Approved').length,      color:'var(--success)' },
                  { label:'Review',   count: results.filter(r => r.decision?.decision === 'Needs Review').length,  color:'var(--warning)' },
                  { label:'Rejected', count: results.filter(r => r.decision?.decision === 'Rejected').length,      color:'var(--danger)'  },
                ].map(s => (
                  <div key={s.label} style={{ textAlign:'center', padding:'12px', background:'var(--surface2)', borderRadius:'8px', border:'1px solid var(--border)' }}>
                    <div style={{ fontSize:'24px', fontFamily:'DM Serif Display,serif', color:s.color }}>{s.count}</div>
                    <div style={{ fontSize:'11px', color:'var(--text2)', fontFamily:'DM Mono,monospace', textTransform:'uppercase', letterSpacing:'1px' }}>{s.label}</div>
                  </div>
                ))}
              </div>
              <table className="history-table">
                <thead>
                  <tr><th>File</th><th>Category</th><th>Decision</th><th>Risk</th><th>Conf.</th></tr>
                </thead>
                <tbody>
                  {results.map((r,i) => (
                    <tr key={i}>
                      <td style={{ color:'var(--text)', fontSize:'12px' }}>{r.fileName}</td>
                      <td style={{ fontSize:'12px' }}>{r.decision?.category || '—'}</td>
                      <td style={{ color:
                        r.decision?.decision === 'Approved'     ? 'var(--success)' :
                        r.decision?.decision === 'Rejected'     ? 'var(--danger)'  :
                        r.decision?.decision === 'Needs Review' ? 'var(--warning)' : 'var(--text2)',
                        fontSize:'12px', fontWeight:600
                      }}>{r.status === 'error' ? 'Error' : r.decision?.decision || '...'}</td>
                      <td style={{ color:
                        r.decision?.risk_level === 'High'   ? 'var(--danger)'  :
                        r.decision?.risk_level === 'Medium' ? 'var(--warning)' : 'var(--success)',
                        fontSize:'12px'
                      }}>{r.decision?.risk_level || '—'}</td>
                      <td style={{ fontFamily:'DM Mono,monospace', fontSize:'12px', color:'var(--accent)' }}>
                        {r.decision?.confidence ? `${r.decision.confidence}%` : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )}
        </div>
      </div>
    </div>
  )
}