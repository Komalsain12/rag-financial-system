import { useState } from 'react'
import Upload from './components/upload'
import DecisionPanel from './components/decisionpanel'

export default function App() {
  const [result, setResult] = useState(null)
  return (
    <div style={{ maxWidth:'800px', margin:'40px auto', fontFamily:'sans-serif' }}>
      <h1>🏦 RAG Financial Expert System</h1>
      <Upload onResult={setResult} />
      <DecisionPanel result={result} />
    </div>
  )
}