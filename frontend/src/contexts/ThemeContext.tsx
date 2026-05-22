/**
 * ThemeContext — gates the design system's light/dark surfaces.
 *
 * Three modes:
 *   - 'light'  : always force light (adds `light` class to <html>)
 *   - 'dark'   : always force dark (adds `dark` class to <html>)
 *   - 'system' : follows `prefers-color-scheme`, listening for changes
 *
 * Persisted to localStorage under the key `theme`. Default is 'system'.
 *
 * Tailwind's darkMode is set to `'class'` in tailwind.config.js, so the
 * presence of the `dark` class on <html> is what flips every `dark:`
 * variant across the app. Light mode is the absence of that class.
 *
 * Note: we set the class on <html> (not <body>) so that media-level
 * styling like `color-scheme: dark` (scrollbars, form controls) can pick
 * it up from the `html.dark { color-scheme: dark; }` rule in index.css.
 */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  ReactNode,
} from 'react';

export type Theme = 'light' | 'dark' | 'system';
export type ResolvedTheme = 'light' | 'dark';

interface ThemeContextValue {
  theme: Theme;
  /** The currently-applied theme: 'light' or 'dark'. Tracks system when theme === 'system'. */
  resolvedTheme: ResolvedTheme;
  setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

const STORAGE_KEY = 'theme';

function getSystemPreference(): ResolvedTheme {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return 'light';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function readStoredTheme(): Theme {
  if (typeof localStorage === 'undefined') return 'system';
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored === 'light' || stored === 'dark' || stored === 'system') return stored;
  return 'system';
}

function applyClass(resolved: ResolvedTheme) {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  root.classList.remove('light', 'dark');
  root.classList.add(resolved);
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(() => readStoredTheme());
  const [resolvedTheme, setResolvedTheme] = useState<ResolvedTheme>(() =>
    readStoredTheme() === 'system' ? getSystemPreference() : (readStoredTheme() as ResolvedTheme)
  );

  // Apply the resolved class to <html> whenever it changes.
  useEffect(() => {
    applyClass(resolvedTheme);
  }, [resolvedTheme]);

  // Listen for OS preference changes when in 'system' mode.
  useEffect(() => {
    if (theme !== 'system' || typeof window === 'undefined' || !window.matchMedia) return;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = (e: MediaQueryListEvent) => setResolvedTheme(e.matches ? 'dark' : 'light');
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, [theme]);

  // Recompute resolvedTheme when user changes the mode.
  useEffect(() => {
    setResolvedTheme(theme === 'system' ? getSystemPreference() : theme);
  }, [theme]);

  const setTheme = useCallback((next: Theme) => {
    setThemeState(next);
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, next);
    }
  }, []);

  const value = useMemo(
    () => ({ theme, resolvedTheme, setTheme }),
    [theme, resolvedTheme, setTheme]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return ctx;
}
