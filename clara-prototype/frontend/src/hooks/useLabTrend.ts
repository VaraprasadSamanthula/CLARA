/**
 * Custom hook for fetching lab trend data.
 */

import { useState, useEffect } from 'react';
import type { LabTrendResponse } from '../types';
import { apiClient } from '../services/api';

interface UseLabTrendReturn {
  data: LabTrendResponse | null;
  loading: boolean;
  error: string | null;
}

export function useLabTrendData(
  patientId: string | null,
  testName: string
): UseLabTrendReturn {
  const [data, setData] = useState<LabTrendResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!patientId) {
      setData(null);
      setError(null);
      return;
    }

    async function fetchData() {
      try {
        setLoading(true);
        setError(null);
        const response = await apiClient.getLabTrend(patientId, testName);
        setData(response);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch lab data');
        setData(null);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [patientId, testName]);

  return { data, loading, error };
}
