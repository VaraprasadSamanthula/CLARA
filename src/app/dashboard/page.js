"use client";
import { useState, useEffect, useRef, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import AppLayout from '../../components/AppLayout';
import { Send, MessageSquare, Search, User, MessageCircle, FileText } from 'lucide-react';
import PatientSearch from '../../components/PatientSearch';
import PatientProfile from '../../components/PatientProfile';
import PatientChat from '../../components/PatientChat';
import DocumentManager from '../../components/DocumentManager';
import { ThemeProvider, useTheme } from '@/providers/ThemeProvider';

// Separate component that uses useSearchParams
function DashboardContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const tabParam = searchParams.get('tab');
  const [activeTab, setActiveTab] = useState(tabParam || 'chat');
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const inputRef = useRef(null);

  // Update activeTab when URL changes
  useEffect(() => {
    if (tabParam) {
      setActiveTab(tabParam);
    }
  }, [tabParam]);

  // Update URL when tab changes
  const handleTabChange = (newTab) => {
    setActiveTab(newTab);
    if (newTab === 'search') {
      router.push('/dashboard?tab=search');
    } else if (newTab === 'chat') {
      router.push('/dashboard?tab=chat');
    } else {
      // For patient-specific tabs, don't change URL
      setActiveTab(newTab);
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
                handleTabChange('chat');
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
              onClick={() => handleTabChange('search')}
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
                <button
                  onClick={() => setActiveTab('documents')}
                  className={`tab-button ${activeTab === 'documents' ? 'active' : ''}`}
                  style={{
                    color: activeTab === 'documents' ? 'var(--primary)' : 'var(--text-secondary)',
                    borderBottomColor: activeTab === 'documents' ? 'var(--primary)' : 'transparent',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 'var(--spacing-sm)',
                  }}
                >
                  <FileText size={18} />
                  Documents
                </button>
              </>
            )}
          </div>
        </div>

        {/* Chat Tab */}
        {activeTab === 'chat' && (
          <>
            <div style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
              gap: 'var(--spacing-lg)',
              maxWidth: '1000px',
              margin: '0 auto',
              width: '100%'
            }}>
              <div style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                overflowY: 'auto',
                background: 'var(--surface)',
                borderRadius: 'var(--radius-lg)',
                border: '1px solid var(--border)',
                padding: 'var(--spacing-xl)',
              }}>
                {messages.length === 0 ? (
                  <div className="empty-state">
                    <div style={{ fontSize: '3rem', marginBottom: 'var(--spacing-lg)' }}>💬</div>
                    <h3 style={{ fontSize: '22px', marginBottom: 'var(--spacing-md)' }}>Start a Conversation</h3>
                    <p style={{ marginTop: 'var(--spacing-sm)', maxWidth: '500px', fontSize: '16px', color: 'var(--text-secondary)', lineHeight: 1.7 }}>
                      Ask CLARA about patients, clinical data, vitals, medications, or diagnoses. For example: "Show me all patients over 50"
                    </p>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-lg)' }}>
                    {messages.map((msg, idx) => (
                      <div
                        key={idx}
                        style={{
                          display: 'flex',
                          justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start',
                          marginBottom: idx < messages.length - 1 ? 'var(--spacing-md)' : 0
                        }}
                      >
                        <div
                          style={{
                            maxWidth: '70%',
                            padding: 'var(--spacing-lg)',
                            borderRadius: 'var(--radius-lg)',
                            background: msg.role === 'user' ? 'var(--primary)' : 'var(--background-secondary)',
                            color: msg.role === 'user' ? 'white' : 'var(--text-primary)',
                            border: msg.role === 'user' ? 'none' : '1px solid var(--border)',
                            fontSize: '16px',
                            lineHeight: 1.7,
                            wordBreak: 'break-word',
                            whiteSpace: 'pre-wrap'
                          }}
                        >
                          {msg.content}
                        </div>
                      </div>
                    ))}
                    {loading && (
                      <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
                        <div style={{
                          padding: 'var(--spacing-lg)',
                          borderRadius: 'var(--radius-lg)',
                          background: 'var(--background-secondary)',
                          color: 'var(--text-secondary)',
                          border: '1px solid var(--border)',
                          fontSize: '16px'
                        }}>
                          CLARA is thinking...
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Input Form - Fixed at Bottom */}
              <form onSubmit={handleSubmit} style={{ 
                display: 'flex', 
                gap: 'var(--spacing-md)',
                background: 'var(--surface)',
                padding: 'var(--spacing-lg)',
                borderRadius: 'var(--radius-lg)',
                border: '1px solid var(--border)',
              }}>
                <input
                  ref={inputRef}
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Ask about medications, labs, diagnoses, admissions..."
                  className="form-input"
                  disabled={loading}
                  style={{ 
                    flex: 1,
                    fontSize: '16px',
                    padding: 'var(--spacing-md) var(--spacing-lg)'
                  }}
                />
                <button
                  type="submit"
                  disabled={loading}
                  className="btn btn-primary"
                  style={{ 
                    padding: 'var(--spacing-md) var(--spacing-xl)',
                    fontSize: '16px'
                  }}
                >
                  <Send size={20} />
                </button>
              </form>
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

        {/* Documents Tab */}
        {activeTab === 'documents' && selectedPatient && (
          <DocumentManager
            patientId={selectedPatient}
            onDocumentUploaded={() => {}}
          />
        )}
      </div>
    </AppLayout>
  );
}

export default function Dashboard() {
  return (
    <Suspense fallback={<div style={{ padding: '2rem', textAlign: 'center' }}>Loading...</div>}>
      <DashboardContent />
    </Suspense>
  );
}
