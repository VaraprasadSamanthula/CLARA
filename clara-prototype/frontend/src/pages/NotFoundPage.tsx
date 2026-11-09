/**
 * NotFoundPage: 404 error page.
 */

import { useNavigate } from 'react-router-dom';
import { Header } from '../components/Header';

export function NotFoundPage() {
  const navigate = useNavigate();

  return (
    <div>
      <Header />

      <div className="container page" style={{ textAlign: 'center', paddingTop: '60px' }}>
        <h1 style={{ fontSize: '48px', marginBottom: '20px' }}>404</h1>
        <p style={{ fontSize: '18px', color: '#666', marginBottom: '30px' }}>Page not found</p>
        
        <button
          onClick={() => navigate('/')}
          style={{
            padding: '10px 20px',
            backgroundColor: '#007bff',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '16px',
          }}
        >
          Go Home
        </button>
      </div>
    </div>
  );
}
