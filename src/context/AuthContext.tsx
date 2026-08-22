import { createContext, useContext, useState, type ReactNode } from 'react';

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
  dispatchCenter?: string;
  status: 'active' | 'pending' | 'disabled';
}

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  signup: (data: SignupData) => Promise<{ success: boolean; error?: string }>;
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
  dispatchCenter?: string;
  department?: string;
}

const MOCK_USERS: Record<string, User & { password: string }> = {
  'crew@demo.com': {
    id: 'u1', name: 'Marcus Reid', email: 'crew@demo.com', phone: '+1 555-0101',
    role: 'AMBULANCE_CREW', organization: 'Metro Ambulance Service',
    employeeId: 'EMP-2847', ambulanceId: 'AMB-042', password: 'demo1234',
    status: 'active',
  },
  'dispatch@demo.com': {
    id: 'u2', name: 'Sarah Chen', email: 'dispatch@demo.com', phone: '+1 555-0202',
    role: 'DISPATCHER', organization: 'Central Dispatch Authority',
    employeeId: 'DSP-1193', dispatchCenter: 'Central-1', password: 'demo1234',
    status: 'active',
  },
  'hospital@demo.com': {
    id: 'u3', name: 'Dr. James Okafor', email: 'hospital@demo.com', phone: '+1 555-0303',
    role: 'HOSPITAL_STAFF', organization: 'City General Hospital',
    employeeId: 'HSP-5512', department: 'Emergency Medicine', password: 'demo1234',
    status: 'active',
  },
};

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);

  const login = async (email: string, password: string) => {
    await new Promise(r => setTimeout(r, 900));
    const found = MOCK_USERS[email.toLowerCase()];
    if (!found) return { success: false, error: 'No account found with this email address.' };
    if (found.password !== password) return { success: false, error: 'Incorrect password. Please try again.' };
    if (found.status === 'pending') return { success: false, error: 'Your account is awaiting verification.' };
    if (found.status === 'disabled') return { success: false, error: 'This account has been disabled. Contact support.' };
    const { password: _p, ...u } = found;
    setUser(u);
    return { success: true };
  };

  const logout = () => setUser(null);

  const signup = async (_data: SignupData) => {
    await new Promise(r => setTimeout(r, 1200));
    return { success: true };
  };

  return <AuthContext.Provider value={{ user, login, logout, signup }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
