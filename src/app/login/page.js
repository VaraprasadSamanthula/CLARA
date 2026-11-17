"use client";
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Loader, LogIn } from 'lucide-react';

export default function Login() {
  const [email] = useState('doctor@hospital.com');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [mounted, setMounted] = useState(false);
  const router = useRouter();

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return null;
  }

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    
    if (!password) {
      setError('Please enter your password');
      setLoading(false);
      return;
    }
    
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Login failed');
        setLoading(false);
        return;
      }

      if (data.success && data.user) {
        console.log('[LOGIN] Session established (HttpOnly cookie set by server)');
        router.push('/dashboard');
      } else {
        setError(data.error || 'Login failed');
        setLoading(false);
      }
    } catch (err) {
      setError(err.message || 'Network error during login');
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'grid', gridTemplateColumns: '1fr 1fr', background: 'var(--background)' }}>
      {/* Hero Section */}
      <div style={{ 
        display: 'flex', 
        flexDirection: 'column', 
        justifyContent: 'space-between', 
        padding: 'var(--spacing-2xl)',
        background: 'linear-gradient(135deg, var(--primary-50) 0%, var(--background) 100%)',
        borderRight: '1px solid var(--border)'
      }}>
        <div>
          <h1 style={{ fontSize: '2.5rem', fontWeight: 700, color: 'var(--primary)', marginBottom: 'var(--spacing-md)' }}>CLARA</h1>
          <p style={{ fontSize: '1.125rem', color: 'var(--text-secondary)', fontWeight: 500 }}>Clinical LLM-Augmented Research Assistant</p>
        </div>
        
        <div style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', lineHeight: '1.6' }}>
          <p style={{ marginBottom: 'var(--spacing-lg)' }}>CLARA is a medical research assistant that helps clinicians understand patient data through natural language queries.</p>
          <ul style={{ paddingLeft: 'var(--spacing-lg)', marginBottom: 'var(--spacing-lg)' }}>
            <li style={{ marginBottom: 'var(--spacing-sm)' }}>📊 Query MIMIC-IV clinical database</li>
            <li style={{ marginBottom: 'var(--spacing-sm)' }}>🔍 AI-powered data retrieval</li>
            <li style={{ marginBottom: 'var(--spacing-sm)' }}>📋 Patient management & documents</li>
            <li>🔐 Secure, audit-ready access</li>
          </ul>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-tertiary)' }}>Demo environment with synthetic MIMIC-IV clinical data.</p>
        </div>
      </div>

      {/* Login Section */}
      <div style={{ 
        display: 'flex', 
        flexDirection: 'column', 
        justifyContent: 'center', 
        padding: 'var(--spacing-2xl)',
        background: 'var(--surface)'
      }}>
        <div style={{ maxWidth: '380px', margin: '0 auto', width: '100%' }}>
          <h2 style={{ fontSize: '1.75rem', fontWeight: 700, marginBottom: 'var(--spacing-lg)', color: 'var(--text-primary)' }}>Sign In</h2>
          
          {error && (
            <div style={{
              background: '#fef2f2',
              border: '1px solid #fecaca',
              borderRadius: 'var(--radius-lg)',
              padding: 'var(--spacing-md)',
              marginBottom: 'var(--spacing-lg)',
              color: '#dc2626',
              fontSize: '0.875rem'
            }}>
              {error}
            </div>
          )}

          <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-lg)' }}>
            <div>
              <label className="form-label">Email Address</label>
              <input
                type="email"
                value={email}
                disabled
                className="form-input"
                style={{ opacity: 0.75 }}
              />
              <p className="form-hint">Demo account (read-only)</p>
            </div>

            <div>
              <label className="form-label">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setError('');
                }}
                placeholder="Enter password"
                className="form-input"
                autoFocus
              />
              <p className="form-hint">Demo password: <span style={{ background: 'var(--background-secondary)', padding: '0.25rem 0.5rem', borderRadius: 'var(--radius-md)', fontFamily: 'monospace', fontWeight: 600 }}>demo123</span></p>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn btn-primary"
              style={{ marginTop: 'var(--spacing-md)' }}
            >
              {loading ? (
                <>
                  <Loader size={18} className="loading" />
                  Signing in...
                </>
              ) : (
                <>
                  <LogIn size={18} />
                  Sign In
                </>
              )}
            </button>
          </form>

          <div style={{
            marginTop: 'var(--spacing-2xl)',
            padding: 'var(--spacing-lg)',
            background: 'var(--background-secondary)',
            borderRadius: 'var(--radius-lg)',
            fontSize: '0.85rem',
            color: 'var(--text-secondary)',
            lineHeight: '1.6'
          }}>
            <p style={{ fontWeight: 600, marginBottom: 'var(--spacing-sm)', color: 'var(--text-primary)' }}>Demo Credentials</p>
            <p><strong>Email:</strong> doctor@hospital.com</p>
            <p><strong>Password:</strong> demo123</p>
            <p style={{ marginTop: 'var(--spacing-md)', fontSize: '0.8rem', color: 'var(--text-tertiary)' }}>🔒 All data is secured and audit-ready for research purposes.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
