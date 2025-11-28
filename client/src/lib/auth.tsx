import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, db } from './mock-data';
import { useLocation } from 'wouter';
import { useToast } from '@/hooks/use-toast';

interface AuthContextType {
  user: User | null;
  login: (email: string, password?: string) => boolean; 
  register: (name: string, email: string, password: string, phone?: string) => void;
  logout: () => void;
  isLoading: boolean;
  token?: string | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [token, setToken] = useState<string | null>(null);
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  useEffect(() => {
    // Check local storage for logged in user
    const storedUserId = localStorage.getItem('binapex_user_id');
    const storedToken = localStorage.getItem('binapex_token');
    if (storedUserId) {
      const found = db.getUsers().find(u => u.id === storedUserId);
      if (found) setUser(found);
    }
    if (storedToken) setToken(storedToken);
    setIsLoading(false);
  }, []);

  const login = (email: string, password?: string) => {
    const apiBase = (import.meta.env.VITE_API_BASE as string) || '/api';
    const uname = email.toLowerCase();
    try {
      fetch(`${apiBase}/csrf`, { method: 'GET' }).catch(() => {});
      const xsrf = (() => {
        try {
          const m = (document.cookie || '').split(';').map(s => s.trim()).find(s => s.startsWith('XSRF-TOKEN='));
          return m ? decodeURIComponent(m.split('=')[1] || '') : '';
        } catch { return ''; }
      })();
      fetch(`${apiBase}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(xsrf ? { 'X-CSRF-Token': xsrf } : {}) },
        body: JSON.stringify({ username: uname, password: password || 'password' })
      }).then(async (r) => {
        let data: any = null;
        try { data = await r.json(); } catch {}
        if (!r.ok || !data?.token) {
          const found = db.getUsers().find(u => u.email.toLowerCase() === email.toLowerCase());
          if (!found) {
            toast({ variant: "destructive", title: "Login Failed", description: "Invalid credentials." });
            return;
          }
          setUser(found);
          localStorage.setItem('binapex_user_id', found.id);
          toast({ title: "Welcome back", description: `Logged in as ${found.name}` });
          if (found.role === 'Admin') setLocation('/admin');
          else if (found.role === 'Customer Service') setLocation('/cs');
          else setLocation('/dashboard');
          return;
        }
        setToken(data.token);
        localStorage.setItem('binapex_token', data.token);
        const role: any = data.role || 'Trader';
        const fallbackUser: User = { id: data.userId || Math.random().toString(36).slice(2,9), email, name: email.includes('@') ? email.split('@')[0] : email, role, kyc_status: 'Not Started', membership_tier: 'Silver' } as any;
        setUser(fallbackUser);
        localStorage.setItem('binapex_user_id', fallbackUser.id);
        toast({ title: "Welcome back", description: `Logged in as ${fallbackUser.name}` });
        if (role === 'Admin') setLocation('/admin');
        else if (role === 'Customer Service') setLocation('/cs');
        else setLocation('/dashboard');
      }).catch(() => {
        toast({ variant: "destructive", title: "Network Error", description: "Unable to login." });
      });
    } catch {
      toast({ variant: "destructive", title: "Error", description: "Login failed." });
      return false;
    }
    return true;
  };

  const register = (name: string, email: string, password: string, phone?: string) => {
    const apiBase = (import.meta.env.VITE_API_BASE as string) || '/api';
    fetch(`${apiBase}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    }).then(async (r) => {
      let data: any = null;
      try { data = await r.json(); } catch {}
      if (!r.ok || !data?.token) {
        toast({ variant: "destructive", title: "Registration Failed", description: data?.message || "Unable to create account." });
        return;
      }
      setToken(data.token);
      localStorage.setItem('binapex_token', data.token);
      const role: any = data.role || 'Trader';
      const u: User = { id: data.userId || Math.random().toString(36).slice(2,9), email, name, role, kyc_status: 'Not Started', membership_tier: 'Silver', phone } as any;
      setUser(u);
      localStorage.setItem('binapex_user_id', u.id);
      toast({ title: "Account Created", description: `Welcome, ${name}` });
      if (role === 'Admin') setLocation('/admin');
      else setLocation('/dashboard');
    }).catch(() => {
      toast({ variant: "destructive", title: "Network Error", description: "Unable to register." });
    });
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('binapex_user_id');
    localStorage.removeItem('binapex_token');
    setLocation('/auth');
  };

  return (
    <AuthContext.Provider value={{ user, login, register, logout, isLoading, token }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
