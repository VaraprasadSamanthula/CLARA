/**
 * API client service for CLARA backend.
 * All endpoints return typed responses or throw errors.
 * Includes JWT authentication support and streaming.
 */

import type {
  PatientListResponse,
  PatientDetailResponse,
  TimelineResponse,
  LabTrendResponse,
  SummaryResponse,
} from '../types';

const API_BASE_URL = (import.meta as any).env.VITE_API_URL || 'http://localhost:8000';
const TOKEN_STORAGE_KEY = 'clara_auth_token';

/**
 * Get stored JWT token from localStorage.
 */
function getStoredToken(): string | null {
  return localStorage.getItem(TOKEN_STORAGE_KEY);
}

/**
 * Fetch wrapper with error handling and JWT authentication.
 */
async function fetchApi<T>(
  endpoint: string,
  options?: RequestInit,
  includeAuth = true
): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  
  if (options?.headers) {
    Object.assign(headers, options.headers);
  }

  // Include JWT token if available and requested
  if (includeAuth) {
    const token = getStoredToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
  }

  try {
    const response = await fetch(url, {
      headers,
      ...options,
    });

    if (response.status === 401) {
      // Token expired or invalid, clear it and redirect to login
      localStorage.removeItem(TOKEN_STORAGE_KEY);
      localStorage.removeItem('clara_auth_email');
      window.location.href = '/login';
    }

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ detail: 'Unknown error' }));
      throw new Error(errorData.detail || `HTTP ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`API Error: ${error.message}`);
    }
    throw new Error('API Error: Unknown error occurred');
  }
}

/**
 * API endpoints object.
 */
export const apiClient = {
  /**
   * POST /auth/login
   */
  async login(email: string, password: string): Promise<{ access_token: string; token_type: string }> {
    const formData = new FormData();
    formData.append('username', email);
    formData.append('password', password);

    const response = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ detail: 'Login failed' }));
      throw new Error(errorData.detail || 'Login failed');
    }

    return await response.json();
  },

  /**
   * GET /auth/verify - Verify token is valid
   */
  async verifyToken(token: string): Promise<{ user_id: string; email: string; role: string }> {
    return fetchApi<{ user_id: string; email: string; role: string }>(
      `/auth/verify?token=${encodeURIComponent(token)}`,
      {},
      false
    );
  },

  /**
   * GET /patients
   */
  async listPatients(skip = 0, limit = 100): Promise<PatientListResponse> {
    return fetchApi(`/api/patients?skip=${skip}&limit=${limit}`);
  },

  /**
   * GET /api/patients/{patient_id}
   */
  async getPatientDetail(patientId: string): Promise<PatientDetailResponse> {
    return fetchApi(`/api/patients/${patientId}`);
  },

  /**
   * GET /api/patients/{patient_id}/timeline
   */
  async getTimeline(
    patientId: string,
    startDate?: string,
    endDate?: string,
    encounterType?: string
  ): Promise<TimelineResponse> {
    const params = new URLSearchParams();
    if (startDate) params.append('start_date', startDate);
    if (endDate) params.append('end_date', endDate);
    if (encounterType) params.append('encounter_type', encounterType);

    const query = params.toString();
    const endpoint = `/api/patients/${patientId}/timeline${query ? `?${query}` : ''}`;
    return fetchApi(endpoint);
  },

  /**
   * GET /api/patients/{patient_id}/labs?test_name={test_name}
   */
  async getLabTrend(patientId: string, testName: string): Promise<LabTrendResponse> {
    return fetchApi(`/api/patients/${patientId}/labs?test_name=${encodeURIComponent(testName)}`);
  },

  /**
   * POST /api/patients/{patient_id}/summary (non-streaming)
   */
  async generateSummary(
    patientId: string,
    maxEncounters = 10,
    focusTest?: string
  ): Promise<SummaryResponse> {
    const payload: Record<string, unknown> = { max_encounters: maxEncounters };
    if (focusTest) {
      payload.focus_test = focusTest;
    }

    return fetchApi(`/api/patients/${patientId}/summary`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  /**
   * POST /api/patients/{patient_id}/summary/stream (streaming)
   * Streams summary chunks via Server-Sent Events
   */
  async generateSummaryStream(
    patientId: string,
    onChunk: (chunk: string) => void,
    onComplete: () => void,
    onError: (error: Error) => void,
    maxEncounters = 10,
    focusTest?: string
  ): Promise<void> {
    try {
      const token = getStoredToken();
      const headers: Record<string, string> = {};
      
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      // Build payload
      const params = new URLSearchParams();
      params.append('max_encounters', String(maxEncounters));
      if (focusTest) {
        params.append('focus_test', focusTest);
      }

      const url = `${API_BASE_URL}/api/patients/${patientId}/summary/stream`;

      const response = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          max_encounters: maxEncounters,
          focus_test: focusTest,
        }),
      });

      if (response.status === 401) {
        localStorage.removeItem(TOKEN_STORAGE_KEY);
        localStorage.removeItem('clara_auth_email');
        window.location.href = '/login';
        return;
      }

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      if (!response.body) {
        throw new Error('No response body');
      }

      // Read the response as a stream
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();

        if (done) {
          // Process any remaining buffer
          if (buffer.trim()) {
            const lines = buffer.split('\n');
            for (const line of lines) {
              if (line.startsWith('data: ')) {
                const data = line.substring(6);
                if (data === '[DONE]') {
                  onComplete();
                } else if (data.startsWith('[ERROR:')) {
                  const errorMsg = data.substring(7, data.length - 1);
                  onError(new Error(errorMsg));
                } else if (data) {
                  onChunk(data);
                }
              }
            }
          }
          break;
        }

        buffer += decoder.decode(value, { stream: true });

        // Process complete lines
        const lines = buffer.split('\n');
        buffer = lines[lines.length - 1]; // Keep incomplete line in buffer

        for (let i = 0; i < lines.length - 1; i++) {
          const line = lines[i];
          if (line.startsWith('data: ')) {
            const data = line.substring(6);
            if (data === '[DONE]') {
              onComplete();
            } else if (data.startsWith('[ERROR:')) {
              const errorMsg = data.substring(7, data.length - 1);
              onError(new Error(errorMsg));
            } else if (data) {
              onChunk(data);
            }
          }
        }
      }
    } catch (error) {
      if (error instanceof Error) {
        onError(error);
      } else {
        onError(new Error('Unknown streaming error'));
      }
    }
  },

  /**
   * GET /health
   */
  async healthCheck() {
    return fetchApi('/health', {}, false);
  },
};
