import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, db } from './mock-data';
import { useLocation } from 'wouter';
import { useToast } from '@/hooks/use-toast';

interface AuthContextType {
  user: User | null;
  login: (email: string) => void; 
  logout: () => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  useEffect(() => {
    // Check local storage for logged in user
    const storedUserId = localStorage.getItem('binapex_user_id');
    if (storedUserId) {
      const found = db.getUsers().find(u => u.id === storedUserId);
      if (found) setUser(found);
    }
    setIsLoading(false);
  }, []);

  const login = (email: string) => {
    // Simple mock login - finds user by email
    const found = db.getUsers().find(u => u.email === email);
    if (found) {
      setUser(found);
      localStorage.setItem('binapex_user_id', found.id);
      toast({
        title: "Welcome back",
        description: `Logged in as ${found.name} (${found.role})`,
      });
      
      // Redirect based on role
      if (found.role === 'Admin') setLocation('/admin');
      else if (found.role === 'Customer Service') setLocation('/cs');
      else setLocation('/dashboard');
    } else {
      toast({
        variant: "destructive",
        title: "Login Failed",
        description: "User not found. Try 'trader@binapex.com', 'admin@binapex.com', etc.",
      });
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('binapex_user_id');
    setLocation('/auth');
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, isLoading }}>
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
