"use client";
import { useState, useEffect, useRef } from 'react';
import { Send, Loader, AlertCircle, ArrowLeft, Trash2 } from 'lucide-react';
import { useChatState } from '@/providers/ChatStateProvider';
import { MarkdownRenderer } from './MarkdownRenderer';

export default function PatientChat({ patientId, onBack }) {
  const { getMessages, setMessages, clearChat } = useChatState();
  const [messages, setLocalMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [patient, setPatient] = useState(null);
  const [patientLoading, setPatientLoading] = useState(true);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    if (patientId) {
      const savedMessages = getMessages(patientId);
      setLocalMessages(savedMessages);
    }
  }, [patientId, getMessages]);

  useEffect(() => {
    const fetchPatient = async () => {
      try {
        const res = await fetch(`/api/patients/${patientId}`, {
          credentials: 'include'
        });
        const data = await res.json();
        if (data.patient) {
          setPatient(data.patient);
        }
      } catch (err) {
        console.error('Failed to fetch patient:', err);
      } finally {
        setPatientLoading(false);
      }
    };
    if (patientId) {
      fetchPatient();
    }
  }, [patientId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleClearChat = () => {
    clearChat(patientId);
    setLocalMessages([]);
    setInput('');
    setError(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!input.trim()) {
      return;
    }

    const userMessage = input;
    setInput('');
    const updatedMessages = [...messages, { role: 'user', content: userMessage, timestamp: new Date() }];
    setLocalMessages(updatedMessages);
    setMessages(patientId, updatedMessages);
    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/patient-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          patientId: patientId.toString(),
          question: userMessage
        })
      });

      const data = await res.json();

      if (!res.ok) {
        if (res.status === 401) {
          setError('Authentication required. Please log in again.');
        } else if (res.status === 404) {
          setError(`Patient ${patientId} not found.`);
        } else if (res.status === 400) {
          setError('Invalid request. Please try again.');
        } else {
          setError(data.error || 'Failed to get response from server');
        }
        const errorMessages = [...updatedMessages, {
          role: 'assistant',
          content: `❌ Error: ${data.error || 'Unknown error'}`,
          timestamp: new Date(),
          isError: true
        }];
        setLocalMessages(errorMessages);
        setMessages(patientId, errorMessages);
      } else if (data.success) {
        let displayContent = '';
        
        if (data.source === 'gemini') {
          displayContent = data.answer;
        } else {
          displayContent = data.answer;
          if (data.note) {
            displayContent += `\n\n📋 ${data.note}`;
          }
        }

        const responseMessages = [...updatedMessages, {
          role: 'assistant',
          content: displayContent,
          timestamp: new Date(),
          source: data.source
        }];
        setLocalMessages(responseMessages);
        setMessages(patientId, responseMessages);
      } else {
        setError(data.error || 'Unexpected response from server');
        const errorMessages = [...updatedMessages, {
          role: 'assistant',
          content: `❌ ${data.error || 'Error processing request'}`,
          timestamp: new Date(),
          isError: true
        }];
        setLocalMessages(errorMessages);
        setMessages(patientId, errorMessages);
      }
    } catch (err) {
      const errorMsg = err.message || 'Network error';
      setError(errorMsg);
      const errorMessages = [...updatedMessages, {
        role: 'assistant',
        content: `❌ Error: ${errorMsg}`,
        timestamp: new Date(),
        isError: true
      }];
      setLocalMessages(errorMessages);
      setMessages(patientId, errorMessages);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!loading && inputRef.current) {
      inputRef.current.focus();
    }
  }, [loading]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: 'var(--spacing-lg)' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <button
            onClick={onBack}
            style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-md)', color: 'var(--primary)', background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.875rem', marginBottom: 'var(--spacing-md)', padding: 0, transition: 'all 200ms ease' }}
          >
            <ArrowLeft size={18} />
            Back to Patient
          </button>
          {patientLoading ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-md)' }}>
              <Loader size={16} style={{ color: 'var(--primary)', animation: 'spin 1s linear infinite' }} />
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>Loading patient info...</p>
            </div>
          ) : patient ? (
            <div>
              <h3 style={{ fontSize: '1.125rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                Patient #{patient.id}
                {patient.fullName && ` - ${patient.fullName}`}
              </h3>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: 'var(--spacing-xs)' }}>{patient.source} • Age: {patient.age || 'N/A'} • {patient.gender?.toUpperCase()}</p>
            </div>
          ) : null}
        </div>
        <button
          onClick={handleClearChat}
          disabled={messages.length === 0}
          style={{ padding: 'var(--spacing-md)', color: messages.length === 0 ? 'var(--text-tertiary)' : 'var(--text-secondary)', background: 'none', border: 'none', cursor: messages.length === 0 ? 'not-allowed' : 'pointer', opacity: messages.length === 0 ? 0.5 : 1, transition: 'all 200ms ease' }}
          title="Clear chat history for this patient"
        >
          <Trash2 size={18} />
        </button>
      </div>

      {/* Chat Messages */}
      <div className="card" style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
        {messages.length === 0 ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', textAlign: 'center' }}>
            <div>
              <p style={{ color: 'var(--text-secondary)', fontSize: '1rem', fontWeight: 500, marginBottom: 'var(--spacing-md)' }}>Ask about this patient's clinical history</p>
              <p style={{ color: 'var(--text-tertiary)', fontSize: '0.875rem' }}>Example: "Summarize this patient's medical history" or "What medications are prescribed?"</p>
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-lg)', overflowY: 'auto', paddingRight: 'var(--spacing-md)' }}>
            {messages.map((msg, idx) => (
              <div
                key={idx}
                style={{
                  borderRadius: 'var(--radius-lg)',
                  padding: 'var(--spacing-lg)',
                  maxWidth: '75%',
                  marginLeft: msg.role === 'user' ? 'auto' : '0',
                  background: msg.role === 'user' 
                    ? 'var(--primary-50)' 
                    : msg.isError 
                    ? '#fef2f2' 
                    : 'var(--background-secondary)',
                  border: msg.role === 'user'
                    ? '1px solid var(--primary-200)'
                    : msg.isError
                    ? '1px solid #fecaca'
                    : '1px solid var(--border)'
                }}
              >
                <p style={{ fontSize: '0.75rem', fontWeight: 600, marginBottom: 'var(--spacing-sm)', color: 'var(--primary)' }}>
                  {msg.role === 'user' ? 'You' : 'CLARA'}
                  {msg.source && ` (${msg.source})`}
                  {msg.timestamp && (() => {
                    try {
                      const ts = msg.timestamp instanceof Date 
                        ? msg.timestamp 
                        : new Date(msg.timestamp);
                      return isNaN(ts.getTime()) 
                        ? '' 
                        : ` • ${ts.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
                    } catch (e) {
                      return '';
                    }
                  })()}
                </p>
                {msg.role === 'user' ? (
                  <p style={{ fontSize: '0.875rem', color: msg.isError ? 'var(--error)' : 'var(--text-primary)', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                    {msg.content}
                  </p>
                ) : (
                  <MarkdownRenderer content={msg.content} />
                )}
              </div>
            ))}
            {loading && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-md)', color: 'var(--text-secondary)' }}>
                <Loader size={16} style={{ animation: 'spin 1s linear infinite' }} />
                <p style={{ fontSize: '0.875rem' }}>CLARA is thinking...</p>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Error Message */}
      {error && !loading && (
        <div style={{ padding: 'var(--spacing-lg)', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 'var(--radius-lg)', display: 'flex', gap: 'var(--spacing-md)', alignItems: 'flex-start' }}>
          <AlertCircle size={16} style={{ color: 'var(--error)', flexShrink: 0, marginTop: '2px' }} />
          <p style={{ color: 'var(--error)', fontSize: '0.875rem' }}>{error}</p>
        </div>
      )}

      {/* Input Form */}
      <form onSubmit={handleSubmit} style={{ display: 'flex', gap: 'var(--spacing-md)' }}>
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask a question about this patient..."
          disabled={loading}
          className="form-input"
          style={{ flex: 1 }}
        />
        <button
          type="submit"
          disabled={loading || !input.trim()}
          className="btn btn-primary"
          style={{ padding: 'var(--spacing-md)' }}
        >
          {loading ? (
            <Loader size={18} style={{ animation: 'spin 1s linear infinite' }} />
          ) : (
            <Send size={18} />
          )}
        </button>
      </form>
    </div>
  );
}
