"use client";
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Loader } from 'lucide-react';

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
    return null; // Prevent hydration mismatch
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
      // Call backend login API
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
        // Session cookie is already set by Set-Cookie header from server
        // Do NOT set cookies in JavaScript - they're HttpOnly and server-managed
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
    <div className="login-shell">
      {/* Hero Section */}
      <div className="login-hero">
        <div>
          <h1 className="font-display text-5xl font-bold text-amber-50 mb-2">CLARA</h1>
          <p className="text-lg text-amber-100">Clinical Data Assistant</p>
        </div>
        <div className="text-amber-100 text-sm leading-relaxed max-width-lg">
          <p className="mb-4">Ask natural-language questions about your demo EHR. CLARA translates them to SQL, executes securely, and shows results.</p>
          <p className="text-xs text-amber-200">Demo environment with synthetic MIMIC-IV clinical data.</p>
        </div>
      </div>

      {/* Login Form Section */}
      <div className="login-content">
        <div className="mb-4 p-3 bg-cyan-500/10 border border-cyan-500/30 rounded">
          <p className="text-sm text-cyan-300">
            🔐 <strong>Secure Login Required</strong><br/>
            Credentials protect patient data access
          </p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          {/* Email Field */}
          <div>
            <label className="block text-sm font-medium mb-2 text-amber-50">Email</label>
            <input
              type="email"
              value={email}
              disabled
              className="field opacity-75"
            />
            <p className="text-xs text-amber-300 mt-1">Demo account (read-only)</p>
          </div>

          {/* Password Field */}
          <div>
            <label className="block text-sm font-medium mb-2 text-amber-50">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                setError('');
              }}
              placeholder="Enter password"
              className="field"
              autoFocus
            />
            <p className="text-xs text-amber-300 mt-1">Demo password: <code className="bg-amber-950/50 px-2 py-1 rounded">demo123</code></p>
          </div>

          {/* Error */}
          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/30 rounded">
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}

          {/* Submit Button */}
          <button 
            type="submit" 
            disabled={loading}
            className="primary-button w-full py-2.5 mt-6 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <Loader size={18} className="animate-spin" />
                Signing in...
              </>
            ) : (
              'Sign In'
            )}
          </button>
        </form>

        {/* Security Note */}
        <div className="mt-6 p-3 bg-amber-950/30 border border-amber-700/30 rounded text-center">
          <p className="text-xs text-amber-200">
            ✓ Secure login required for HIPAA compliance<br/>
            ✓ No credentials sent to external servers<br/>
            ✓ Session expires after 24 hours
          </p>
        </div>
      </div>
    </div>
  );
}
