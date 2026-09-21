import { useEffect, useState } from 'react';

const KEY = 'speakeasy-theme';

function readSaved() {
  try {
    const saved = localStorage.getItem(KEY);
    return saved === 'light' || saved === 'dark' ? saved : null;
  } catch {
    return null;
  }
}

// Dark is the studio default; a choice made with the toggle is remembered.
export function useTheme() {
  const [theme, setTheme] = useState(() => readSaved() ?? 'dark');

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    try {
      localStorage.setItem(KEY, theme);
    } catch {
      // Storage can be blocked (private mode); the toggle still works per visit.
    }
  }, [theme]);

  const toggle = () => setTheme((t) => (t === 'dark' ? 'light' : 'dark'));
  return { theme, toggle };
}
