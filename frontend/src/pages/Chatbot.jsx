import { useState, useRef, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'

import API from '../config'

const INTENT_COLORS = {
  plant_qa:      { color: '#34d399', label: 'Plant Info' },
  prediction_qa: { color: '#f5c842', label: 'Prediction' },
  alert_qa:      { color: '#ff6b6b', label: 'Alert' },
  general:       { color: '#818cf8', label: 'General' },
}

const SUGGESTIONS = [
  "How is my plant performing today?",
  "What's my annual energy forecast?",
  "Are there any issues with my plants?",
  "How much energy did I generate today?",
  "What is my plant capacity?",
  "Why is my actual lower than predicted?",
]

function TypingDots() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '4px 0' }}>
      {[0, 1, 2].map(i => (
        <div key={i} style={{
          width: 7, height: 7,
          borderRadius: '50%',
          background: 'rgba(245,200,66,0.7)',
          animation: 'typingBounce 1.2s ease-in-out infinite',
          animationDelay: `${i * 0.2}s`,
        }} />
      ))}
    </div>
  )
}

function Message({ msg }) {
  const isUser = msg.role === 'user'
  const intentInfo = INTENT_COLORS[msg.intent] || null

  return (
    <div style={{
      display: 'flex',
      justifyContent: isUser ? 'flex-end' : 'flex-start',
      marginBottom: 16,
      gap: 10,
      alignItems: 'flex-end',
    }}>
      {!isUser && (
        <div style={{
          width: 32, height: 32, borderRadius: '50%',
          background: 'linear-gradient(135deg, #f5c842, #ff9f1c)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 15, flexShrink: 0,
          boxShadow: '0 2px 12px rgba(245,200,66,0.3)',
        }}>☀️</div>
      )}

      <div style={{ maxWidth: '75%' }}>
        {!isUser && intentInfo && (
          <div style={{
            fontSize: 10, fontWeight: 600,
            color: intentInfo.color,
            textTransform: 'uppercase',
            letterSpacing: '1px',
            marginBottom: 4,
            paddingLeft: 2,
          }}>
            ● {intentInfo.label}
          </div>
        )}
        <div style={{
          padding: '12px 16px',
          borderRadius: isUser ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
          background: isUser
            ? 'linear-gradient(135deg, rgba(245,200,66,0.2), rgba(255,159,28,0.15))'
            : 'rgba(255,255,255,0.07)',
          border: isUser
            ? '1px solid rgba(245,200,66,0.3)'
            : '1px solid rgba(255,255,255,0.1)',
          color: '#fff',
          fontSize: 14,
          lineHeight: 1.65,
          backdropFilter: 'blur(10px)',
          whiteSpace: 'pre-wrap',
        }}>
          {msg.content}
        </div>
        <div style={{
          fontSize: 10, color: 'rgba(255,255,255,0.3)',
          marginTop: 4,
          textAlign: isUser ? 'right' : 'left',
          paddingLeft: isUser ? 0 : 2,
          paddingRight: isUser ? 2 : 0,
        }}>
          {msg.time}
        </div>
      </div>

      {isUser && (
        <div style={{
          width: 32, height: 32, borderRadius: '50%',
          background: 'linear-gradient(135deg, #2dd4bf, #0ea5e9)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 13, fontWeight: 700, color: '#fff', flexShrink: 0,
        }}>
          {msg.userInitial}
        </div>
      )}
    </div>
  )
}

