import { useState } from 'react'
import Dashboard from './components/Dashboard'
import AnalyzePage from './components/AnalyzePage'
import HistoryPage from './components/HistoryPage'
import BatchPage from './components/BatchPage'
import './App.css'

export default function App() {
  const [page, setPage] = useState('dashboard')
  const [history, setHistory] = useState([])

  const addToHistory = (entry) => {
    setHistory(prev => [{ ...entry, id: Date.now(), timestamp: new Date().toLocaleString() }, ...prev])
  }

  return (
    <div className="app">
      <aside className="sidebar">
        <div className="sidebar-logo">
          <div className="logo-icon">₹</div>
          <div>
            <div className="logo-title">FinRAG</div>
            <div className="logo-sub">Expert System</div>
          </div>
        </div>

        <nav className="sidebar-nav">
          <button className={`nav-item ${page === 'dashboard' ? 'active' : ''}`} onClick={() => setPage('dashboard')}>
            <span className="nav-icon">⬡</span> Dashboard
          </button>
          <button className={`nav-item ${page === 'analyze' ? 'active' : ''}`} onClick={() => setPage('analyze')}>
            <span className="nav-icon">◈</span> Analyze Document
          </button>
          <button className={`nav-item ${page === 'batch' ? 'active' : ''}`} onClick={() => setPage('batch')}>
            <span className="nav-icon">◫</span> Batch Upload
          </button>
          <button className={`nav-item ${page === 'history' ? 'active' : ''}`} onClick={() => setPage('history')}>
            <span className="nav-icon">◷</span> History
          </button>
        </nav>

        <div className="sidebar-footer">
          <div className="status-dot"></div>
          <span>System Online</span>
        </div>
      </aside>

      <main className="main-content">
        {page === 'dashboard' && <Dashboard history={history} setPage={setPage} />}
        {page === 'analyze' && <AnalyzePage onResult={addToHistory} />}
        {page === 'batch' && <BatchPage onResults={(results) => results.forEach(addToHistory)} />}
        {page === 'history' && <HistoryPage history={history} />}
      </main>
    </div>
  )
}