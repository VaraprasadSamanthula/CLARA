"use client";
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Send, LogOut, Settings, MessageSquare, Search, User } from 'lucide-react';
import PatientSearch from '../../components/PatientSearch';
import PatientProfile from '../../components/PatientProfile';

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState('chat'); // 'chat', 'search', 'profile'
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [apiKey, setApiKey] = useState('');
  const [showSettings, setShowSettings] = useState(false);
  const [tempApiKey, setTempApiKey] = useState('');
  const [selectedPatient, setSelectedPatient] = useState(null);
  const router = useRouter();
  const inputRef = useRef(null);

  useEffect(() => {
    // Middleware handles authentication for protected routes.
    // If we reach here, middleware already validated the session_id cookie.
    // This page doesn't need to check HttpOnly cookies (JavaScript can't read them anyway).
    // Just restore the saved API key from localStorage if it exists.
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
    if (!input.trim()) {
      return;
    }

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
      // Restore focus to input after response is received
      // Use setTimeout to ensure the state update completes first
      setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.focus();
        }
      }, 0);
    }
  };

  const handleLogout = async () => {
    try {
      // Call backend logout API to invalidate session
      // This also sets Set-Cookie with Max-Age=0 to clear the HttpOnly cookie
      await fetch('/api/auth/logout', {
        method: 'POST'
      });
    } catch (error) {
      console.error('Logout error:', error);
    }
    
    // Ensure cookie is cleared (redundant but safe for all browsers)
    document.cookie = 'session_id=; path=/; max-age=0';
    
    // Redirect to login
    router.push('/login');
  };

  return (
    <div className="app-shell">
      {/* Header */}
      <header className="glass sticky top-0 z-50 border-b border-amber-700/20">
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
          <div>
            <h1 className="font-display text-2xl font-bold text-cyan-300">CLARA</h1>
            <p className="text-xs text-amber-200">Clinical Data Assistant</p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => setShowSettings(!showSettings)}
              className="p-2 hover:bg-amber-900/20 rounded-lg transition text-amber-200 hover:text-cyan-300"
            >
              <Settings size={20} />
            </button>
            <button
              onClick={handleLogout}
              className="p-2 hover:bg-red-900/20 rounded-lg transition text-amber-200 hover:text-red-400"
            >
              <LogOut size={20} />
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="border-t border-amber-700/20 px-6 flex gap-1 bg-amber-950/20">
          <button
            onClick={() => {
              setActiveTab('chat');
              setSelectedPatient(null);
            }}
            className={`flex items-center gap-2 px-4 py-3 font-medium text-sm border-b-2 transition ${
              activeTab === 'chat'
                ? 'text-cyan-300 border-cyan-400'
                : 'text-amber-200 border-transparent hover:text-amber-50'
            }`}
          >
            <MessageSquare size={18} />
            Chat
          </button>
          <button
            onClick={() => setActiveTab('search')}
            className={`flex items-center gap-2 px-4 py-3 font-medium text-sm border-b-2 transition ${
              activeTab === 'search'
                ? 'text-cyan-300 border-cyan-400'
                : 'text-amber-200 border-transparent hover:text-amber-50'
            }`}
          >
            <Search size={18} />
            Search
          </button>
          {selectedPatient && (
            <button
              onClick={() => setActiveTab('profile')}
              className={`flex items-center gap-2 px-4 py-3 font-medium text-sm border-b-2 transition ${
                activeTab === 'profile'
                  ? 'text-cyan-300 border-cyan-400'
                  : 'text-amber-200 border-transparent hover:text-amber-50'
              }`}
            >
              <User size={18} />
              Patient #{selectedPatient}
            </button>
          )}
        </div>

        {/* Settings Panel */}
        {showSettings && (
          <div className="border-t border-amber-700/20 px-6 py-4 bg-amber-950/20">
            <div className="max-w-2xl">
              <label className="block text-sm font-medium text-amber-50 mb-2">
                Gemini API Key
              </label>
              <div className="flex gap-2">
                <input
                  type="password"
                  value={tempApiKey}
                  onChange={(e) => setTempApiKey(e.target.value)}
                  placeholder="Paste your Gemini API key"
                  className="field flex-1"
                />
                <button
                  onClick={handleSaveApiKey}
                  className="primary-button px-4 py-2"
                >
                  Save
                </button>
              </div>
              <p className="text-xs text-amber-300 mt-2">
                Get your free key at{' '}
                <a
                  href="https://aistudio.google.com/app/apikey"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-cyan-400 hover:underline"
                >
                  aistudio.google.com
                </a>
              </p>
            </div>
          </div>
        )}
      </header>

      {/* Main Content */}
      <main className="flex-1 px-6 py-8 flex flex-col overflow-hidden">
        {/* Chat Tab */}
        {activeTab === 'chat' && (
          <>
            <div className="glass rounded-2xl p-6 flex-1 scrollbar overflow-y-auto mb-6 min-h-0">
              {messages.length === 0 ? (
                <div className="text-center text-amber-300/60 py-12">
                  <p className="text-lg font-medium mb-2">Start asking questions</p>
                  <p className="text-sm">Try: &ldquo;Show me all patients over 50&rdquo;</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {messages.map((msg, idx) => (
                    <div
                      key={idx}
                      className={`rounded-lg p-4 ${
                        msg.role === 'user'
                          ? 'bg-cyan-500/10 border border-cyan-500/20'
                          : 'bg-amber-500/10 border border-amber-500/20'
                      }`}
                    >
                      <p className="text-xs font-medium mb-2 text-cyan-300">
                        {msg.role === 'user' ? 'You' : 'CLARA'}
                      </p>
                      <p className="text-amber-50 message-copy text-sm break-words">{msg.content}</p>
                    </div>
                  ))}
                  {loading && (
                    <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-4">
                      <p className="text-amber-300 text-sm">Thinking...</p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Input Form */}
            <div className="flex-shrink-0">
              <form onSubmit={handleSubmit} className="flex gap-2">
                <input
                  ref={inputRef}
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Ask about patients, vitals, medications..."
                  className="field flex-1"
                  disabled={loading || !apiKey}
                />
                <button
                  type="submit"
                  disabled={loading || !apiKey}
                  className="primary-button p-3 hover:bg-opacity-90 disabled:opacity-50"
                >
                  <Send size={20} />
                </button>
              </form>

              {!apiKey && (
                <p className="text-red-400 text-sm mt-3">
                  ⚠️ Please enter your Gemini API key in settings above to proceed.
                </p>
              )}
            </div>
          </>
        )}

        {/* Search Tab */}
        {activeTab === 'search' && (
          <div className="max-w-4xl mx-auto w-full">
            <PatientSearch
              onPatientSelected={(patientId) => {
                setSelectedPatient(patientId);
                setActiveTab('profile');
              }}
            />
          </div>
        )}

        {/* Profile Tab */}
        {activeTab === 'profile' && selectedPatient && (
          <div className="max-w-6xl mx-auto w-full">
            <PatientProfile
              patientId={selectedPatient}
              onBack={() => {
                setSelectedPatient(null);
                setActiveTab('search');
              }}
            />
          </div>
        )}
      </main>
    </div>
  );
}
