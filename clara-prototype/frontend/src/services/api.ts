/**
 * API client service for CLARA backend.
 * All endpoints return typed responses or throw errors.
 */

import type {
  PatientListResponse,
  PatientDetailResponse,
  TimelineResponse,
  LabTrendResponse,
  SummaryResponse,
} from '../types';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

/**
 * Fetch wrapper with error handling.
 */
async function fetchApi<T>(
  endpoint: string,
  options?: RequestInit
): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;

  try {
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
      ...options,
    });

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
   * GET /api/patients
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
   * POST /api/patients/{patient_id}/summary
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
   * GET /health
   */
  async healthCheck() {
    return fetchApi('/health');
  },
};
