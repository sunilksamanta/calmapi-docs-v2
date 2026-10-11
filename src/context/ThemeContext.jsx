import { createContext, useContext, useEffect, useState } from 'react';

const ThemeContext = createContext();

const readTheme = () => {
  try {
    return localStorage.getItem('theme') || 'system';
  } catch {
    return 'system';
  }
};

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(readTheme);

  useEffect(() => {
    const root = window.document.documentElement;

    const applyTheme = (newTheme) => {
      root.classList.remove('light', 'dark');

      if (newTheme === 'system') {
        const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
        root.classList.add(systemTheme);
      } else {
        root.classList.add(newTheme);
      }
    };

    applyTheme(theme);
    try {
      localStorage.setItem('theme', theme);
    } catch {
      // Storage blocked (private mode): the theme still applies for this visit.
    }

    // Listen for system theme changes when in system mode
    if (theme === 'system') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const handleChange = () => applyTheme('system');

      mediaQuery.addEventListener('change', handleChange);
      return () => mediaQuery.removeEventListener('change', handleChange);
    }
  }, [theme]);

  return <ThemeContext.Provider value={{ theme, setTheme }}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
