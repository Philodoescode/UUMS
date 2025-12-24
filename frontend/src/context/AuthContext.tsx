import React, { createContext, useState, useEffect, useContext } from 'react';
import api from '@/lib/api';

// Types
interface User {
  id: string; // Updated to match Sequelize default
  _id?: string; // Kept for potential compatibility or legacy
  fullName: string;
  email: string;
  role: 'admin' | 'instructor' | 'student' | 'hr' | 'ta' | 'advisor';
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (user: User) => void;
  logout: () => Promise<void>;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Check if user is logged in on mount (persistence)
  useEffect(() => {
    const checkStatus = async () => {
      try {
        const { data } = await api.get('/auth/check');
        setUser(data);
      } catch (error) {
        setUser(null);
      } finally {
        setLoading(false);
      }
    };
    checkStatus();
  }, []);

  const login = (userData: User) => {
    setUser(userData);
  };

  const logout = async () => {
    try {
      await api.post('/auth/logout');
      setUser(null);
    } catch (error) {
      console.error("Logout failed", error);
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, isAuthenticated: !!user }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};