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
        credentials: 'include',
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
    <div style={{ 
      minHeight: '100vh', 
      display: 'flex',
      background: 'var(--background)'
    }}>
      {/* Left Hero Section */}
      <div style={{ 
        flex: '1.2',
        display: 'flex', 
        flexDirection: 'column', 
        justifyContent: 'space-between', 
        padding: '60px 50px',
        background: 'linear-gradient(135deg, var(--primary-50) 0%, var(--background) 100%)',
        borderRight: '1px solid var(--border)',
        minWidth: '0'
      }}>
        {/* Top Section */}
        <div>
          {/* Logo */}
          <div style={{ marginBottom: '60px' }}>
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '15px',
              marginBottom: '30px'
            }}>
              <div style={{
                width: 50,
                height: 50,
                background: 'var(--primary)',
                borderRadius: '12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white',
                fontWeight: 700,
                fontSize: '24px'
              }}>
                C
              </div>
              <div>
                <h1 style={{ 
                  fontSize: '28px', 
                  fontWeight: 700, 
                  color: 'var(--primary)',
                  margin: 0,
                  lineHeight: 1.2
                }}>
                  CLARA
                </h1>
                <p style={{ 
                  fontSize: '14px', 
                  color: 'var(--text-secondary)',
                  margin: '4px 0 0 0',
                  fontWeight: 500
                }}>
                  Clinical Research Assistant
                </p>
              </div>
            </div>
          </div>

          {/* Hero Content */}
          <div style={{ marginBottom: '50px' }}>
            <h2 style={{ 
              fontSize: '32px', 
              fontWeight: 700, 
              color: 'var(--text-primary)',
              marginBottom: '20px',
              lineHeight: 1.3
            }}>
              Intelligent Clinical Data Access
            </h2>
            
            <p style={{ 
              fontSize: '16px', 
              color: 'var(--text-secondary)',
              marginBottom: '30px',
              lineHeight: 1.7,
              maxWidth: '450px'
            }}>
              CLARA helps medical researchers understand patient data through natural language queries. Query the MIMIC-IV clinical database, manage patient records, and access clinical information securely.
            </p>

            {/* Key Features */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                <div style={{ 
                  fontSize: '20px', 
                  marginTop: '2px',
                  color: 'var(--primary)'
                }}>
                  📊
                </div>
                <div>
                  <p style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>
                    MIMIC-IV Database
                  </p>
                  <p style={{ fontSize: '14px', color: 'var(--text-secondary)', margin: '4px 0 0 0' }}>
                    Access 100+ patients with complete clinical history
                  </p>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                <div style={{ 
                  fontSize: '20px', 
                  marginTop: '2px',
                  color: 'var(--primary)'
                }}>
                  🔍
                </div>
                <div>
                  <p style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>
                    Natural Language Queries
                  </p>
                  <p style={{ fontSize: '14px', color: 'var(--text-secondary)', margin: '4px 0 0 0' }}>
                    Ask questions about medications, labs, diagnoses, and more
                  </p>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                <div style={{ 
                  fontSize: '20px', 
                  marginTop: '2px',
                  color: 'var(--primary)'
                }}>
                  🔐
                </div>
                <div>
                  <p style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>
                    Secure & Audit-Ready
                  </p>
                  <p style={{ fontSize: '14px', color: 'var(--text-secondary)', margin: '4px 0 0 0' }}>
                    Built for clinical research with session authentication
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Section */}
        <div style={{ 
          padding: '24px',
          background: 'rgba(13, 95, 110, 0.05)',
          borderRadius: '12px',
          borderLeft: '4px solid var(--primary)'
        }}>
          <p style={{ 
            fontSize: '13px', 
            color: 'var(--text-secondary)',
            margin: 0,
            lineHeight: 1.6
          }}>
            <strong style={{ color: 'var(--primary)' }}>Demo Environment:</strong> This is a UROP research environment using synthetic MIMIC-IV clinical data. All functionality is read-only for demonstration purposes.
          </p>
        </div>
      </div>

      {/* Right Login Section */}
      <div style={{ 
        flex: '1',
        display: 'flex', 
        flexDirection: 'column', 
        justifyContent: 'center', 
        padding: '60px 50px',
        background: 'var(--surface)',
        minWidth: '0'
      }}>
        <div style={{ maxWidth: '420px', width: '100%' }}>
          <h2 style={{ 
            fontSize: '28px', 
            fontWeight: 700, 
            marginBottom: '12px', 
            color: 'var(--text-primary)'
          }}>
            Sign In
          </h2>
          <p style={{ 
            fontSize: '15px',
            color: 'var(--text-secondary)',
            marginBottom: '40px'
          }}>
            Enter your credentials to access CLARA
          </p>
          
          {error && (
            <div style={{
              background: '#fef2f2',
              border: '1px solid #fecaca',
              borderRadius: 'var(--radius-lg)',
              padding: '16px',
              marginBottom: '24px',
              color: '#dc2626',
              fontSize: '15px'
            }}>
              {error}
            </div>
          )}

          <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <div>
              <label style={{ 
                display: 'block',
                fontSize: '15px',
                fontWeight: 600, 
                color: 'var(--text-primary)',
                marginBottom: '8px'
              }}>
                Email Address
              </label>
              <input
                type="email"
                value={email}
                disabled
                className="form-input"
                style={{ 
                  opacity: 0.75,
                  fontSize: '15px',
                  padding: '12px 16px'
                }}
              />
              <p style={{ 
                fontSize: '13px', 
                color: 'var(--text-tertiary)', 
                margin: '6px 0 0 0'
              }}>
                Demo account (read-only)
              </p>
            </div>

            <div>
              <label style={{ 
                display: 'block',
                fontSize: '15px',
                fontWeight: 600, 
                color: 'var(--text-primary)',
                marginBottom: '8px'
              }}>
                Password
              </label>
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
                style={{ 
                  fontSize: '15px',
                  padding: '12px 16px'
                }}
              />
              <p style={{ 
                fontSize: '13px', 
                color: 'var(--text-tertiary)',
                margin: '6px 0 0 0'
              }}>
                Demo password: <code style={{ 
                  background: 'var(--background-secondary)', 
                  padding: '2px 8px', 
                  borderRadius: 'var(--radius-md)', 
                  fontFamily: 'monospace', 
                  fontWeight: 600,
                  fontSize: '13px'
                }}>
                  demo123
                </code>
              </p>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn btn-primary"
              style={{ marginTop: '12px', fontSize: '16px', padding: '14px 24px' }}
            >
              {loading ? (
                <>
                  <Loader size={20} className="loading" />
                  Signing in...
                </>
              ) : (
                <>
                  <LogIn size={20} />
                  Sign In
                </>
              )}
            </button>
          </form>

          {/* Demo Credentials Card */}
          <div style={{
            marginTop: '40px',
            padding: '20px',
            background: 'var(--primary-50)',
            border: '1px solid var(--primary-200)',
            borderRadius: 'var(--radius-lg)',
            fontSize: '14px',
            color: 'var(--text-secondary)'
          }}>
            <p style={{ 
              fontWeight: 600, 
              marginBottom: '12px', 
              color: 'var(--text-primary)',
              fontSize: '15px'
            }}>
              Demo Credentials
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div>
                <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>Email:</span>
                <br />
                <code style={{ fontFamily: 'monospace', fontSize: '14px' }}>doctor@hospital.com</code>
              </div>
              <div>
                <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>Password:</span>
                <br />
                <code style={{ fontFamily: 'monospace', fontSize: '14px' }}>demo123</code>
              </div>
            </div>
            <p style={{ 
              marginTop: '12px', 
              fontSize: '12px', 
              color: 'var(--text-tertiary)',
              margin: '12px 0 0 0'
            }}>
              🔒 All data is secured for research demonstration purposes.
            </p>
          </div>
        </div>
      </div>

      {/* Mobile/Tablet Responsive */}
      <style>{`
        @media (max-width: 1024px) {
          div:has(> div:first-child) {
            flex-direction: column !important;
          }
        }
      `}</style>
    </div>
  );
}
