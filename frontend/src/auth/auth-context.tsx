'use client';

import { createContext, useCallback, useEffect, useState } from 'react';
import { loginRequest } from '../api/auth-api';

interface AuthContextValue {
  token: string | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

export const AuthContext = createContext<AuthContextValue | null>(null);

const TOKEN_STORAGE_KEY = 'decision-data-ruta-token';

export function AuthProvider({ children }: { children: React.ReactNode }): JSX.Element {
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    const storedToken = window.localStorage.getItem(TOKEN_STORAGE_KEY);
    if (storedToken) {
      setToken(storedToken);
    }
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const accessToken = await loginRequest(email, password);
    window.localStorage.setItem(TOKEN_STORAGE_KEY, accessToken);
    setToken(accessToken);
  }, []);

  const logout = useCallback(() => {
    window.localStorage.removeItem(TOKEN_STORAGE_KEY);
    setToken(null);
  }, []);

  return <AuthContext.Provider value={{ token, login, logout }}>{children}</AuthContext.Provider>;
}
