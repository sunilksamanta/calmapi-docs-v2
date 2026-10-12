'use client';

import { useEffect, useSyncExternalStore } from 'react';
import { Sun, Moon, Monitor } from 'lucide-react';

// The theme is "light", "dark" or "system", saved in localStorage. The script in the <head> of
// app/layout.jsx applies it before the first paint; this toggle changes it afterwards.

const KEY = 'theme';
const DARK = '(prefers-color-scheme: dark)';
const listeners = new Set();
let current = null;

function readTheme() {
  try {
    return localStorage.getItem(KEY) || 'system';
  } catch {
    return 'system';
  }
}

function applyTheme(theme) {
  const root = document.documentElement;
  const dark = theme === 'dark' || (theme === 'system' && window.matchMedia(DARK).matches);
  root.classList.remove('light', 'dark');
  root.classList.add(dark ? 'dark' : 'light');
}

function setTheme(theme) {
  current = theme;
  try {
    localStorage.setItem(KEY, theme);
  } catch {
    // Storage blocked (private mode): the theme still applies for this visit.
  }
  applyTheme(theme);
  for (const listener of listeners) listener();
}

const subscribe = (listener) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};
const getSnapshot = () => (current ??= readTheme());
// The prerendered HTML cannot know the saved theme: it shows "system" until the page hydrates.
const getServerSnapshot = () => 'system';

const THEMES = [
  { value: 'light', icon: Sun, label: 'Light' },
  { value: 'dark', icon: Moon, label: 'Dark' },
  { value: 'system', icon: Monitor, label: 'System' },
];

function ThemeToggle() {
  const theme = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  // Follow the operating system while the theme is "system".
  useEffect(() => {
    if (theme !== 'system') return undefined;
    const media = window.matchMedia(DARK);
    const onChange = () => applyTheme('system');
    media.addEventListener('change', onChange);
    return () => media.removeEventListener('change', onChange);
  }, [theme]);

  return (
    <div className="theme-toggle">
      {THEMES.map(({ value, icon: Icon, label }) => (
        <button
          key={value}
          type="button"
          onClick={() => setTheme(value)}
          className={`theme-button ${theme === value ? 'active' : ''}`}
          title={label}
          aria-label={`Switch to ${label} theme`}
        >
          <Icon size={16} />
        </button>
      ))}
    </div>
  );
}

export default ThemeToggle;
