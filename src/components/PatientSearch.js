"use client";
import { useState } from 'react';
import { Search, AlertCircle, Loader, Users } from 'lucide-react';

export default function PatientSearch({ onPatientSelected }) {
  const [searchType, setSearchType] = useState('id');
  const [searchValue, setSearchValue] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const handleSearch = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch(
        `/api/patients/search?type=${searchType}&value=${encodeURIComponent(searchValue)}`,
        { credentials: 'include' }
      );
      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Search failed');
        return;
      }

      if (data.found) {
        setResult(data.patient);
      } else {
        setError(data.message || `No patient found matching ${searchType}: ${searchValue}`);
      }
    } catch (err) {
      setError(err.message || 'An error occurred during search');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectPatient = () => {
    if (result && onPatientSelected) {
      onPatientSelected(result.id);
    }
  };

  return (
    <div style={{ maxWidth: '700px', margin: '0 auto' }}>
      <div className="card">
        <div className="card-header">
          <h2 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-md)' }}>
            <Users size={24} />
            Patient Search
          </h2>
          <p className="card-subtitle">Find a patient by ID, phone number, or name</p>
        </div>

        <div className="card-body">
          <form onSubmit={handleSearch} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-lg)' }}>
            {/* Search Type Selector */}
            <div className="form-group">
              <label className="form-label">Search By</label>
              <select
                value={searchType}
                onChange={(e) => {
                  setSearchType(e.target.value);
                  setResult(null);
                  setError(null);
                }}
                className="form-select"
              >
                <option value="id">Patient ID</option>
                <option value="phone">Phone Number</option>
                <option value="name">Patient Name</option>
              </select>
            </div>

            {/* Search Input */}
            <div className="form-group">
              <label className="form-label">
                {searchType === 'id' ? 'Patient ID' : searchType === 'phone' ? 'Phone Number' : 'Patient Name'}
              </label>
              <div style={{ display: 'flex', gap: 'var(--spacing-sm)' }}>
                <input
                  type={searchType === 'id' ? 'number' : 'text'}
                  value={searchValue}
                  onChange={(e) => setSearchValue(e.target.value)}
                  placeholder={searchType === 'id' ? 'Enter patient ID' : searchType === 'phone' ? 'Enter phone number' : 'Enter patient name'}
                  className="form-input"
                  disabled={loading}
                  min={searchType === 'id' ? '1' : undefined}
                  style={{ flex: 1 }}
                />
                <button
                  type="submit"
                  disabled={!searchValue.trim() || loading}
                  className="btn btn-primary"
                  style={{ whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)' }}
                >
                  {loading ? <Loader size={18} style={{ animation: 'spin 1s linear infinite' }} /> : <Search size={18} />}
                  Search
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div style={{
          padding: 'var(--spacing-md)',
          background: '#fef2f2',
          border: '1px solid var(--error)',
          borderRadius: 'var(--radius-lg)',
          marginTop: 'var(--spacing-lg)',
          display: 'flex',
          gap: 'var(--spacing-sm)',
        }}>
          <AlertCircle size={18} style={{ color: 'var(--error)', flexShrink: 0, marginTop: '2px' }} />
          <p style={{ color: 'var(--error)', fontSize: '0.875rem' }}>{error}</p>
        </div>
      )}

      {/* Search Results */}
      {result && (
        <div className="card" style={{ marginTop: 'var(--spacing-lg)', background: 'var(--primary-50)', borderColor: 'var(--primary-200)' }}>
          <div className="card-header">
            <h3 className="card-title">Patient Found</h3>
          </div>
          <div className="card-body">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--spacing-lg)', marginBottom: 'var(--spacing-lg)' }}>
              <div>
                <p style={{ fontSize: '0.875rem', color: 'var(--text-tertiary)', marginBottom: 'var(--spacing-xs)' }}>Patient ID</p>
                <p style={{ fontSize: '1.125rem', fontWeight: 600, color: 'var(--primary)' }}>{result.id}</p>
              </div>
              <div>
                <p style={{ fontSize: '0.875rem', color: 'var(--text-tertiary)', marginBottom: 'var(--spacing-xs)' }}>Gender</p>
                <p style={{ fontSize: '1rem', color: 'var(--text-primary)' }}>{result.gender}</p>
              </div>
              <div>
                <p style={{ fontSize: '0.875rem', color: 'var(--text-tertiary)', marginBottom: 'var(--spacing-xs)' }}>Age</p>
                <p style={{ fontSize: '1rem', color: 'var(--text-primary)' }}>{result.age} years</p>
              </div>
              {result.yearGroup && (
                <div>
                  <p style={{ fontSize: '0.875rem', color: 'var(--text-tertiary)', marginBottom: 'var(--spacing-xs)' }}>Year Group</p>
                  <p style={{ fontSize: '1rem', color: 'var(--text-primary)' }}>{result.yearGroup}</p>
                </div>
              )}
              {result.dateOfDeath && (
                <div style={{ gridColumn: '1 / -1' }}>
                  <p style={{ fontSize: '0.875rem', color: 'var(--text-tertiary)', marginBottom: 'var(--spacing-xs)' }}>Status</p>
                  <div className="badge badge-warning">Deceased: {result.dateOfDeath}</div>
                </div>
              )}
            </div>
            <button
              onClick={handleSelectPatient}
              className="btn btn-primary"
              style={{ width: '100%' }}
            >
              View Patient Profile
            </button>
          </div>
        </div>
      )}

      {/* Empty State */}
      {!result && !error && !loading && (
        <div className="empty-state" style={{ marginTop: 'var(--spacing-2xl)' }}>
          <Users size={48} />
          <h3>Start Searching</h3>
          <p>Enter patient information to find and view clinical records</p>
        </div>
      )}
    </div>
  );
}