export default function Chatbot({ userName }) {
  const { userId } = useAuth()
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: `Hey ${userName || 'there'}! ☀️ I'm your SolarAI assistant. Ask me anything about your plants, predictions, or performance.`,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      intent: 'general',
    }
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef(null)
  const inputRef = useRef(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  const send = async (text) => {
    const msg = text || input.trim()
    if (!msg || loading) return
    setInput('')

    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    const userInitial = (userName || 'U').charAt(0).toUpperCase()

    setMessages(prev => [...prev, { role: 'user', content: msg, time, userInitial }])
    setLoading(true)

    try {
      const res = await fetch(`${API}/chat/${userId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: msg }),
      })
      const data = await res.json()
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: res.ok ? data.response : (data.detail || 'Something went wrong.'),
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        intent: data.intent || 'general',
      }])
    } catch {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: 'Cannot connect to server. Make sure your backend is running.',
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        intent: 'general',
      }])
    } finally {
      setLoading(false)
      inputRef.current?.focus()
    }
  }

  const clearChat = async () => {
    await fetch(`${API}/chat/${userId}/clear`, { method: 'DELETE' })
    setMessages([{
      role: 'assistant',
      content: `Chat cleared! What would you like to know, ${userName || 'there'}? ☀️`,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      intent: 'general',
    }])
  }

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', maxWidth: 780, margin: '0 auto' }}>
      <style>{`
        @keyframes typingBounce {
          0%, 60%, 100% { transform: translateY(0); opacity: 0.4; }
          30% { transform: translateY(-6px); opacity: 1; }
        }
        .chat-input:focus { outline: none; border-color: rgba(245,200,66,0.7) !important; box-shadow: 0 0 0 3px rgba(245,200,66,0.1); }
        .suggest-btn:hover { background: rgba(245,200,66,0.12) !important; border-color: rgba(245,200,66,0.4) !important; color: #f5c842 !important; }
        .send-btn:hover:not(:disabled) { box-shadow: 0 4px 20px rgba(245,200,66,0.4) !important; transform: scale(1.05); }
        .clear-btn:hover { color: #ff6b6b !important; }
      `}</style>

      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        marginBottom: 20,
      }}>
        <div>
          <div style={{
            fontFamily: 'var(--font-display)', fontSize: 22,
            fontWeight: 800, color: '#fff', letterSpacing: '-0.3px',
          }}>
            AI Assistant
          </div>
          <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 13, marginTop: 2 }}>
            Ask about your plants, predictions & performance
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{
              width: 8, height: 8, borderRadius: '50%',
              background: '#34d399',
              boxShadow: '0 0 8px #34d399',
              animation: 'typingBounce 2s ease-in-out infinite',
            }} />
            <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>Online</span>
          </div>
          <button
            className="clear-btn"
            onClick={clearChat}
            style={{
              background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: 8, padding: '6px 12px', color: 'rgba(255,255,255,0.4)',
              fontSize: 12, cursor: 'pointer', fontFamily: 'var(--font-body)',
              transition: 'color 0.2s',
            }}
          >
            🗑 Clear
          </button>
        </div>
      </div>

      {/* Messages area */}
      <div style={{
        flex: 1,
        background: 'rgba(255,255,255,0.04)',
        backdropFilter: 'blur(20px)',
        border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: 20,
        padding: '20px 16px',
        overflowY: 'auto',
        marginBottom: 12,
        minHeight: 380,
        maxHeight: 420,
        scrollbarWidth: 'thin',
        scrollbarColor: 'rgba(255,255,255,0.1) transparent',
      }}>
        {messages.map((msg, i) => <Message key={i} msg={msg} />)}

        {loading && (
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 10, marginBottom: 16 }}>
            <div style={{
              width: 32, height: 32, borderRadius: '50%',
              background: 'linear-gradient(135deg, #f5c842, #ff9f1c)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15,
            }}>☀️</div>
            <div style={{
              padding: '12px 16px',
              background: 'rgba(255,255,255,0.07)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '18px 18px 18px 4px',
              backdropFilter: 'blur(10px)',
            }}>
              <TypingDots />
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Suggestions */}
      <div style={{
        display: 'flex', gap: 8, flexWrap: 'wrap',
        marginBottom: 12,
      }}>
        {SUGGESTIONS.slice(0, 3).map((s, i) => (
          <button
            key={i}
            className="suggest-btn"
            onClick={() => send(s)}
            disabled={loading}
            style={{
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.12)',
              borderRadius: 20, padding: '6px 14px',
              color: 'rgba(255,255,255,0.55)',
              fontSize: 12, cursor: 'pointer',
              fontFamily: 'var(--font-body)',
              transition: 'all 0.2s',
              whiteSpace: 'nowrap',
            }}
          >
            {s}
          </button>
        ))}
      </div>

      {/* Input */}
      <div style={{
        display: 'flex', gap: 10, alignItems: 'center',
        background: 'rgba(255,255,255,0.06)',
        backdropFilter: 'blur(20px)',
        border: '1px solid rgba(255,255,255,0.12)',
        borderRadius: 16, padding: '8px 8px 8px 16px',
      }}>
        <input
          ref={inputRef}
          className="chat-input"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && !e.shiftKey && send()}
          placeholder="Ask about your solar plants..."
          style={{
            flex: 1, background: 'transparent', border: 'none',
            color: '#fff', fontSize: 14,
            fontFamily: 'var(--font-body)', outline: 'none',
            padding: '6px 0',
          }}
        />
        <button
          className="send-btn"
          onClick={() => send()}
          disabled={loading || !input.trim()}
          style={{
            width: 40, height: 40, borderRadius: 10, flexShrink: 0,
            background: input.trim() && !loading
              ? 'linear-gradient(135deg, #f5c842, #ff9f1c)'
              : 'rgba(255,255,255,0.08)',
            border: 'none', cursor: input.trim() && !loading ? 'pointer' : 'not-allowed',
            color: input.trim() && !loading ? '#0a0e17' : 'rgba(255,255,255,0.3)',
            fontSize: 18, display: 'flex', alignItems: 'center', justifyContent: 'center',
            transition: 'all 0.2s',
          }}
        >
          ➤
        </button>
      </div>

      {/* Intent legend */}
      <div style={{ display: 'flex', gap: 16, marginTop: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
        {Object.entries(INTENT_COLORS).map(([key, val]) => (
          <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: val.color }} />
            <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)' }}>{val.label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
