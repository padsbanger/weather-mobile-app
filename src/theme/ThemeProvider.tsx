import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { AccessibilityInfo, AppState } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { darkColors, lightColors, type ThemeColors } from './tokens';
import { DEFAULT_THEME, nextThemeCheck, parseThemePreference, resolveTheme, type ThemeMode, type ThemePreference } from './schedule';

const KEY = 'weather-radar.theme.v1';
type ThemeContextValue = {
  colors: ThemeColors; resolved: 'light' | 'dark'; preference: ThemePreference;
  setMode: (mode: ThemeMode) => void; setHours: (start: number, end: number) => void;
  reducedMotion: boolean; storageError: boolean;
};
const Context = createContext<ThemeContextValue | null>(null);
export function useTheme() { const context = useContext(Context); if (!context) throw new Error('Theme provider missing'); return context; }
export function ThemeProvider({ children }: { children: ReactNode }) {
  const [preference, setPreference] = useState(DEFAULT_THEME);
  const [now, setNow] = useState(() => new Date());
  const [active, setActive] = useState(AppState.currentState !== 'background');
  const [reducedMotion, setReducedMotion] = useState(false);
  const [storageError, setStorageError] = useState(false);
  const writes = useRef(Promise.resolve());
  const preferenceRef = useRef(preference);
  const edited = useRef(false);
  useEffect(() => {
    let alive = true;
    void AsyncStorage.getItem(KEY).then(raw => { if (alive && raw && !edited.current) { const value = parseThemePreference(JSON.parse(raw)); preferenceRef.current = value; setPreference(value); } })
      .catch(() => { if (alive) setStorageError(true); });
    void AccessibilityInfo.isReduceMotionEnabled().then(value => { if (alive) setReducedMotion(value); }).catch(() => {});
    const reduceSub = AccessibilityInfo.addEventListener('reduceMotionChanged', setReducedMotion);
    const appSub = AppState.addEventListener('change', state => {
      setActive(state === 'active');
      if (state === 'active') {
        setNow(new Date());
        void writes.current.then(() => AsyncStorage.getItem(KEY)).then(raw => {
          if (alive && raw) { const value = parseThemePreference(JSON.parse(raw)); preferenceRef.current = value; setPreference(value); }
        }).catch(() => { if (alive) setStorageError(true); });
      }
    });
    return () => { alive = false; reduceSub.remove(); appSub.remove(); };
  }, []);
  useEffect(() => {
    if (!active) return;
    const timer = setTimeout(() => setNow(new Date()), nextThemeCheck(now, preference));
    return () => clearTimeout(timer);
  }, [active, now, preference]);
  function save(value: ThemePreference) {
    edited.current = true;
    preferenceRef.current = value; setPreference(value); setNow(new Date());
    writes.current = writes.current.then(() => AsyncStorage.setItem(KEY, JSON.stringify(value))).catch(() => setStorageError(true));
  }
  const value = useMemo<ThemeContextValue>(() => ({
    colors: resolveTheme(preference, now) === 'dark' ? darkColors : lightColors,
    resolved: resolveTheme(preference, now), preference,
    setMode: mode => save({ ...preferenceRef.current, mode }),
    setHours: (lightStart, lightEnd) => save(parseThemePreference({ ...preferenceRef.current, lightStart, lightEnd })),
    reducedMotion, storageError,
  }), [preference, now, reducedMotion, storageError]);
  return <Context.Provider value={value}>{children}</Context.Provider>;
}
