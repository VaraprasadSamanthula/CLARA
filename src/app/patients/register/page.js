'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function RegisterPatientPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    full_name: '',
    date_of_birth: '',
    gender: '',
    phone: '',
    email: '',
    address: ''
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [duplicateWarning, setDuplicateWarning] = useState('');

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setDuplicateWarning('');
    setLoading(true);

    try {
      if (!formData.full_name.trim()) {
        setError('Patient name is required');
        setLoading(false);
        return;
      }

      if (formData.date_of_birth && !/^\d{4}-\d{2}-\d{2}$/.test(formData.date_of_birth)) {
        setError('Date of birth must be in YYYY-MM-DD format');
        setLoading(false);
        return;
      }

      if (formData.gender && !['M', 'F', 'Other'].includes(formData.gender)) {
        setError('Please select a valid gender');
        setLoading(false);
        return;
      }

      const response = await fetch('/api/patients/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          full_name: formData.full_name.trim(),
          date_of_birth: formData.date_of_birth || null,
          gender: formData.gender || null,
          phone: formData.phone || null,
          email: formData.email || null,
          address: formData.address || null
        })
      });

      const result = await response.json();

      if (!response.ok) {
        if (response.status === 409 && result.existing_patient_id) {
          setDuplicateWarning(
            `A patient with this name and date of birth already exists (ID: ${result.existing_patient_id}). ` +
            'Please verify or contact an administrator.'
          );
        } else {
          setError(result.error || 'Failed to register patient');
        }
        setLoading(false);
        return;
      }

      setSuccess(`✓ Patient registered successfully! ID: ${result.patient_id}`);
      
      setFormData({
        full_name: '',
        date_of_birth: '',
        gender: '',
        phone: '',
        email: '',
        address: ''
      });

      setTimeout(() => {
        router.push(`/patients/${result.patient_id}`);
      }, 1500);

    } catch (err) {
      setError(err.message || 'An error occurred while registering the patient');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-800 mb-2">Patient Management</h1>
          <p className="text-gray-600">Register new patients and manage patient information</p>
        </div>

        <div className="flex gap-2 mb-8 border-b border-gray-300">
          <a href="/patients/register" className="px-4 py-3 font-medium text-blue-600 border-b-2 border-blue-600 hover:bg-blue-50">
            Manual Registration
          </a>
          <a href="/patients/import" className="px-4 py-3 font-medium text-gray-600 hover:text-gray-800 hover:bg-gray-50">
            Bulk Import (CSV/Excel)
          </a>
          <a href="/patients/search" className="px-4 py-3 font-medium text-gray-600 hover:text-gray-800 hover:bg-gray-50">
            Search Patients
          </a>
        </div>

        <div className="max-w-2xl mx-auto p-6 bg-white rounded-lg shadow-md">
          <h2 className="text-2xl font-bold mb-6 text-gray-800">Register New Patient</h2>

          {error && <div className="mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded">{error}</div>}
          {duplicateWarning && <div className="mb-4 p-4 bg-yellow-100 border border-yellow-400 text-yellow-800 rounded">⚠ {duplicateWarning}</div>}
          {success && <div className="mb-4 p-4 bg-green-100 border border-green-400 text-green-700 rounded">{success}</div>}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="full_name" className="block text-sm font-medium text-gray-700 mb-1">
                Patient Name <span className="text-red-500">*</span>
              </label>
              <input type="text" id="full_name" name="full_name" value={formData.full_name} onChange={handleChange} placeholder="John Doe" className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent" required disabled={loading} />
            </div>

            <div>
              <label htmlFor="date_of_birth" className="block text-sm font-medium text-gray-700 mb-1">Date of Birth (YYYY-MM-DD)</label>
              <input type="date" id="date_of_birth" name="date_of_birth" value={formData.date_of_birth} onChange={handleChange} className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent" disabled={loading} />
            </div>

            <div>
              <label htmlFor="gender" className="block text-sm font-medium text-gray-700 mb-1">Gender</label>
              <select id="gender" name="gender" value={formData.gender} onChange={handleChange} className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent" disabled={loading}>
                <option value="">Select Gender</option>
                <option value="M">Male</option>
                <option value="F">Female</option>
                <option value="Other">Other</option>
              </select>
            </div>

            <div>
              <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
              <input type="tel" id="phone" name="phone" value={formData.phone} onChange={handleChange} placeholder="(555) 123-4567" className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent" disabled={loading} />
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
              <input type="email" id="email" name="email" value={formData.email} onChange={handleChange} placeholder="patient@example.com" className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent" disabled={loading} />
            </div>

            <div>
              <label htmlFor="address" className="block text-sm font-medium text-gray-700 mb-1">Address</label>
              <textarea id="address" name="address" value={formData.address} onChange={handleChange} placeholder="123 Main St, Anytown, ST 12345" rows="3" className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent" disabled={loading}></textarea>
            </div>

            <div className="flex gap-3 pt-4">
              <button type="submit" disabled={loading} className={`flex-1 px-4 py-2 rounded-md font-medium transition-colors ${loading ? 'bg-gray-400 text-gray-700 cursor-not-allowed' : 'bg-blue-600 text-white hover:bg-blue-700'}`}>
                {loading ? 'Registering...' : 'Register Patient'}
              </button>
              <button type="button" disabled={loading} onClick={() => { setFormData({ full_name: '', date_of_birth: '', gender: '', phone: '', email: '', address: '' }); setError(''); setSuccess(''); setDuplicateWarning(''); }} className={`px-4 py-2 border rounded-md font-medium transition-colors ${loading ? 'border-gray-300 text-gray-500 cursor-not-allowed' : 'border-gray-300 text-gray-700 hover:bg-gray-100'}`}>
                Clear
              </button>
            </div>
          </form>

          <div className="mt-6 p-4 bg-blue-50 rounded-md border border-blue-200">
            <h3 className="font-semibold text-gray-800 mb-2">About Patient Registration</h3>
            <ul className="text-sm text-gray-700 space-y-1">
              <li>• Patient name is required; all other fields are optional</li>
              <li>• Date of birth helps prevent duplicate registrations</li>
              <li>• Each patient receives a unique ID for document uploads</li>
              <li>• You can import multiple patients via CSV/Excel in Phase 2</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
