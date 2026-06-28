import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'

import API from '../config'

export default function Profile() {
  const { userId } = useAuth()
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  

  useEffect(() => {
    const fetch_ = async () => {
      try {
        const res = await fetch(`${API}/user/${userId}`)
        if (!res.ok) throw new Error('Failed to load profile')
        setUser(await res.json())
      } catch (e) {
        setError(e.message)
      } finally {
        setLoading(false)
      }
    }
    fetch_()
  }, [userId])

  if (loading) return <div className="loading-overlay"><span className="spinner" /> Loading profile...</div>
  if (error) return <div className="alert alert-error">⚠ {error}</div>

  const fields = [
    { label: 'User ID', value: `#${user.id}`, icon: '🪪' },
    { label: 'Full Name', value: user.name, icon: '👤' },
    { label: 'Email Address', value: user.email, icon: '✉️' },
    { label: 'Member Since', value: new Date(user.created_at).toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' }), icon: '📅' },
  ]

  return (
    <div style={{ maxWidth: 580 }}>
      <div className="section-title" style={{ marginBottom: 24 }}>My Profile</div>

      {/* Avatar banner */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(245,200,66,0.15), rgba(255,159,28,0.08))',
        border: '1px solid rgba(245,200,66,0.2)',
        borderRadius: 'var(--radius)',
        padding: '32px 24px',
        display: 'flex',
        alignItems: 'center',
        gap: 24,
        marginBottom: 20
      }}>
        <div style={{
          width: 72, height: 72,
          background: 'linear-gradient(135deg, var(--gold), var(--amber))',
          borderRadius: '50%',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 30, fontWeight: 800,
          color: '#0a0e17',
          flexShrink: 0,
          fontFamily: 'var(--font-display)',
          boxShadow: 'var(--shadow-gold)'
        }}>
          {user.name?.charAt(0).toUpperCase()}
        </div>
        <div>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 800, color: 'var(--text)' }}>
            {user.name}
          </div>
          <div style={{ color: 'var(--text3)', fontSize: 13, marginTop: 4 }}>{user.email}</div>
          <div style={{
            display: 'inline-block',
            marginTop: 8,
            background: 'rgba(52,211,153,0.1)',
            border: '1px solid rgba(52,211,153,0.3)',
            borderRadius: 20,
            padding: '2px 12px',
            fontSize: 11,
            color: 'var(--success)',
            fontWeight: 600,
            letterSpacing: '0.5px'
          }}>● ACTIVE</div>
        </div>
      </div>

      {/* Detail cards */}
      <div className="card">
        <div className="card-title">Account Details</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
          {fields.map(({ label, value, icon }, i) => (
            <div key={label} style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '14px 0',
              borderBottom: i < fields.length - 1 ? '1px solid var(--border)' : 'none'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, color: 'var(--text3)', fontSize: 13 }}>
                <span>{icon}</span> {label}
              </div>
              <div style={{ color: 'var(--text)', fontSize: 14, fontWeight: 500 }}>{value}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
