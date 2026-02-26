import { useState, useRef } from 'react'
import axios from 'axios'

export default function AnalyzePage({ onResult }) {
  const [file, setFile]         = useState(null)
  const [loading, setLoading]   = useState(false)
  const [result, setResult]     = useState(null)
  const [error, setError]       = useState(null)
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
      setError(err.response?.data?.detail || err.message || 'Connection failed. Is the backend running on port 8000?')
    }
    setLoading(false)
  }

  const getRiskWidth = (level) => ({ Low: 25, Medium: 60, High: 95 }[level] || 0)

  // Split reasoning into sentences for better display
  const formatReasoning = (text) => {
    if (!text) return []
    return text
      .split(/(?<=[.!?])\s+/)
      .filter(s => s.trim().length > 0)
  }

  return (
    <div className="fade-in">
      <div className="page-header">
        <div className="page-tag">Analysis</div>
        <h1 className="page-title">Document <span>Analyzer</span></h1>
        <p className="page-subtitle">Upload a financial document for a detailed AI-powered compliance audit</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: result ? '340px 1fr' : '1fr', gap: '24px', alignItems: 'start' }}>

        {/* Left panel — upload */}
        <div>
          <div className="card" style={{ marginBottom: '16px' }}>
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
                  <div className="upload-title" style={{ fontSize: '16px' }}>{file.name}</div>
                  <div className="upload-sub">{(file.size / 1024).toFixed(1)} KB — click to change</div>
                </>
              ) : (
                <>
                  <div className="upload-title">Drop document here</div>
                  <div className="upload-sub">or click to browse</div>
                  <div className="upload-formats">
                    <span className="format-chip">PDF</span>
                    <span className="format-chip">JPG</span>
                    <span className="format-chip">PNG</span>
                  </div>
                </>
              )}
            </div>

            {error && <div className="alert alert-error" style={{ marginTop: '12px' }}>⚠ {error}</div>}

            <button className="btn btn-primary" onClick={handleAnalyze}
              disabled={!file || loading}
              style={{ width: '100%', marginTop: '16px', justifyContent: 'center', fontSize: '15px', padding: '14px' }}>
              {loading ? '◷  Running Audit...' : '◈  Analyze Document'}
            </button>
          </div>

          {/* Pipeline steps */}
          <div className="card">
            <div className="section-title">Pipeline</div>
            {[
              { step: '01', label: 'OCR Extraction',   desc: 'Tesseract reads all text' },
              { step: '02', label: 'Field Parsing',    desc: 'Extract amount, GST, invoice no.' },
              { step: '03', label: 'RAG Retrieval',    desc: 'FAISS fetches relevant rules' },
              { step: '04', label: 'Compliance Check', desc: 'Flags are raised automatically' },
              { step: '05', label: 'LLM Audit',        desc: 'Llama 3.3 writes full reasoning' },
              { step: '06', label: 'Decision Output',  desc: 'Category, decision, risk, confidence' },
            ].map(item => (
              <div key={item.step} style={{ display: 'flex', gap: '12px', padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
                <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '10px', color: 'var(--accent)', minWidth: '22px', paddingTop: '2px' }}>{item.step}</div>
                <div>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text)' }}>{item.label}</div>
                  <div style={{ fontSize: '11px', color: 'var(--text2)' }}>{item.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Loading */}
        {loading && (
          <div className="card fade-in">
            <div className="loading-overlay">
              <div className="spinner"></div>
              <div className="loading-text">Running Full Compliance Audit...</div>
              <div style={{ fontSize: '12px', color: 'var(--text3)', marginTop: '8px', textAlign: 'center', lineHeight: '1.8' }}>
                OCR → Field Extraction → RAG Retrieval<br/>
                Compliance Flags → LLM Reasoning → Decision
              </div>
            </div>
          </div>
        )}

        {/* Results */}
        {result && !loading && (
          <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

            {/* Decision header row */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '12px' }}>
              {/* Decision */}
              <div className="card" style={{ textAlign: 'center', padding: '16px' }}>
                <div style={{ fontSize: '10px', fontFamily: 'DM Mono, monospace', color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '8px' }}>Decision</div>
                <span className={`decision-badge ${
                  result.decision?.decision === 'Approved'     ? 'badge-approved' :
                  result.decision?.decision === 'Rejected'     ? 'badge-rejected' : 'badge-review'
                }`} style={{ fontSize: '13px' }}>
                  {result.decision?.decision === 'Approved' ? '✓' :
                   result.decision?.decision === 'Rejected' ? '✗' : '⚠'}&nbsp;
                  {result.decision?.decision}
                </span>
              </div>

              {/* Confidence */}
              <div className="card" style={{ padding: '16px' }}>
                <div style={{ fontSize: '10px', fontFamily: 'DM Mono, monospace', color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '4px' }}>Confidence</div>
                <div style={{ fontSize: '30px', fontFamily: 'DM Serif Display, serif', color: 'var(--accent)', lineHeight: 1 }}>{result.decision?.confidence}%</div>
                <div style={{ height: '3px', background: 'var(--border)', borderRadius: '2px', marginTop: '8px', overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${result.decision?.confidence}%`, background: 'var(--accent)', borderRadius: '2px', transition: 'width 1s ease' }}></div>
                </div>
              </div>

              {/* Risk */}
              <div className="card" style={{ padding: '16px' }}>
                <div style={{ fontSize: '10px', fontFamily: 'DM Mono, monospace', color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '4px' }}>Risk Level</div>
                <div style={{ fontSize: '24px', fontFamily: 'DM Serif Display, serif', color:
                  result.decision?.risk_level === 'High'   ? 'var(--danger)'  :
                  result.decision?.risk_level === 'Medium' ? 'var(--warning)' : 'var(--success)',
                  lineHeight: 1
                }}>{result.decision?.risk_level}</div>
                <div style={{ height: '3px', background: 'var(--border)', borderRadius: '2px', marginTop: '8px', overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${getRiskWidth(result.decision?.risk_level)}%`,
                    background: result.decision?.risk_level === 'High' ? 'var(--danger)' :
                      result.decision?.risk_level === 'Medium' ? 'var(--warning)' : 'var(--success)',
                    borderRadius: '2px', transition: 'width 1s ease'
                  }}></div>
                </div>
              </div>

              {/* Category */}
              <div className="card" style={{ padding: '16px' }}>
                <div style={{ fontSize: '10px', fontFamily: 'DM Mono, monospace', color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '4px' }}>Category</div>
                <div style={{ fontSize: '14px', color: 'var(--accent)', fontWeight: 600, lineHeight: 1.3 }}>{result.decision?.category}</div>
              </div>
            </div>

            {/* Extracted fields + reasoning side by side */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.6fr', gap: '16px' }}>

              {/* Extracted Fields */}
              <div className="card">
                <div className="section-title">Extracted Fields</div>
                <table className="field-table">
                  <tbody>
                    {result.extracted_fields && Object.entries(result.extracted_fields)
                      .filter(([k]) => k !== 'raw_text')
                      .map(([key, val]) => (
                      <tr key={key}>
                        <td>{key.replace(/_/g, ' ')}</td>
                        <td style={{ color: val ? 'var(--text)' : 'var(--danger)' }}>
                          {val ? String(val) : '⚠ Not found'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {/* Compliance flags */}
                <div style={{ marginTop: '14px' }}>
                  <div style={{ fontSize: '11px', fontFamily: 'DM Mono, monospace', color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '8px' }}>Compliance Status</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <div style={{ fontSize: '12px', display: 'flex', alignItems: 'center', gap: '8px', color: result.extracted_fields?.gst_number ? 'var(--success)' : 'var(--danger)' }}>
                      {result.extracted_fields?.gst_number ? '✓' : '✗'} GST Number
                    </div>
                    <div style={{ fontSize: '12px', display: 'flex', alignItems: 'center', gap: '8px', color: result.extracted_fields?.invoice_number ? 'var(--success)' : 'var(--warning)' }}>
                      {result.extracted_fields?.invoice_number ? '✓' : '⚠'} Invoice Number
                    </div>
                    <div style={{ fontSize: '12px', display: 'flex', alignItems: 'center', gap: '8px', color: result.extracted_fields?.amount ? 'var(--success)' : 'var(--danger)' }}>
                      {result.extracted_fields?.amount ? '✓' : '✗'} Amount Detected
                    </div>
                    <div style={{ fontSize: '12px', display: 'flex', alignItems: 'center', gap: '8px',
                      color: (result.extracted_fields?.amount || 0) <= 10000 ? 'var(--success)' : 'var(--warning)' }}>
                      {(result.extracted_fields?.amount || 0) <= 10000 ? '✓' : '⚠'} Within Auto-Approval Limit
                    </div>
                  </div>
                </div>
              </div>

              {/* Detailed Reasoning */}
              <div className="card">
                <div className="section-title">Full AI Audit Report</div>
                <div style={{
                  background: 'var(--surface2)',
                  border: '1px solid var(--border)',
                  borderLeft: `3px solid ${
                    result.decision?.decision === 'Approved'     ? 'var(--success)' :
                    result.decision?.decision === 'Rejected'     ? 'var(--danger)'  : 'var(--warning)'
                  }`,
                  borderRadius: '8px',
                  padding: '16px',
                }}>
                  {formatReasoning(result.decision?.reasoning).map((sentence, i) => (
                    <p key={i} style={{
                      fontSize: '13px',
                      lineHeight: '1.85',
                      color: 'var(--text2)',
                      marginBottom: '10px',
                      paddingBottom: '10px',
                      borderBottom: i < formatReasoning(result.decision?.reasoning).length - 1 ? '1px solid var(--border)' : 'none'
                    }}>
                      <span style={{ color: 'var(--accent)', fontFamily: 'DM Mono, monospace', fontSize: '10px', marginRight: '8px' }}>
                        {String(i + 1).padStart(2, '0')}
                      </span>
                      {sentence.trim()}
                    </p>
                  ))}
                </div>

                {/* Document ID footer */}
                <div style={{ marginTop: '12px', display: 'flex', justifyContent: 'space-between',
                  padding: '8px 12px', background: 'var(--surface2)', borderRadius: '6px',
                  fontSize: '11px', fontFamily: 'DM Mono, monospace', color: 'var(--text3)' }}>
                  <span>ID: {result.document_id?.slice(0, 16)}...</span>
                  <span style={{ color: 'var(--success)' }}>✓ Saved to History</span>
                </div>
              </div>
            </div>

          </div>
        )}
      </div>
    </div>
  )
}
