import { useState } from 'react'
import { useAuth } from '../context/AuthContext'

import API from '../config'

export default function AddPlant() {
  const { userId } = useAuth()
  const [form, setForm] = useState({
    plant_name: '',
    lat: 28.6139,
    lon: 77.2090,
    capacity_kw: 5.0,
    tilt: 25.0,
    azimuth: 180.0
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handleSubmit = async () => {
    if (!form.plant_name) { setError('Plant name is required'); return }
    setLoading(true); setError(''); setSuccess('')
    try {
      const res = await fetch(`${API}/add-plant/${userId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      })
      const data = await res.json()
      if (res.ok) {
        setSuccess('Plant added successfully!')
        setForm({ plant_name: '', lat: 28.6139, lon: 77.2090, capacity_kw: 5.0, tilt: 25.0, azimuth: 180.0 })
      } else {
        setError(data.detail || 'Failed to add plant')
      }
    } catch {
      setError('Cannot connect to server. Make sure your backend is running.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ maxWidth: 640 }}>
      <div className="section-title" style={{ marginBottom: 24 }}>Add Solar Plant</div>

      <div className="card">
        <div className="form-group">
          <label className="form-label">Plant Name</label>
          <input
            className="form-input"
            type="text"
            placeholder="My Rooftop Plant"
            value={form.plant_name}
            onChange={e => set('plant_name', e.target.value)}
          />
        </div>

        <div className="form-row">
          <div className="form-group">
            <label className="form-label">Latitude</label>
            <input
              className="form-input"
              type="number"
              step="0.000001"
              value={form.lat}
              onChange={e => set('lat', parseFloat(e.target.value))}
            />
          </div>
          <div className="form-group">
            <label className="form-label">Longitude</label>
            <input
              className="form-input"
              type="number"
              step="0.000001"
              value={form.lon}
              onChange={e => set('lon', parseFloat(e.target.value))}
            />
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label className="form-label">Capacity (kW)</label>
            <input
              className="form-input"
              type="number"
              min="0.1"
              step="0.5"
              value={form.capacity_kw}
              onChange={e => set('capacity_kw', parseFloat(e.target.value))}
            />
          </div>
          <div className="form-group">
            <label className="form-label">Tilt Angle (°)</label>
            <input
              className="form-input"
              type="number"
              min="0"
              max="90"
              step="1"
              value={form.tilt}
              onChange={e => set('tilt', parseFloat(e.target.value))}
            />
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">Azimuth (°) — 180° = South facing</label>
          <input
            className="form-input"
            type="number"
            min="0"
            max="360"
            step="1"
            value={form.azimuth}
            onChange={e => set('azimuth', parseFloat(e.target.value))}
          />
          <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
            {[['East', 90], ['South', 180], ['West', 270]].map(([label, val]) => (
              <button
                key={label}
                className={`btn btn-sm ${form.azimuth === val ? 'btn-primary' : 'btn-outline'}`}
                style={{ flex: 1, padding: '6px 8px', fontSize: 12 }}
                onClick={() => set('azimuth', val)}
              >
                {label} ({val}°)
              </button>
            ))}
          </div>
        </div>

        {error && <div className="alert alert-error">⚠ {error}</div>}
        {success && <div className="alert alert-success">✓ {success}</div>}

        <div style={{ marginTop: 24 }}>
          <button className="btn btn-primary" onClick={handleSubmit} disabled={loading}>
            {loading ? <><span className="spinner" /> Adding plant...</> : '+ Add Plant'}
          </button>
        </div>
      </div>

      <div className="divider" />

      <div className="card-title">Parameter Guide</div>
      <div className="info-grid">
        {[
          ['Latitude / Longitude', 'Geographic location of the plant'],
          ['Capacity (kW)', 'Total solar system size in kilowatts'],
          ['Tilt Angle', 'Panel angle from ground (0° = flat, 90° = vertical)'],
          ['Azimuth', '180° = South · 90° = East · 270° = West'],
        ].map(([label, val]) => (
          <div className="info-item" key={label}>
            <div className="info-item-label">{label}</div>
            <div className="info-item-val">{val}</div>
          </div>
        ))}
      </div>
    </div>
  )
}
