import { useState } from 'react'

import API from '../config'
const BG = 'https://images.unsplash.com/flagged/photo-1566838616631-f2618f74a6a2?q=80&w=1600&auto=format&fit=crop'

export default function Signup({ onSwitch }) {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const handleSignup = async () => {
    if (!name || !email || !password) { setError('Please fill in all fields'); return }
    setLoading(true); setError(''); setSuccess('')
    try {
      const res = await fetch(`${API}/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password })
      })
      const data = await res.json()
      if (res.ok) { setSuccess('Account created! You can now sign in.'); setName(''); setEmail(''); setPassword('') }
      else setError(data.detail || 'Signup failed')
    } catch {
      setError('Cannot connect to server.')
    } finally {
      setLoading(false)
    }
  }

  const inputStyle = {
    width: '100%', padding: '13px 14px 13px 40px',
    background: 'rgba(255,255,255,0.1)',
    border: '1px solid rgba(255,255,255,0.2)',
    borderRadius: 10, color: '#fff',
    fontSize: 14, outline: 'none',
    fontFamily: 'var(--font-body)',
    backdropFilter: 'blur(8px)',
    boxSizing: 'border-box',
  }

  const labelStyle = {
    fontSize: 12, fontWeight: 600,
    color: 'rgba(255,255,255,0.7)',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: '0.8px',
    display: 'block',
  }

  return (
    <div className="auth-mobile-container" style={{
      minHeight: '100vh',
      display: 'flex',
      backgroundImage: `url('${BG}')`,
      backgroundSize: 'cover',
      backgroundPosition: 'center',
      position: 'relative',
    }}>
      <div style={{
        position: 'absolute', inset: 0,
        background: 'linear-gradient(90deg, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0.15) 50%, rgba(0,0,0,0.4) 100%)',
      }} />

      {/* NAV */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0,
        padding: '20px 36px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        zIndex: 10,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 18, color: '#fff' }}><img src="/logo.png" alt="Logo" height={140} width={140}/></span>
        </div>
        <button onClick={onSwitch} style={{
          background: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(10px)',
          border: '1px solid rgba(255,255,255,0.3)', borderRadius: 30,
          color: '#fff', padding: '8px 20px', fontSize: 13, fontWeight: 600,
          cursor: 'pointer', fontFamily: 'var(--font-body)',
        }}>
          Sign In →
        </button>
      </div>

      {/* LEFT — glass form */}
      <div style={{
        position: 'relative', zIndex: 5,
        width: '100%', maxWidth: 480, minHeight: '100vh',
        display: 'flex', alignItems: 'center',
        padding: '100px 48px 48px',
      }}>
        <div style={{
          background: 'rgba(255,255,255,0.08)',
          backdropFilter: 'blur(24px)',
          WebkitBackdropFilter: 'blur(24px)',
          border: '1px solid rgba(255,255,255,0.18)',
          borderRadius: 24, padding: '40px 36px', width: '100%',
          boxShadow: '0 24px 80px rgba(0,0,0,0.4)',
        }}>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 26, fontWeight: 800, color: '#fff', marginBottom: 6 }}>
            Get Started ⚡
          </div>
          <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: 14, marginBottom: 32, lineHeight: 1.5 }}>
            Create your SolarSathi account and start<br />monitoring your solar plants today.
          </div>

          <div style={{ marginBottom: 16 }}>
            <label style={labelStyle}>Full Name</label>
            <div style={{ position: 'relative' }}>
              <span style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', opacity: 0.5 }}>👤</span>
              <input type="text" placeholder="John Doe" value={name} onChange={e => setName(e.target.value)} style={inputStyle}
                onFocus={e => e.target.style.borderColor = 'rgba(245,200,66,0.7)'}
                onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.2)'} />
            </div>
          </div>

          <div style={{ marginBottom: 16 }}>
            <label style={labelStyle}>Email Address</label>
            <div style={{ position: 'relative' }}>
              <span style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', opacity: 0.5 }}>✉</span>
              <input type="email" placeholder="you@example.com" value={email} onChange={e => setEmail(e.target.value)} style={inputStyle}
                onFocus={e => e.target.style.borderColor = 'rgba(245,200,66,0.7)'}
                onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.2)'} />
            </div>
          </div>

          <div style={{ marginBottom: 24 }}>
            <label style={labelStyle}>Password</label>
            <div style={{ position: 'relative' }}>
              <span style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', opacity: 0.5 }}>🔒</span>
              <input type={showPass ? 'text' : 'password'} placeholder="Create a strong password"
                value={password} onChange={e => setPassword(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSignup()}
                style={{ ...inputStyle, paddingRight: 60 }}
                onFocus={e => e.target.style.borderColor = 'rgba(245,200,66,0.7)'}
                onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.2)'} />
              <button onClick={() => setShowPass(s => !s)} style={{
                position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)',
                background: 'none', border: 'none', color: 'rgba(255,255,255,0.6)',
                cursor: 'pointer', fontSize: 13, fontFamily: 'var(--font-body)',
              }}>{showPass ? 'Hide' : 'Show'}</button>
            </div>
          </div>

          {error && <div style={{ background: 'rgba(255,87,87,0.15)', border: '1px solid rgba(255,87,87,0.4)', borderRadius: 8, padding: '10px 14px', color: '#ff9a9a', fontSize: 13, marginBottom: 16 }}>⚠ {error}</div>}
          {success && <div style={{ background: 'rgba(52,211,153,0.15)', border: '1px solid rgba(52,211,153,0.4)', borderRadius: 8, padding: '10px 14px', color: '#6ee7b7', fontSize: 13, marginBottom: 16 }}>✓ {success}</div>}

          <button onClick={handleSignup} disabled={loading} style={{
            width: '100%', padding: '14px',
            background: 'linear-gradient(135deg, #f5c842, #ff9f1c)',
            border: 'none', borderRadius: 10, color: '#0a0e17',
            fontWeight: 800, fontSize: 15, cursor: 'pointer',
            fontFamily: 'var(--font-display)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
            boxShadow: '0 4px 24px rgba(245,200,66,0.35)',
            opacity: loading ? 0.7 : 1,
          }}>
            {loading ? 'Creating account...' : <>Create Account <span style={{ fontSize: 18 }}>→</span></>}
          </button>

          <div style={{ textAlign: 'center', marginTop: 24, fontSize: 14, color: 'rgba(255,255,255,0.5)' }}>
            Already have an account?{' '}
            <button onClick={onSwitch} style={{ background: 'none', border: 'none', color: '#f5c842', fontWeight: 600, cursor: 'pointer', fontSize: 14, fontFamily: 'var(--font-body)' }}>
              Sign In
            </button>
          </div>
        </div>
      </div>

      {/* RIGHT — hero */}
      <div style={{
        position: 'relative', zIndex: 5, flex: 1,
        display: 'flex', flexDirection: 'column',
        justifyContent: 'flex-end', padding: '48px 56px',
      }}>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(42px, 6vw, 80px)', fontWeight: 800, color: '#fff', lineHeight: 1.05, letterSpacing: '-2px', marginBottom: 20, textShadow: '0 4px 40px rgba(0,0,0,0.4)' }}>
          Solar ⚡<br />Future
        </div>
        <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: 18, lineHeight: 1.6, marginBottom: 40 }}>
          Clean energy. Smarter living.<br />A brighter tomorrow.
        </div>
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
          {[{ icon: '🔋', label: 'Smart Storage' }, { icon: '🌦', label: 'All-Weather' }, { icon: '📈', label: 'Max Efficiency' }].map(({ icon, label }) => (
            <div key={label} style={{
              background: 'rgba(255,255,255,0.1)', backdropFilter: 'blur(10px)',
              border: '1px solid rgba(255,255,255,0.2)', borderRadius: 30,
              padding: '10px 18px', display: 'flex', alignItems: 'center',
              gap: 8, color: '#fff', fontSize: 13, fontWeight: 500,
            }}>{icon} {label}</div>
          ))}
        </div>
      </div>
    </div>
  )
}
