import { createContext, useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { clearToken, getToken, setToken, UNAUTHORIZED_EVENT } from '../lib/http';
import { disconnectAllCollaborativeInstances } from '../lib/yjs';
import { disconnectSocket } from '../lib/socket';
import { authService } from '../services/auth.service';
import type { User } from '../types/models';

interface AuthContextValue {
  user: User | null;
  initializing: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => void;
}

export const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [initializing, setInitializing] = useState(true);

  useEffect(() => {
    const token = getToken();
    if (!token) {
      setInitializing(false);
      return;
    }

    let cancelled = false;
    authService
      .me()
      .then((me) => {
        if (!cancelled) setUser(me);
      })
      .catch(() => {
        if (!cancelled) clearToken();
      })
      .finally(() => {
        if (!cancelled) setInitializing(false);
      });

    const onUnauthorized = () => setUser(null);
    window.addEventListener(UNAUTHORIZED_EVENT, onUnauthorized);
    return () => {
      cancelled = true;
      window.removeEventListener(UNAUTHORIZED_EVENT, onUnauthorized);
    };
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const { user: loggedIn, token } = await authService.login(email, password);
    setToken(token);
    setUser(loggedIn);
  }, []);

  const register = useCallback(async (name: string, email: string, password: string) => {
    const { user: registered, token } = await authService.register(name, email, password);
    setToken(token);
    setUser(registered);
  }, []);

  const logout = useCallback(() => {
    disconnectAllCollaborativeInstances();
    disconnectSocket();
    clearToken();
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({ user, initializing, login, register, logout }),
    [user, initializing, login, register, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
