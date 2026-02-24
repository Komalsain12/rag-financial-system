import { useState } from 'react'
import axios from 'axios'

export default function Upload({ onResult }) {
  const [loading, setLoading] = useState(false)
  const [file, setFile] = useState(null)
  const [error, setError] = useState(null)

  const handleAnalyze = async () => {
    if (!file) { alert('Please select a file first!'); return }
    setLoading(true); setError(null)
    const formData = new FormData()
    formData.append('file', file)
    try {
      const res = await axios.post(
        'http://localhost:8000/analyze', formData,
        { headers: { 'Content-Type': 'multipart/form-data' } }
      )
      onResult(res.data)
    } catch (err) {
      setError('Error: ' + (err.response?.data?.detail || err.message))
    }
    setLoading(false)
  }

  return (
    <div style={{ padding:'20px', border:'2px dashed #ccc', borderRadius:'8px' }}>
      <h2>Upload Financial Document</h2>
      <input type="file" accept=".jpg,.jpeg,.png,.pdf"
        onChange={e => setFile(e.target.files[0])}
        style={{ margin:'12px 0', display:'block' }} />
      {file && <p>Selected: <b>{file.name}</b></p>}
      {error && <p style={{ color:'red' }}>{error}</p>}
      <button onClick={handleAnalyze} disabled={loading}>
        {loading ? 'Analyzing... please wait' : 'Analyze Document'}
      </button>
    </div>
  )
}