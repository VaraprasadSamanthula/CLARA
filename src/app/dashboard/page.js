"use client";
import { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import AppLayout from '../../components/AppLayout';
import { Send, Settings, MessageSquare, Search, User, MessageCircle } from 'lucide-react';
import PatientSearch from '../../components/PatientSearch';
import PatientProfile from '../../components/PatientProfile';
import PatientChat from '../../components/PatientChat';

export default function Dashboard() {
  const searchParams = useSearchParams();
  const tabParam = searchParams.get('tab');
  const [activeTab, setActiveTab] = useState(tabParam || 'chat'); // 'chat', 'search', 'profile', 'patient-chat'
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [apiKey, setApiKey] = useState('');
  const [showSettings, setShowSettings] = useState(false);
  const [tempApiKey, setTempApiKey] = useState('');
  const [selectedPatient, setSelectedPatient] = useState(null);
  const inputRef = useRef(null);

  useEffect(() => {
    const savedApiKey = localStorage.getItem('gemini_key');
    if (savedApiKey) {
      setApiKey(savedApiKey);
      setTempApiKey(savedApiKey);
    }
  }, []);

  const handleSaveApiKey = () => {
    if (tempApiKey.trim()) {
      localStorage.setItem('gemini_key', tempApiKey);
      setApiKey(tempApiKey);
      setShowSettings(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!input.trim()) return;

    const userMessage = input;
    setInput('');
    setMessages((prev) => [...prev, { role: 'user', content: userMessage }]);
    setLoading(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [...messages, { role: 'user', content: userMessage }],
        }),
      });

      const data = await res.json();
      
      if (data.success) {
        let assistantContent = `${data.clinical_answer}`;
        if (data.records_found > 0) {
          assistantContent += `\n\n📊 Records found: ${data.records_found}`;
        }
        setMessages((prev) => [...prev, { role: 'assistant', content: assistantContent }]);
      } else {
        let errorMsg = data.error;
        if (data.hint) errorMsg += '\n\n' + data.hint;
        setMessages((prev) => [...prev, { role: 'assistant', content: `❌ ${errorMsg}` }]);
      }
    } catch (error) {
      setMessages((prev) => [...prev, { role: 'assistant', content: `❌ Error: ${error.message}` }]);
    } finally {
      setLoading(false);
      setTimeout(() => {
        if (inputRef.current) inputRef.current.focus();
      }, 0);
    }
  };

  return (
    <AppLayout>
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%', padding: 'var(--spacing-lg)', gap: 'var(--spacing-lg)' }}>
        {/* Tab Navigation */}
        <div style={{ display: 'flex', gap: 'var(--spacing-md)', borderBottom: '1px solid var(--border)', paddingBottom: 'var(--spacing-md)' }}>
          <div style={{ display: 'flex', gap: 'var(--spacing-md)', flex: 1 }}>
            <button
              onClick={() => {
                setActiveTab('chat');
                setSelectedPatient(null);
              }}
              className={`tab-button ${activeTab === 'chat' ? 'active' : ''}`}
              style={{
                color: activeTab === 'chat' ? 'var(--primary)' : 'var(--text-secondary)',
                borderBottomColor: activeTab === 'chat' ? 'var(--primary)' : 'transparent',
                display: 'flex',
                alignItems: 'center',
                gap: 'var(--spacing-sm)',
              }}
            >
              <MessageSquare size={18} />
              Clinical Chat
            </button>
            <button
              onClick={() => setActiveTab('search')}
              className={`tab-button ${activeTab === 'search' ? 'active' : ''}`}
              style={{
                color: activeTab === 'search' ? 'var(--primary)' : 'var(--text-secondary)',
                borderBottomColor: activeTab === 'search' ? 'var(--primary)' : 'transparent',
                display: 'flex',
                alignItems: 'center',
                gap: 'var(--spacing-sm)',
              }}
            >
              <Search size={18} />
              Patient Search
            </button>
            {selectedPatient && (
              <>
                <button
                  onClick={() => setActiveTab('profile')}
                  className={`tab-button ${activeTab === 'profile' ? 'active' : ''}`}
                  style={{
                    color: activeTab === 'profile' ? 'var(--primary)' : 'var(--text-secondary)',
                    borderBottomColor: activeTab === 'profile' ? 'var(--primary)' : 'transparent',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 'var(--spacing-sm)',
                  }}
                >
                  <User size={18} />
                  Patient #{selectedPatient}
                </button>
                <button
                  onClick={() => setActiveTab('patient-chat')}
                  className={`tab-button ${activeTab === 'patient-chat' ? 'active' : ''}`}
                  style={{
                    color: activeTab === 'patient-chat' ? 'var(--primary)' : 'var(--text-secondary)',
                    borderBottomColor: activeTab === 'patient-chat' ? 'var(--primary)' : 'transparent',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 'var(--spacing-sm)',
                  }}
                >
                  <MessageCircle size={18} />
                  Patient Chat
                </button>
              </>
            )}
          </div>
          <button
            onClick={() => setShowSettings(!showSettings)}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--text-secondary)',
              padding: 'var(--spacing-sm)',
              borderRadius: 'var(--radius-lg)',
              transition: 'all 200ms ease',
            }}
            onMouseEnter={(e) => e.target.style.background = 'var(--surface-secondary)'}
            onMouseLeave={(e) => e.target.style.background = 'none'}
          >
            <Settings size={20} />
          </button>
        </div>

        {/* Settings Panel */}
        {showSettings && (
          <div className="card" style={{ marginBottom: 'var(--spacing-lg)' }}>
            <div>
              <label className="form-label">Gemini API Key</label>
              <div style={{ display: 'flex', gap: 'var(--spacing-sm)' }}>
                <input
                  type="password"
                  value={tempApiKey}
                  onChange={(e) => setTempApiKey(e.target.value)}
                  placeholder="Paste your Gemini API key"
                  className="form-input"
                  style={{ flex: 1 }}
                />
                <button
                  onClick={handleSaveApiKey}
                  className="btn btn-primary"
                >
                  Save
                </button>
              </div>
              <p className="form-hint" style={{ marginTop: 'var(--spacing-md)' }}>
                Get your free key at{' '}
                <a
                  href="https://aistudio.google.com/app/apikey"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ color: 'var(--primary)', textDecoration: 'none' }}
                >
                  aistudio.google.com
                </a>
              </p>
            </div>
          </div>
        )}

        {/* Chat Tab */}
        {activeTab === 'chat' && (
          <>
            <div style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
              gap: 'var(--spacing-lg)',
            }}>
              <div className="card" style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                overflowY: 'auto',
              }}>
                {messages.length === 0 ? (
                  <div className="empty-state">
                    <div style={{ fontSize: '2.5rem', marginBottom: 'var(--spacing-lg)' }}>💬</div>
                    <h3>Start a Conversation</h3>
                    <p style={{ marginTop: 'var(--spacing-sm)', maxWidth: '400px' }}>
                      Ask CLARA about patients, clinical data, vitals, medications, or diagnoses. For example: "Show me all patients over 50 with hypertension"
                    </p>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)' }}>
                    {messages.map((msg, idx) => (
                      <div
                        key={idx}
                        className="message-bubble"
                        style={{
                          ...(msg.role === 'user' ? {
                            marginLeft: 'auto',
                            maxWidth: '75%',
                            background: 'var(--primary)',
                            color: 'white',
                            border: 'none',
                          } : {
                            marginRight: 'auto',
                            maxWidth: '75%',
                          })
                        }}
                      >
                        <p style={{ fontSize: '0.75rem', fontWeight: 600, marginBottom: 'var(--spacing-sm)', opacity: 0.8 }}>
                          {msg.role === 'user' ? 'You' : 'CLARA'}
                        </p>
                        <p style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{msg.content}</p>
                      </div>
                    ))}
                    {loading && (
                      <div className="message-bubble" style={{ marginRight: 'auto', maxWidth: '75%' }}>
                        <p style={{ fontSize: '0.75rem', fontWeight: 600, marginBottom: 'var(--spacing-sm)' }}>CLARA</p>
                        <p>Thinking...</p>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Input Form */}
              <form onSubmit={handleSubmit} style={{ display: 'flex', gap: 'var(--spacing-sm)' }}>
                <input
                  ref={inputRef}
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Ask about patients, vitals, medications..."
                  className="form-input"
                  disabled={loading || !apiKey}
                  style={{ flex: 1 }}
                />
                <button
                  type="submit"
                  disabled={loading || !apiKey}
                  className="btn btn-primary"
                  style={{ padding: 'var(--spacing-md) var(--spacing-lg)' }}
                >
                  <Send size={20} />
                </button>
              </form>

              {!apiKey && (
                <div style={{
                  padding: 'var(--spacing-md)',
                  background: '#fef2f2',
                  border: '1px solid var(--error)',
                  borderRadius: 'var(--radius-lg)',
                  color: 'var(--error)',
                  fontSize: '0.875rem',
                }}>
                  ⚠️ Please enter your Gemini API key in settings to use the clinical chat feature.
                </div>
              )}
            </div>
          </>
        )}

        {/* Search Tab */}
        {activeTab === 'search' && (
          <PatientSearch
            onPatientSelected={(patientId) => {
              setSelectedPatient(patientId);
              setActiveTab('profile');
            }}
          />
        )}

        {/* Profile Tab */}
        {activeTab === 'profile' && selectedPatient && (
          <PatientProfile
            patientId={selectedPatient}
            onBack={() => setActiveTab('search')}
          />
        )}

        {/* Patient Chat Tab */}
        {activeTab === 'patient-chat' && selectedPatient && (
          <PatientChat
            patientId={selectedPatient}
            onBack={() => setActiveTab('profile')}
          />
        )}
      </div>
    </AppLayout>
  );
}
