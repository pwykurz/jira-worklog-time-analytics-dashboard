import { useCallback, useEffect, useState } from 'react';
import { ApiError } from '@/api/client';
import { AuthUser, fetchMe, logout as logoutRequest, selectSite } from '@/api/auth';

function authErrorFromUrl(): string | null {
  const params = new URLSearchParams(window.location.search);
  const error = params.get('authError');
  if (error) {
    params.delete('authError');
    const next = `${window.location.pathname}${params.toString() ? `?${params}` : ''}`;
    window.history.replaceState({}, '', next);
  }
  return error;
}

export function useAuth() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(authErrorFromUrl);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const next = await fetchMe();
      setUser(next);
      setError(null);
      return next;
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        setUser(null);
        return null;
      }
      const message = err instanceof Error ? err.message : 'Failed to check the session.';
      setError(message);
      setUser(null);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const chooseSite = useCallback(async (cloudId: string) => {
    const next = await selectSite(cloudId);
    setUser(next);
    return next;
  }, []);

  const logout = useCallback(async () => {
    await logoutRequest();
    setUser(null);
  }, []);

  return { user, loading, error, refresh, chooseSite, logout };
}
