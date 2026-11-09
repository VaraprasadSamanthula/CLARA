/**
 * LoginPage: Handles user authentication.
 * Displays login form and manages login flow.
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ErrorBox } from '../components/ErrorBox';

export function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const navigate = useNavigate();
  const { login, error, clearError } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    clearError();

    try {
      await login(email, password);
      navigate('/');
    } catch {
      // Error is handled by AuthContext and displayed via error state
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="container page" style={{ maxWidth: '400px', margin: '50px auto' }}>
      <div style={{ textAlign: 'center', marginBottom: '30px' }}>
        <h1>CLARA</h1>
        <p style={{ color: '#666' }}>Clinical Longitudinal Analysis and Retrieval Assistant</p>
      </div>

      {error && (
        <div style={{ marginBottom: '20px' }}>
          <ErrorBox error={error} />
        </div>
      )}

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
        <div>
          <label htmlFor="email" style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
            Email
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="doctor@clara.local"
            required
            disabled={isSubmitting}
            style={{
              width: '100%',
              padding: '10px',
              border: '1px solid #ccc',
              borderRadius: '4px',
              fontSize: '14px',
              boxSizing: 'border-box',
            }}
          />
        </div>

        <div>
          <label htmlFor="password" style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
            Password
          </label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            required
            disabled={isSubmitting}
            style={{
              width: '100%',
              padding: '10px',
              border: '1px solid #ccc',
              borderRadius: '4px',
              fontSize: '14px',
              boxSizing: 'border-box',
            }}
          />
        </div>

        <button
          type="submit"
          disabled={isSubmitting || !email || !password}
          style={{
            padding: '10px',
            backgroundColor: isSubmitting || !email || !password ? '#ccc' : '#007bff',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            fontSize: '14px',
            fontWeight: 'bold',
            cursor: isSubmitting || !email || !password ? 'not-allowed' : 'pointer',
          }}
        >
          {isSubmitting ? 'Signing in...' : 'Sign In'}
        </button>
      </form>

      <div style={{ marginTop: '20px', padding: '15px', backgroundColor: '#f5f5f5', borderRadius: '4px' }}>
        <p style={{ margin: '0 0 10px 0', fontSize: '12px', fontWeight: 'bold' }}>Demo Credentials:</p>
        <p style={{ margin: '5px 0', fontSize: '12px' }}>Email: <code>doctor@clara.local</code></p>
        <p style={{ margin: '5px 0', fontSize: '12px' }}>Password: <code>demo123</code></p>
      </div>
    </div>
  );
}
