import React, { createContext, useContext, useState, useEffect } from 'react';
import { authApi } from '../services/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Initialize Auth: Fetch profile if token exists
  useEffect(() => {
    const initializeAuth = async () => {
      const token = localStorage.getItem('token');
      if (token) {
        try {
          const response = await authApi.getMe();
          if (response.success && response.data) {
            setUser(response.data);
          } else {
            // Invalid token state
            localStorage.removeItem('token');
          }
        } catch (err) {
          console.error('Failed to validate token on startup:', err);
          // If server is down or token is invalid, clear token
          if (err.status === 401 || err.status === 403) {
            localStorage.removeItem('token');
          }
        }
      }
      setLoading(false);
    };

    initializeAuth();
  }, []);

  // Login handler
  const login = async (email, password) => {
    setError(null);
    setLoading(true);
    try {
      const response = await authApi.login({ email, password });
      if (response.success && response.data?.token) {
        localStorage.setItem('token', response.data.token);
        
        // Use user profile returned in the login response directly
        if (response.data.user) {
          setUser(response.data.user);
          setLoading(false);
          return response.data.user;
        }
        
        // Fallback if user object is not in response (pre-migration)
        const profileRes = await authApi.getMe();
        if (profileRes.success && profileRes.data) {
          setUser(profileRes.data);
          setLoading(false);
          return profileRes.data;
        }
      }
      throw new Error('Authentication failed');
    } catch (err) {
      localStorage.removeItem('token');
      setUser(null);
      setError(err.message || 'Login failed');
      setLoading(false);
      throw err;
    }
  };

  // Register handler
  const register = async (registrationData) => {
    setError(null);
    setLoading(true);
    try {
      const response = await authApi.register(registrationData);
      setLoading(false);
      return response;
    } catch (err) {
      setError(err.message || 'Registration failed');
      setLoading(false);
      throw err;
    }
  };

  // Logout handler
  const logout = () => {
    localStorage.removeItem('token');
    setUser(null);
    setError(null);
  };

  const value = {
    user,
    loading,
    error,
    login,
    register,
    logout,
    isAuthenticated: !!user,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// Custom Hook for using Auth context
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthContext;
