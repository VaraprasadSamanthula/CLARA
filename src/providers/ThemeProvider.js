"use client";
import { createContext, useContext, useEffect, useState } from 'react';

const ThemeContext = createContext();

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState('light');
  const [mounted, setMounted] = useState(false);

  // Initialize theme from localStorage on mount
  useEffect(() => {
    const savedTheme = localStorage.getItem('clara-theme') || 'light';
    setTheme(savedTheme);
    applyTheme(savedTheme);
    setMounted(true);
  }, []);

  const applyTheme = (newTheme) => {
    const root = document.documentElement;
    
    if (newTheme === 'dark') {
      root.setAttribute('data-theme', 'dark');
      root.style.setProperty('--primary', '#0d7377');
      root.style.setProperty('--primary-light', '#14919b');
      root.style.setProperty('--primary-dark', '#0a5a60');
      root.style.setProperty('--primary-50', '#051f21');
      root.style.setProperty('--primary-100', '#0a3a3f');
      root.style.setProperty('--primary-200', '#0f5058');
      root.style.setProperty('--primary-500', '#14919b');
      root.style.setProperty('--primary-600', '#0d7377');
      root.style.setProperty('--primary-700', '#0a5a60');
      root.style.setProperty('--primary-900', '#f0f9fa');

      root.style.setProperty('--secondary', '#4a7c8f');
      root.style.setProperty('--secondary-light', '#6b9bb4');
      
      root.style.setProperty('--accent', '#00d9ff');
      root.style.setProperty('--accent-dark', '#00a8cc');
      
      root.style.setProperty('--background', '#0f172a');
      root.style.setProperty('--background-secondary', '#1e293b');
      root.style.setProperty('--surface', '#1a2332');
      root.style.setProperty('--surface-secondary', '#2d3e52');
      
      root.style.setProperty('--text-primary', '#f8f9fa');
      root.style.setProperty('--text-secondary', '#cbd5e1');
      root.style.setProperty('--text-tertiary', '#94a3b8');
      
      root.style.setProperty('--border', '#334155');
      root.style.setProperty('--border-light', '#475569');
    } else {
      root.setAttribute('data-theme', 'light');
      // Reset to light mode defaults
      root.style.setProperty('--primary', '#0d7377');
      root.style.setProperty('--primary-light', '#14919b');
      root.style.setProperty('--primary-dark', '#0a5a60');
      root.style.setProperty('--primary-50', '#f0f9fa');
      root.style.setProperty('--primary-100', '#d4eef2');
      root.style.setProperty('--primary-200', '#a8dde5');
      root.style.setProperty('--primary-500', '#14919b');
      root.style.setProperty('--primary-600', '#0d7377');
      root.style.setProperty('--primary-700', '#0a5a60');
      root.style.setProperty('--primary-900', '#051f21');

      root.style.setProperty('--secondary', '#4a7c8f');
      root.style.setProperty('--secondary-light', '#6b9bb4');
      
      root.style.setProperty('--accent', '#00d9ff');
      root.style.setProperty('--accent-dark', '#00a8cc');
      
      root.style.setProperty('--background', '#f8f9fa');
      root.style.setProperty('--background-secondary', '#eef2f5');
      root.style.setProperty('--surface', '#ffffff');
      root.style.setProperty('--surface-secondary', '#f5f7f9');
      
      root.style.setProperty('--text-primary', '#0f172a');
      root.style.setProperty('--text-secondary', '#475569');
      root.style.setProperty('--text-tertiary', '#94a3b8');
      
      root.style.setProperty('--border', '#e2e8f0');
      root.style.setProperty('--border-light', '#f1f5f9');
    }
  };

  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    localStorage.setItem('clara-theme', newTheme);
    applyTheme(newTheme);
  };

  // Don't render until hydrated to avoid mismatch
  if (!mounted) {
    return children;
  }

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return context;
}
