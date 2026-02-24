export default function decisionpanel({ result }) {
  if (!result) return null
  const { extracted_fields, decision } = result
  const riskColors = { Low:'#22c55e', Medium:'#f59e0b', High:'#ef4444' }
  const decColors  = { Approved:'#22c55e', Rejected:'#ef4444', 'Needs Review':'#f59e0b' }

  return (
    <div style={{ padding:'20px', marginTop:'20px', border:'1px solid #ddd', borderRadius:'8px' }}>
      <h2>📄 Extracted Fields</h2>
      <table border="1" cellPadding="8" style={{ marginBottom:'16px', borderCollapse:'collapse' }}>
        {Object.entries(extracted_fields).filter(([k]) => k !== 'raw_text').map(([k,v]) => (
          <tr key={k}><td><b>{k}</b></td><td>{String(v)}</td></tr>
        ))}
      </table>
      <h2>⚖️ AI Decision</h2>
      <p>Category: <b>{decision.category}</b></p>
      <p>Decision: <b style={{ color: decColors[decision.decision] }}>{decision.decision}</b></p>
      <p>Risk: <b style={{ color: riskColors[decision.risk_level] }}>{decision.risk_level}</b></p>
      <p>Confidence: <b>{decision.confidence}%</b></p>
      <h3>🧠 Reasoning</h3>
      <p style={{ lineHeight:'1.7', color:'#444' }}>{decision.reasoning}</p>
    </div>
  )
}