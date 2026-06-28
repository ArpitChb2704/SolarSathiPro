import { useState ,useEffect} from 'react'
import { AuthProvider, useAuth } from './context/AuthContext'
import Login from './pages/Login'
import Signup from './pages/Signup'
import Dashboard from './pages/Dashboard'
import AddPlant from './pages/AddPlant'
import Profile from './pages/Profile'
import Chatbot from './pages/Chatbot'
import API from './config'

const pageTitles = {
  dashboard: 'Dashboard',
  add: 'Add Solar Plant',
  profile: 'My Profile',
  chat: 'AI Assistant',
}

function AppShell() {
  const { userId, logout } = useAuth()
  const [authPage, setAuthPage] = useState('login') // 'login' | 'signup'
  const [page, setPage] = useState('dashboard')
  const [userName, setUserName] = useState('')

  useEffect(() => {
    if (!userId) return
    fetch(`${API}/user/${userId}`)
      .then(r => r.json())
      .then(d => setUserName(d.name))
      .catch(() => {})
  }, [userId])

  // Not logged in → show auth
  if (!userId) {
    return authPage === 'login'
      ? <Login onSwitch={() => setAuthPage('signup')} />
      : <Signup onSwitch={() => setAuthPage('login')} />
  }

  const navItems = [
    { id: 'dashboard', icon: '⚡', label: 'Dashboard' },
    { id: 'add', icon: '＋', label: 'Add Plant' },
    { id: 'profile', icon: '👤', label: 'My Profile' },
    { id: 'chat', icon: '💬', label: 'AI Assistant' },
  ]

  return (
    <div className="layout">
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="sidebar-brand">
          <div className="brand-icon"><img src="/logo.png" alt="Logo" height={120} width={120}/></div>
          <div className="brand-name">SolarSathi</div>
          <div className="brand-sub">Monitoring Platform</div>
        </div>

        <nav className="sidebar-nav">
          {navItems.map(item => (
            <button
              key={item.id}
              className={`nav-item ${page === item.id ? 'active' : ''}`}
              onClick={() => setPage(item.id)}
            >
              <span className="nav-icon">{item.icon}</span>
              {item.label}
            </button>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div className="user-badge">
            <div className="user-avatar">
              {userId && userId.name
                ? userId.name.charAt(0).toUpperCase()
                : String(userId).charAt(0).toUpperCase()}
            </div>
            <div className="user-info">
              <div className="user-label">Logged in as</div>
              <div className="user-id">
                {userName || `User #${userId}`}
              </div>
            </div>
            <button className="logout-btn" onClick={logout} title="Logout">⏻</button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="main">
        <div className="topbar">
          <div className="page-title">{pageTitles[page]}</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div className="status-dot" />
            <span style={{ fontSize: 12, color: 'var(--text3)' }}>Backend Connected</span>
          </div>
        </div>

        <div className="page-content">
          {page === 'dashboard' && <Dashboard onNavigate={setPage} />}
          {page === 'add' && <AddPlant />}
          {page === 'profile' && <Profile />}
          {page === 'chat' && <Chatbot userName={userName} />}
        </div>
     </div>

      {/* Mobile bottom nav */}
      <div style={{
        display: 'none',
        position: 'fixed',
        bottom: 0, left: 0, right: 0,
        background: 'rgba(10,14,23,0.95)',
        backdropFilter: 'blur(20px)',
        borderTop: '1px solid rgba(255,255,255,0.1)',
        padding: '8px 0 20px',
        zIndex: 200,
      }} className="mobile-bottom-nav">
        {navItems.map(item => (
          <button
            key={item.id}
            onClick={() => setPage(item.id)}
            style={{
              flex: 1,
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 4,
              padding: '8px 4px',
              color: page === item.id ? '#f5c842' : 'rgba(255,255,255,0.4)',
              fontFamily: 'var(--font-body)',
              fontSize: 10,
              fontWeight: page === item.id ? 600 : 400,
              transition: 'color 0.2s',
            }}
          >
            <span style={{ fontSize: 20 }}>{item.icon}</span>
            {item.label}
          </button>
        ))}
      </div>
    </div>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <AppShell />
    </AuthProvider>
  )
}
