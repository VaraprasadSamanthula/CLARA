"use client";
import { useState } from 'react';
import { Search, AlertCircle, Loader } from 'lucide-react';

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
    <div className="patient-search">
      <h2 className="text-xl font-semibold mb-4 text-amber-50">Patient Search</h2>

      <form onSubmit={handleSearch} className="space-y-4 mb-6">
        {/* Search Type Selector */}
        <div>
          <label className="block text-sm font-medium mb-2 text-amber-50">Search Type</label>
          <select
            value={searchType}
            onChange={(e) => {
              setSearchType(e.target.value);
              setResult(null);
              setError(null);
            }}
            className="field w-full"
          >
            <option value="id">Patient ID</option>
            <option value="phone" disabled title="Phone search not yet available">
              Phone Number (Not Available)
            </option>
          </select>
        </div>

        {/* Search Input */}
        <div>
          <label className="block text-sm font-medium mb-2 text-amber-50">
            {searchType === 'id' ? 'Patient ID' : 'Phone Number'}
          </label>
          <div className="flex gap-2">
            <input
              type={searchType === 'id' ? 'number' : 'tel'}
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
              placeholder={searchType === 'id' ? 'Enter patient ID' : 'Enter phone number'}
              className="field flex-1"
              disabled={loading}
              min={searchType === 'id' ? '1' : undefined}
            />
            <button
              type="submit"
              disabled={!searchValue.trim() || loading}
              className="primary-button px-4 py-2 flex items-center gap-2 hover:bg-opacity-90 disabled:opacity-50"
            >
              {loading ? <Loader size={18} className="animate-spin" /> : <Search size={18} />}
              Search
            </button>
          </div>
        </div>
      </form>

      {/* Error Message */}
      {error && (
        <div className="p-3 bg-red-500/10 border border-red-500/30 rounded mb-4">
          <div className="flex items-start gap-2">
            <AlertCircle size={18} className="text-red-400 flex-shrink-0 mt-0.5" />
            <p className="text-red-400 text-sm">{error}</p>
          </div>
        </div>
      )}

      {/* Search Results */}
      {result && (
        <div className="p-4 bg-cyan-500/10 border border-cyan-500/20 rounded mb-4">
          <div className="space-y-2 mb-4">
            <p className="text-amber-50">
              <span className="font-medium">Patient ID:</span> {result.id}
            </p>
            <p className="text-amber-50">
              <span className="font-medium">Gender:</span> {result.gender}
            </p>
            <p className="text-amber-50">
              <span className="font-medium">Age:</span> {result.age}
            </p>
            {result.yearGroup && (
              <p className="text-amber-50">
                <span className="font-medium">Year Group:</span> {result.yearGroup}
              </p>
            )}
            {result.dateOfDeath && (
              <p className="text-amber-200">
                <span className="font-medium">Date of Death:</span> {result.dateOfDeath}
              </p>
            )}
          </div>
          <button
            onClick={handleSelectPatient}
            className="primary-button w-full py-2"
          >
            View Patient Profile
          </button>
        </div>
      )}
    </div>
  );
}
