import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { ACCESS_KEY, REFRESH_KEY, api } from '../api/client';
import type { PublicUser } from '../types/user';

interface AuthContextValue {
  user: PublicUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, username: string, password: string) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

interface AuthResponse {
  user: PublicUser;
  accessToken: string;
  refreshToken: string;
}

function persistTokens(accessToken: string, refreshToken: string) {
  localStorage.setItem(ACCESS_KEY, accessToken);
  localStorage.setItem(REFRESH_KEY, refreshToken);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<PublicUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const access = localStorage.getItem(ACCESS_KEY);
    const refresh = localStorage.getItem(REFRESH_KEY);
    if (!access && !refresh) {
      setLoading(false);
      return;
    }

    api
      .get<{ user: PublicUser }>('/api/auth/me')
      .then((res) => setUser(res.data.user))
      .catch(async () => {
        // Access token expired — try refreshing before logging out
        if (refresh) {
          try {
            const { data } = await api.post<{ accessToken: string }>(
              '/api/auth/refresh',
              { refreshToken: refresh },
            );
            localStorage.setItem(ACCESS_KEY, data.accessToken);
            const res = await api.get<{ user: PublicUser }>('/api/auth/me');
            setUser(res.data.user);
            return;
          } catch {
            // Refresh token also invalid — fall through to logout
          }
        }
        localStorage.removeItem(ACCESS_KEY);
        localStorage.removeItem(REFRESH_KEY);
      })
      .finally(() => setLoading(false));
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const { data } = await api.post<AuthResponse>('/api/auth/login', { email, password });
    persistTokens(data.accessToken, data.refreshToken);
    setUser(data.user);
  }, []);

  const register = useCallback(async (email: string, username: string, password: string) => {
    const { data } = await api.post<AuthResponse>('/api/auth/register', { email, username, password });
    persistTokens(data.accessToken, data.refreshToken);
    setUser(data.user);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(ACCESS_KEY);
    localStorage.removeItem(REFRESH_KEY);
    setUser(null);
  }, []);

  const refreshUser = useCallback(async () => {
    try {
      const res = await api.get<{ user: PublicUser }>('/api/auth/me');
      setUser(res.data.user);
    } catch {
      // ignore — user stays as-is
    }
  }, []);

  const value = useMemo(
    () => ({ user, loading, login, register, logout, refreshUser }),
    [user, loading, login, register, logout, refreshUser]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
