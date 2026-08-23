import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

export type Role = 'AMBULANCE_CREW' | 'DISPATCHER' | 'HOSPITAL_STAFF';

export interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: Role;
  organization: string;
  employeeId: string;
  department?: string;
  ambulanceId?: string;
  hospitalId?: string;
  dispatchCenter?: string;
  status: 'active' | 'pending' | 'disabled';
}

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string, remember?: boolean) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  signup: (data: SignupData) => Promise<{ success: boolean; error?: string }>;
  updateProfile: (data: Pick<User, 'name' | 'phone'>) => Promise<void>;
}

export interface SignupData {
  name: string;
  email: string;
  phone: string;
  password: string;
  role: Role;
  organization: string;
  employeeId?: string;
  ambulanceId?: string;
  hospitalId?: string;
  dispatchCenter?: string;
  department?: string;
}

const AuthContext = createContext<AuthContextType | null>(null);
const SESSION_KEY = 'liferoute.user';
const TOKEN_KEY = 'liferoute.token';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(() => {
    try {
      const saved = window.localStorage.getItem(SESSION_KEY);
      return saved ? (JSON.parse(saved) as User) : null;
    } catch {
      return null;
    }
  });

  useEffect(() => {
    const token = window.localStorage.getItem(TOKEN_KEY) || window.sessionStorage.getItem(TOKEN_KEY);
    if (!token) return;
    fetch('/api/auth/me', { headers: { Authorization: `Bearer ${token}` } })
      .then(response => response.ok ? response.json() : Promise.reject())
      .then(data => setUser(data.user))
      .catch(() => { window.localStorage.removeItem(TOKEN_KEY); window.localStorage.removeItem(SESSION_KEY); setUser(null); });
  }, []);

  const login = async (email: string, password: string, remember = false) => {
    try {
      const response = await fetch('/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password }) });
      const data = await response.json();
      if (!response.ok) return { success: false, error: data.error || 'Login failed.' };
      setUser(data.user);
      if (remember) {
        window.localStorage.setItem(SESSION_KEY, JSON.stringify(data.user));
        window.localStorage.setItem(TOKEN_KEY, data.token);
        window.sessionStorage.removeItem(TOKEN_KEY);
      } else {
        window.localStorage.removeItem(SESSION_KEY);
        window.localStorage.removeItem(TOKEN_KEY);
        window.sessionStorage.setItem(TOKEN_KEY, data.token);
      }
      return { success: true };
    } catch {
      return { success: false, error: 'Authentication service unavailable.' };
    }
  };

  const logout = () => {
    window.localStorage.removeItem(SESSION_KEY);
    window.localStorage.removeItem(TOKEN_KEY);
    window.sessionStorage.removeItem(TOKEN_KEY);
    setUser(null);
  };

  const signup = async (data: SignupData) => {
    try {
      const response = await fetch('/api/auth/signup', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
      const result = await response.json();
      return response.ok ? { success: true } : { success: false, error: result.error || 'Signup failed.' };
    } catch {
      return { success: false, error: 'Authentication service unavailable.' };
    }
  };

  const updateProfile = async (data: Pick<User, 'name' | 'phone'>) => {
    const token = window.localStorage.getItem(TOKEN_KEY) || window.sessionStorage.getItem(TOKEN_KEY);
    if (!token) return;
    const response = await fetch('/api/auth/profile', { method: 'PATCH', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify(data) });
    if (!response.ok) throw new Error('Profile update failed');
    const result = await response.json();
    setUser(result.user);
    if (window.localStorage.getItem(SESSION_KEY)) window.localStorage.setItem(SESSION_KEY, JSON.stringify(result.user));
  };

  return <AuthContext.Provider value={{ user, login, logout, signup, updateProfile }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
