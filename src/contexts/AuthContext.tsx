import React, { createContext, useContext, useState, useEffect } from 'react';

interface User {
  id: string;
  name?: string;
  role: string;
  status: string;
  phone: string;
  orgId: string;
}

interface AuthContextType {
  isAuthenticated: boolean;
  user: User | null;
  token: string | null;
  login: (token: string) => void;
  logout: () => void;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [token, setToken] = useState<string | null>(localStorage.getItem('ksp_token'));
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const API_BASE_URL = import.meta.env.VITE_API_URL || '';

  useEffect(() => {
    const initializeAuth = async () => {
      const storedToken = localStorage.getItem('ksp_token');
      
      if (storedToken) {
        try {
          const payload = JSON.parse(atob(storedToken.split('.')[1]));
          if (payload.exp * 1000 < Date.now()) {
            logout();
          } else {
            setToken(storedToken);
            // Set initial state from JWT for immediate render
            setUser({
              id: payload.sub,
              role: payload.role || 'USER',
              status: payload.status || 'ACTIVE',
              phone: payload.phone,
              orgId: payload.orgId
            });

            // Fetch live data from backend
            const res = await fetch(`${API_BASE_URL}/api/v1/users/me`, {
              headers: {
                'Authorization': `Bearer ${storedToken}`
              }
            });
            
            if (res.ok) {
              const liveData = await res.json();
              setUser(prev => prev ? { ...prev, role: liveData.role, status: liveData.status, name: liveData.name } : null);
            } else {
              logout();
            }
          }
        } catch (e) {
          logout();
        }
      }
      setLoading(false);
    };

    initializeAuth();
  }, []);

  const login = (newToken: string) => {
    try {
      const payload = JSON.parse(atob(newToken.split('.')[1]));
      const userData: User = {
        id: payload.sub,
        role: payload.role || 'USER',
        status: payload.status || 'ACTIVE',
        phone: payload.phone,
        orgId: payload.orgId
      };
      
      localStorage.setItem('ksp_token', newToken);
      setToken(newToken);
      setUser(userData);
    } catch (e) {
      console.error("Failed to parse JWT", e);
    }
  };

  const logout = () => {
    localStorage.removeItem('ksp_token');
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
