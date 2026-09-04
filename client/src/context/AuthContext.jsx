import { createContext, useContext, useState, useEffect } from 'react';
import api from '../api/axios';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true); // true while we check localStorage

  // On mount, rehydrate from localStorage
  useEffect(() => {
    const token = localStorage.getItem('resell_token');
    const stored = localStorage.getItem('resell_user');
    if (token && stored) {
      try {
        setUser(JSON.parse(stored));
      } catch {
        localStorage.removeItem('resell_user');
      }
    }
    setLoading(false);
  }, []);

  const _persist = (token, userData) => {
    localStorage.setItem('resell_token', token);
    localStorage.setItem('resell_user', JSON.stringify(userData));
    setUser(userData);
  };

  const checkEmail = async (email) => {
    const { data } = await api.post('/api/auth/check-email', { email });
    return data.exists; // boolean
  };

  const register = async (name, email, password) => {
    const { data } = await api.post('/api/auth/register', { name, email, password });
    _persist(data.token, data.user);
  };

  const login = async (email, password) => {
    const { data } = await api.post('/api/auth/login', { email, password });
    _persist(data.token, data.user);
  };

  const updateProfile = async (profileData) => {
    const { data } = await api.put('/api/auth/profile', profileData);
    const token = localStorage.getItem('resell_token');
    _persist(token, data.user);
    return data.user;
  };

  const logout = () => {
    localStorage.removeItem('resell_token');
    localStorage.removeItem('resell_user');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, checkEmail, register, login, updateProfile, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => useContext(AuthContext);
