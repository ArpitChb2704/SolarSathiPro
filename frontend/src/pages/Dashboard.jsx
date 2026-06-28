import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis,
  Tooltip, ResponsiveContainer, CartesianGrid
} from 'recharts'

import API from '../config'

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload?.length) {
    return (
      <div style={{
        background: 'var(--surface2)', border: '1px solid var(--border2)',
        borderRadius: 8, padding: '10px 14px', fontSize: 13
      }}>
        <div style={{ color: 'var(--text3)', marginBottom: 4 }}>{label}</div>
        {payload.map((p, i) => (
          <div key={i} style={{ color: 'var(--gold)', fontWeight: 600 }}>
            {p.value?.toFixed ? p.value.toFixed(2) : p.value} {p.name}
          </div>
        ))}
      </div>
    )
  }
  return null
}


function PlantCard({ plant }) {
  const [open, setOpen] = useState(false)
  const [tab, setTab] = useState(0)
  const [loading, setLoading] = useState(false)
  const [data, setData] = useState(null)
  const [error, setError] = useState('')
  const [sending, setSending] = useState(false)
  const [reportMsg, setReportMsg] = useState('')
  const [reportErr, setReportErr] = useState('')


  {/*const sendReport = async () => {
    setSending(true)
    setReportMsg('')
    setReportErr('')
    try {
      const res = await fetch(`${API}/send-report/${userId}`, { method: 'POST' })
      const data = await res.json()
      if (res.ok) setReportMsg('Report sent to your email!')
      else setReportErr(data.detail)
    } catch {
      setReportErr('Could not connect to server.')
    } finally {
      setSending(false)
    }
  }*/}

  const runPrediction = async () => {
    setLoading(true)
    setError('')
    try {
      const res = await fetch(`${API}/predict/${plant.id}`, { method: 'POST' })
      if (!res.ok) throw new Error('Prediction failed')
      const d = await res.json()
      setData(d)
      setOpen(true)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  const monthOrder = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
  const monthlyData = data ? monthOrder.map(m => ({
    month: m,
    energy: data.monthly_energy_kwh?.[m] || 0
  })) : []

  const hourlyData = data?.hourly_generation || []
  const forecastData = data?.forecast_7_days || []

  return (
    <div className="plant-card">
      <div className="plant-header" onClick={() => data && setOpen(o => !o)}>
        <div className="plant-info">
          <div className="plant-icon">🔆</div>
          <div>
            <div className="plant-name">{plant.plant_name}</div>
            <div className="plant-cap">{plant.capacity_kw} kW capacity</div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {data && (
            <span style={{ color: 'var(--text3)', fontSize: 13 }}>
              {open ? '▲ Collapse' : '▼ View Results'}
            </span>
          )}
          <button
            className="btn btn-outline btn-sm"
            onClick={e => { e.stopPropagation(); runPrediction() }}
            disabled={loading}
          >
            {loading ? <><span className="spinner" style={{ width: 14, height: 14 }} /> Running...</> : '⚡ Run Prediction'}
          </button>
        </div>
      </div>

      {error && (
        <div style={{ padding: '0 24px 16px' }}>
          <div className="alert alert-error">⚠ {error}</div>
        </div>
      )}

      {data && open && (
        <div className="plant-body">
          <div className="tabs">
            {["Today's Prediction", "7-Day Forecast", "Annual Analytics"].map((t, i) => (
              <button key={i} className={`tab ${tab === i ? 'active' : ''}`} onClick={() => setTab(i)}>
                {t}
              </button>
            ))}
          </div>

          {tab === 0 && (
            <div>
              <div className="metrics-grid">
                <div className="metric-card">
                  <div className="metric-label">Actual Energy</div>
                  <div className="metric-value">
                    {data.actual_daily_energy_kwh}
                    <span className="metric-unit">kWh</span>
                  </div>
                </div>
                <div className="metric-card">
                  <div className="metric-label">Predicted Energy</div>
                  <div className="metric-value">
                    {data.predicted_daily_energy_kwh}
                    <span className="metric-unit">kWh</span>
                  </div>
                </div>
                <div className="metric-card">
                  <div className="metric-label">Performance Ratio</div>
                  <div className="metric-value">
                    {typeof data.performance_ratio === 'number'
                      ? (data.performance_ratio * 100).toFixed(1)
                      : '--'}
                    <span className="metric-unit">%</span>
                  </div>
                </div>
              </div>
              <div className="chart-wrap">
                <div className="chart-title">Hourly Generation (kW)</div>
                <ResponsiveContainer width="100%" height={220}>
                  <LineChart data={hourlyData} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                    <CartesianGrid stroke="rgba(255,255,255,0.04)" />
                    <XAxis dataKey="time" tick={{ fill: 'var(--text3)', fontSize: 11 }} />
                    <YAxis tick={{ fill: 'var(--text3)', fontSize: 11 }} />
                    <Tooltip content={<CustomTooltip />} />
                    <Line
                      type="monotone"
                      dataKey="generation_kw"
                      stroke="var(--gold)"
                      strokeWidth={2}
                      dot={false}
                      activeDot={{ r: 4, fill: 'var(--gold)' }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {tab === 1 && (
            <div>
              <div className="chart-wrap" style={{ marginTop: 0 }}>
                <div className="chart-title">7-Day Energy Forecast</div>
                <table className="data-table" style={{ marginTop: 8 }}>
                  <thead>
                    <tr>
                      {forecastData[0] && Object.keys(forecastData[0]).map(k => (
                        <th key={k}>{k}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {forecastData.map((row, i) => (
                      <tr key={i}>
                        {Object.keys(forecastData[0]).map((k, j) => (
                          <td key={j}>
                            {typeof row[k] === 'number' ? row[k].toFixed(2) : row[k]}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {tab === 2 && (
            <div>
              <div className="metrics-grid">
                <div className="metric-card" style={{ gridColumn: '1 / -1' }}>
                  <div className="metric-label">Annual Energy Forecast</div>
                  <div className="metric-value">
                    {data.annual_energy_kwh?.toLocaleString?.() || data.annual_energy_kwh}
                    <span className="metric-unit">kWh</span>
                  </div>
                </div>
              </div>
              <div className="chart-wrap">
                <div className="chart-title">Monthly Energy (kWh)</div>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={monthlyData} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                    <CartesianGrid stroke="rgba(255,255,255,0.04)" />
                    <XAxis dataKey="month" tick={{ fill: 'var(--text3)', fontSize: 11 }} />
                    <YAxis tick={{ fill: 'var(--text3)', fontSize: 11 }} />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="energy" fill="var(--gold)" radius={[4, 4, 0, 0]} opacity={0.85} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default function Dashboard({ onNavigate }) {
  const { userId } = useAuth()
  const [plants, setPlants] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const fetchPlants = async () => {
      try {
        const res = await fetch(`${API}/plants/${userId}`)
        if (!res.ok) throw new Error('Failed to load plants')
        setPlants(await res.json())
      } catch (e) {
        setError(e.message)
      } finally {
        setLoading(false)
      }
    }
    fetchPlants()
  }, [userId])

  // Move sendReport state and function here from PlantCard
  const [sending, setSending] = useState(false)
  const [reportMsg, setReportMsg] = useState('')
  const [reportErr, setReportErr] = useState('')



  const sendReport = async () => {
    setSending(true)
    setReportMsg('')
    setReportErr('')
    try {
      const res = await fetch(`${API}/send-report/${userId}`, { method: 'POST' })
      const data = await res.json()
      if (res.ok) setReportMsg('Report sent to your email!')
      else setReportErr(data.detail)
    } catch {
      setReportErr('Could not connect to server.')
    } finally {
      setSending(false)
    }
  }

  return (
    <div>
      <div className="section-header">
        <div className="section-title">Your Solar Plants</div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button
            className="btn btn-outline btn-sm"
            onClick={sendReport}
            disabled={sending}
            style={{ borderColor: 'rgba(245,200,66,0.4)', color: '#f5c842' }}
          >
            {sending
              ? <><span className="spinner" style={{ width: 14, height: 14 }} /> Sending...</>
              : '📊 Email Report'
            }
          </button>
          <button className="btn btn-outline btn-sm" onClick={() => onNavigate('add')}>
            + Add Plant
          </button>
        </div>
      </div>

      {reportMsg && <div className="alert alert-success">{reportMsg}</div>}
      {reportErr && <div className="alert alert-error">⚠ {reportErr}</div>}

      {loading && (
        <div className="loading-overlay">
          <span className="spinner" /> Loading plants...
        </div>
      )}

      {error && <div className="alert alert-error">⚠ {error}</div>}

      {!loading && !error && plants.length === 0 && (
        <div className="empty-state">
          <div className="empty-icon">🌱</div>
          <div className="empty-title">No plants yet</div>
          <div className="empty-sub">Add your first solar plant to start monitoring</div>
          <button className="btn btn-primary" style={{ width: 'auto', margin: '0 auto' }} onClick={() => onNavigate('add')}>
            + Add Your First Plant
          </button>
        </div>
      )}

      {!loading && plants.length > 0 && (
        <div className="plants-grid">
          {plants.map(p => <PlantCard key={p.id} plant={p} />)}
        </div>
      )}
    </div>
  )
}
