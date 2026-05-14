import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { useLocation } from 'react-router-dom';

type Theme = 'light' | 'dark';

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [theme, setTheme] = useState<Theme>(() => {
    const stored = localStorage.getItem('app-theme');
    return (stored === 'dark' || stored === 'light') ? stored : 'light';
  });
  
  const location = useLocation();

  const toggleTheme = () => {
    const nextTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(nextTheme);
    localStorage.setItem('app-theme', nextTheme);
  };

  useEffect(() => {
    const root = document.documentElement;
    // Check if the current route is protected from global dark mode
    const isProtectedPath = location.pathname.startsWith('/admin') || location.pathname.startsWith('/ilpadmin');

    if (theme === 'dark' && !isProtectedPath) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
      // If we are on a protected path and want local control, we leave it untouched or strip it.
      // Here we strip it globally because admin pages have their own self-contained logic or backgrounds.
    }
  }, [theme, location.pathname]);

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = (): ThemeContextType => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
