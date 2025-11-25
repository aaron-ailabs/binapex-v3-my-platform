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
    const found = db.getUsers().find(u => u.email.toLowerCase() === email.toLowerCase());
    
    if (found) {
      // Verify password (mock check)
      if (password && found.password && found.password !== password) {
        toast({
          variant: "destructive",
          title: "Invalid Credentials",
          description: "The password you entered is incorrect.",
        });
        return false;
      }
      try {
        const uname = email.includes('@') ? email.split('@')[0] : email;
        const apiBase = (import.meta.env.VITE_API_BASE as string) || 'http://localhost:5000/api';
        fetch(`${apiBase}/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username: uname, password: password || found.password || 'password' })
        }).then(async (r) => {
          if (!r.ok) return;
          let data: any = null;
          try { data = await r.json(); } catch {}
          if (data?.token) {
            setToken(data.token);
            localStorage.setItem('binapex_token', data.token);
          }
        }).catch(() => {});
      } catch {}
      setUser(found);
      localStorage.setItem('binapex_user_id', found.id);
      toast({
        title: "Welcome back",
        description: `Logged in as ${found.name}`,
      });
      
      // Redirect based on role
      if (found.role === 'Admin') setLocation('/admin');
      else if (found.role === 'Customer Service') setLocation('/cs');
      else setLocation('/dashboard');
      return true;
    } else {
      toast({
        variant: "destructive",
        title: "Login Failed",
        description: "User not found.",
      });
      return false;
    }
  };

  const register = (name: string, email: string, password: string, phone?: string) => {
    const existing = db.getUsers().find(u => u.email.toLowerCase() === email.toLowerCase());
    if (existing) {
      toast({
        variant: "destructive",
        title: "Registration Failed",
        description: "Email already in use.",
      });
      return;
    }

    const newUser: User = {
      id: Math.random().toString(36).substr(2, 9),
      email,
      name,
      password,
      role: 'Trader', // Default role
      kyc_status: 'Not Started',
      membership_tier: 'Silver',
      phone
    };

    db.addUser(newUser);
    login(email, password);
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
