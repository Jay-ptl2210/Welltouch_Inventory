import React, { createContext, useState, useContext, useEffect } from 'react';
import { login, register, refreshToken as refreshTokenApi, logout as logoutApi, getCurrentUser } from '../services/api';

const AuthContext = createContext(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState(localStorage.getItem('token') || null);
  const [refreshToken, setRefreshToken] = useState(localStorage.getItem('refreshToken') || null);

  // Load user on mount if token exists
  useEffect(() => {
    const initAuth = async () => {
      const storedToken = localStorage.getItem('token');
      const storedRefreshToken = localStorage.getItem('refreshToken');
      
      if (storedToken) {
        setToken(storedToken);
        setRefreshToken(storedRefreshToken);
        try {
          const response = await getCurrentUser();
          setUser(response.data.user);
        } catch (error) {
          // Token might be expired, try to refresh
          if (storedRefreshToken) {
            try {
              const refreshResponse = await refreshTokenApi(storedRefreshToken);
              setToken(refreshResponse.data.token);
              setRefreshToken(refreshResponse.data.refreshToken);
              localStorage.setItem('token', refreshResponse.data.token);
              localStorage.setItem('refreshToken', refreshResponse.data.refreshToken);
              const userResponse = await getCurrentUser();
              setUser(userResponse.data.user);
            } catch (refreshError) {
              // Refresh failed, clear everything
              localStorage.removeItem('token');
              localStorage.removeItem('refreshToken');
              setToken(null);
              setRefreshToken(null);
            }
          } else {
            localStorage.removeItem('token');
            localStorage.removeItem('refreshToken');
            setToken(null);
            setRefreshToken(null);
          }
        }
      }
      setLoading(false);
    };

    initAuth();
  }, []);

  const loginUser = async (email, password) => {
    try {
      const response = await login(email, password);
      const { token: newToken, refreshToken: newRefreshToken, user: userData } = response.data;
      
      setToken(newToken);
      setRefreshToken(newRefreshToken);
      setUser(userData);
      
      localStorage.setItem('token', newToken);
      localStorage.setItem('refreshToken', newRefreshToken);
      
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.error || 'Login failed'
      };
    }
  };

  const registerUser = async (name, email, password) => {
    try {
      const response = await register(name, email, password);
      const { token: newToken, refreshToken: newRefreshToken, user: userData } = response.data;
      
      setToken(newToken);
      setRefreshToken(newRefreshToken);
      setUser(userData);
      
      localStorage.setItem('token', newToken);
      localStorage.setItem('refreshToken', newRefreshToken);
      
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.error || 'Registration failed'
      };
    }
  };

  const logout = async () => {
    try {
      await logoutApi();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setToken(null);
      setRefreshToken(null);
      setUser(null);
      localStorage.removeItem('token');
      localStorage.removeItem('refreshToken');
    }
  };

  const value = {
    user,
    token,
    loading,
    login: loginUser,
    register: registerUser,
    logout,
    isAuthenticated: !!user
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
