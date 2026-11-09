/**
 * AuthContext: JWT token management and authentication state.
 * Provides useAuth() hook for consuming components.
 */

import React, { createContext, useState, useEffect, ReactNode } from 'react';
import { apiClient } from '../services/api';

export interface AuthContextType {
  isAuthenticated: boolean;
  token: string | null;
  email: string | null;
  isLoading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const TOKEN_STORAGE_KEY = 'clara_auth_token';
const EMAIL_STORAGE_KEY = 'clara_auth_email';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [email, setEmail] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // On mount, restore token from localStorage and verify it
  useEffect(() => {
    const storedToken = localStorage.getItem(TOKEN_STORAGE_KEY);
    const storedEmail = localStorage.getItem(EMAIL_STORAGE_KEY);

    if (storedToken) {
      setToken(storedToken);
      setEmail(storedEmail);
      // Verify token is still valid (with timeout)
      const verifyWithTimeout = async () => {
        try {
          const abortController = new AbortController();
          const timeoutId = setTimeout(() => abortController.abort(), 5000); // 5 second timeout
          
          await apiClient.verifyToken(storedToken);
          clearTimeout(timeoutId);
          setIsLoading(false);
        } catch (err) {
          // Token is invalid or expired, or verification failed, clear it
          localStorage.removeItem(TOKEN_STORAGE_KEY);
          localStorage.removeItem(EMAIL_STORAGE_KEY);
          setToken(null);
          setEmail(null);
          setIsLoading(false);
        }
      };
      verifyWithTimeout();
    } else {
      setIsLoading(false);
    }
  }, []);

  const login = async (email: string, password: string) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await apiClient.login(email, password);
      const newToken = response.access_token;

      setToken(newToken);
      setEmail(email);
      localStorage.setItem(TOKEN_STORAGE_KEY, newToken);
      localStorage.setItem(EMAIL_STORAGE_KEY, email);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Login failed';
      setError(errorMsg);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    setToken(null);
    setEmail(null);
    setError(null);
    localStorage.removeItem(TOKEN_STORAGE_KEY);
    localStorage.removeItem(EMAIL_STORAGE_KEY);
  };

  const clearError = () => {
    setError(null);
  };

  const value: AuthContextType = {
    isAuthenticated: !!token,
    token,
    email,
    isLoading,
    error,
    login,
    logout,
    clearError,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

/**
 * Hook to use auth context.
 * Must be called within AuthProvider.
 */
export function useAuth(): AuthContextType {
  const context = React.useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
