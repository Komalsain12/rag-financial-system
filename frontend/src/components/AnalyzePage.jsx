import { useState, useRef } from 'react'
import axios from 'axios'

export default function AnalyzePage({ onResult }) {
  const [file, setFile]       = useState(null)
  const [loading, setLoading] = useState(false)
  const [result, setResult]   = useState(null)
  const [error, setError]     = useState(null)
  const [dragover, setDragover] = useState(false)
  const inputRef = useRef()

  const handleFile = (f) => { setFile(f); setResult(null); setError(null) }

  const handleDrop = (e) => {
    e.preventDefault(); setDragover(false)
    if (e.dataTransfer.files[0]) handleFile(e.dataTransfer.files[0])
  }

  const handleAnalyze = async () => {
    if (!file) return
    setLoading(true); setError(null); setResult(null)
    const formData = new FormData()
    formData.append('file', file)
    try {
      const res = await axios.post('http://localhost:8000/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })
      setResult(res.data)
      onResult({ ...res.data, fileName: file.name })
    } catch (err) {
      setError(err.response?.data?.detail || err.message || 'Connection failed. Is the backend running?')
    }
    setLoading(false)
  }

  const getRiskWidth = (level) => ({ Low:25, Medium:60, High:95 }[level] || 0)

  return (
    <div className="fade-in">
      <div className="page-header">
        <div className="page-tag">Analysis</div>
        <h1 className="page-title">Document <span>Analyzer</span></h1>
        <p className="page-subtitle">Upload a financial document for instant AI-powered expert analysis</p>
      </div>

      <div style={{ display:'grid', gridTemplateColumns: result ? '1fr 1.4fr' : '1fr', gap:'24px', alignItems:'start' }}>

        <div>
          <div className="card" style={{ marginBottom:'16px' }}>
            <div
              className={`upload-zone ${dragover ? 'dragover' : ''}`}
              onClick={() => inputRef.current?.click()}
              onDragOver={(e) => { e.preventDefault(); setDragover(true) }}
              onDragLeave={() => setDragover(false)}
              onDrop={handleDrop}
            >
              <input ref={inputRef} type="file" className="file-input"
                accept=".jpg,.jpeg,.png,.pdf"
                onChange={e => handleFile(e.target.files[0])} />
              <span className="upload-icon">{file ? '📄' : '⬆'}</span>
              {file ? (
                <>
                  <div className="upload-title">{file.name}</div>
                  <div className="upload-sub">{(file.size/1024).toFixed(1)} KB — click to change</div>
                </>
              ) : (
                <>
                  <div className="upload-title">Drop your document here</div>
                  <div className="upload-sub">or click to browse files</div>
                  <div className="upload-formats">
                    <span className="format-chip">PDF</span>
                    <span className="format-chip">JPG</span>
                    <span className="format-chip">PNG</span>
                    <span className="format-chip">max 10MB</span>
                  </div>
                </>
              )}
            </div>

            {error && <div className="alert alert-error">⚠ {error}</div>}

            <button className="btn btn-primary" onClick={handleAnalyze}
              disabled={!file || loading}
              style={{ width:'100%', marginTop:'16px', justifyContent:'center' }}>
              {loading ? '◷ Analyzing...' : '◈ Analyze Document'}
            </button>
          </div>

          <div className="card">
            <div className="section-title">How It Works</div>
            {[
              { step:'01', label:'OCR Extraction',  desc:'Tesseract reads text from your document' },
              { step:'02', label:'RAG Retrieval',   desc:'FAISS finds relevant accounting rules' },
              { step:'03', label:'LLM Reasoning',   desc:'Llama 3.3 applies rules to your document' },
              { step:'04', label:'Decision Output', desc:'Explainable decision with confidence score' },
            ].map(item => (
              <div key={item.step} style={{ display:'flex', gap:'14px', padding:'10px 0', borderBottom:'1px solid var(--border)' }}>
                <div style={{ fontFamily:'DM Mono,monospace', fontSize:'11px', color:'var(--accent)', minWidth:'24px', paddingTop:'2px' }}>{item.step}</div>
                <div>
                  <div style={{ fontSize:'13px', fontWeight:600, color:'var(--text)', marginBottom:'2px' }}>{item.label}</div>
                  <div style={{ fontSize:'12px', color:'var(--text2)' }}>{item.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {loading && (
          <div className="card fade-in">
            <div className="loading-overlay">
              <div className="spinner"></div>
              <div className="loading-text">Running RAG Pipeline...</div>
              <div style={{ fontSize:'12px', color:'var(--text3)' }}>OCR → Retrieval → LLM Reasoning</div>
            </div>
          </div>
        )}

        {result && !loading && (
          <div className="fade-in">
            <div className="card" style={{ marginBottom:'16px' }}>
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'16px' }}>
                <div className="section-title" style={{ margin:0 }}>AI Decision</div>
                <span className={`decision-badge ${
                  result.decision?.decision === 'Approved' ? 'badge-approved' :
                  result.decision?.decision === 'Rejected' ? 'badge-rejected' : 'badge-review'
                }`}>
                  {result.decision?.decision === 'Approved' ? '✓' :
                   result.decision?.decision === 'Rejected' ? '✗' : '⚠'}&nbsp;
                  {result.decision?.decision}
                </span>
              </div>

              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'12px', marginBottom:'16px' }}>
                <div className="confidence-ring">
                  <div>
                    <div className="ring-value">{result.decision?.confidence}%</div>
                    <div className="ring-label">Confidence</div>
                  </div>
                  <div style={{ flex:1 }}>
                    <div style={{ fontSize:'12px', color:'var(--text2)', marginBottom:'6px' }}>AI Certainty</div>
                    <div className="risk-bar">
                      <div className="risk-fill risk-low" style={{ width:`${result.decision?.confidence}%` }}></div>
                    </div>
                  </div>
                </div>

                <div style={{ padding:'16px', background:'var(--surface2)', borderRadius:'10px', border:'1px solid var(--border)' }}>
                  <div style={{ fontSize:'12px', color:'var(--text2)', marginBottom:'6px', fontFamily:'DM Mono,monospace', textTransform:'uppercase', letterSpacing:'1px' }}>Risk Level</div>
                  <div style={{ fontSize:'22px', fontFamily:'DM Serif Display,serif', color:
                    result.decision?.risk_level === 'High'   ? 'var(--danger)'  :
                    result.decision?.risk_level === 'Medium' ? 'var(--warning)' : 'var(--success)'
                  }}>{result.decision?.risk_level}</div>
                  <div className="risk-bar" style={{ marginTop:'8px' }}>
                    <div className={`risk-fill risk-${result.decision?.risk_level?.toLowerCase()}`}
                      style={{ width:`${getRiskWidth(result.decision?.risk_level)}%` }}></div>
                  </div>
                </div>
              </div>

              <div style={{ padding:'10px 14px', background:'var(--surface2)', borderRadius:'8px', border:'1px solid var(--border)' }}>
                <span style={{ fontFamily:'DM Mono,monospace', fontSize:'10px', color:'var(--text3)', textTransform:'uppercase', letterSpacing:'1px' }}>Category</span>
                <div style={{ fontSize:'16px', color:'var(--accent)', fontWeight:600, marginTop:'4px' }}>{result.decision?.category}</div>
              </div>
            </div>

            <div className="card" style={{ marginBottom:'16px' }}>
              <div className="section-title">Extracted Fields</div>
              <table className="field-table">
                <tbody>
                  {result.extracted_fields && Object.entries(result.extracted_fields)
                    .filter(([k]) => k !== 'raw_text')
                    .map(([key, val]) => (
                    <tr key={key}>
                      <td>{key.replace(/_/g,' ')}</td>
                      <td>{String(val)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="card">
              <div className="section-title">AI Reasoning</div>
              <div className="reasoning-box">{result.decision?.reasoning}</div>
              <div style={{ marginTop:'12px', padding:'10px', background:'var(--surface2)', borderRadius:'6px', fontSize:'11px', fontFamily:'DM Mono,monospace', color:'var(--text3)' }}>
                Document ID: {result.document_id}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}