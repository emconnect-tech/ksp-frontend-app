import React, { createContext, useContext, useState, useEffect } from 'react';

interface User {
  id: string;
  name: string;
  role: string;
  modules: string[];
}

interface AuthContextType {
  isAuthenticated: boolean;
  user: User | null;
  token: string | null;
  login: (token: string, user: User) => void;
  logout: () => void;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [token, setToken] = useState<string | null>(localStorage.getItem('ksp_token'));
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const storedToken = localStorage.getItem('ksp_token');
    const storedUser = localStorage.getItem('ksp_user');
    
    if (storedToken && storedUser) {
      setToken(storedToken);
      setUser(JSON.parse(storedUser));
    } else if (storedToken) {
      // Fallback for demo: if token exists but no user, set a default Superadmin
      const defaultUser = { 
        id: '1', 
        name: 'Ikram Khan', 
        role: 'Superadmin', 
        modules: ['Bookings', 'Materials', 'Stock-In', 'Reports', 'Admin'] 
      };
      setUser(defaultUser);
    }
    setLoading(false);
  }, []);

  const login = (newToken: string, userData: User) => {
    localStorage.setItem('ksp_token', newToken);
    localStorage.setItem('ksp_user', JSON.stringify(userData));
    setToken(newToken);
    setUser(userData);
  };

  const logout = () => {
    localStorage.removeItem('ksp_token');
    localStorage.removeItem('ksp_user');
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ 
      isAuthenticated: !!token, 
      user,
      token, 
      login, 
      logout,
      loading 
    }}>
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
