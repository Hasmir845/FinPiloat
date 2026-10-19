import { useState, useEffect, useCallback } from 'react';
import { apiClient, ApiError } from '../services/api';
import { HealthCheckResponse } from '../types';

export interface UseHealthCheckResult {
  health: HealthCheckResponse | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useHealthCheck(): UseHealthCheckResult {
  const [health, setHealth] = useState<HealthCheckResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchHealth = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiClient.getHealth();
      setHealth(data);
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        setError(err.message || 'Unable to connect to FinPilot API server.');
      } else if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Unknown connection error.');
      }
      setHealth(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchHealth();
  }, [fetchHealth]);

  return { health, loading, error, refetch: fetchHealth };
}
