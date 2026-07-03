import React, { createContext, useContext, useState, useEffect } from 'react';

interface User {
  id: string;
  name: string;
  email: string;
  is_admin: boolean;
  is_active: boolean;
  force_reset: boolean;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (user: User, token: string, remember?: boolean) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(() => {
    const storedUser = localStorage.getItem('luz_user') || sessionStorage.getItem('luz_user');
    return storedUser ? JSON.parse(storedUser) : null;
  });
  const [token, setToken] = useState<string | null>(() => {
    return localStorage.getItem('luz_token') || sessionStorage.getItem('luz_token');
  });

  const login = (newUser: User, newToken: string, remember: boolean = false) => {
    setUser(newUser);
    setToken(newToken);

    const storage = remember ? localStorage : sessionStorage;

    // Clear other storage to avoid conflicts
    const otherStorage = remember ? sessionStorage : localStorage;
    otherStorage.removeItem('luz_token');
    otherStorage.removeItem('luz_user');

    storage.setItem('luz_token', newToken);
    storage.setItem('luz_user', JSON.stringify(newUser));
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('luz_token');
    localStorage.removeItem('luz_user');
    sessionStorage.removeItem('luz_token');
    sessionStorage.removeItem('luz_user');
  };

  return (
    <AuthContext.Provider value={{ user, token, login, logout }}>
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
