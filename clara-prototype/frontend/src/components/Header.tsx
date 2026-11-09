/**
 * Header component with logout button.
 */

import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

interface HeaderProps {
  title?: string;
  subtitle?: string;
}

export function Header({ title = 'CLARA Prototype 1', subtitle = 'Clinical Longitudinal Analysis and Retrieval Assistant' }: HeaderProps) {
  const navigate = useNavigate();
  const { email, logout, isAuthenticated } = useAuth();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="header">
      <div className="container" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1>{title}</h1>
          <p>{subtitle}</p>
        </div>
        {isAuthenticated && (
          <div style={{ textAlign: 'right' }}>
            <p style={{ margin: '0 0 10px 0', fontSize: '14px', color: '#666' }}>{email}</p>
            <button
              onClick={handleLogout}
              style={{
                padding: '8px 16px',
                backgroundColor: '#dc3545',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                fontSize: '14px',
                cursor: 'pointer',
              }}
            >
              Logout
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
