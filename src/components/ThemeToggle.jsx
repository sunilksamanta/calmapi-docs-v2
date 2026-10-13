'use client';

import { useEffect } from 'react';
import { Moon, Sun } from 'lucide-react';

// The theme works as on the CalmAPI website: it follows the system setting until the visitor
// picks one with this button, which is then remembered in localStorage ("calm-theme"). The
// script in app/layout.jsx sets data-theme on <html> before the first paint, and both icons
// are in the HTML (CSS shows the right one), so nothing changes when the page hydrates.

export const THEME_KEY = 'calm-theme';
const DARK = '(prefers-color-scheme: dark)';

function saved() {
  try {
    return localStorage.getItem(THEME_KEY);
  } catch {
    return null;
  }
}

function apply(theme) {
  document.documentElement.dataset.theme = theme;
}

function ThemeToggle() {
  // Follow the system setting while the visitor has not picked a theme.
  useEffect(() => {
    const media = window.matchMedia(DARK);
    const onChange = (e) => {
      if (!saved()) apply(e.matches ? 'dark' : 'light');
    };
    media.addEventListener('change', onChange);
    return () => media.removeEventListener('change', onChange);
  }, []);

  const toggle = () => {
    const next = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
    apply(next);
    try {
      localStorage.setItem(THEME_KEY, next);
    } catch {
      // Storage blocked (private mode): the theme still applies for this visit.
    }
  };

  return (
    <button type="button" className="icon-btn theme-toggle" onClick={toggle} aria-label="Toggle dark mode" title="Toggle dark mode">
      <Sun className="only-dark" strokeWidth={1.7} aria-hidden="true" />
      <Moon className="only-light" strokeWidth={1.7} aria-hidden="true" />
    </button>
  );
}

export default ThemeToggle;
