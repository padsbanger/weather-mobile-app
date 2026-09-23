import { useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { parseWarnings, WARNINGS_REFRESH, WARNINGS_URL, type WarningFeed } from '../../providers/imgw';
import { validArea } from './areas';

const CACHE_KEY = 'weather-radar.warnings.v1';
const AREA_KEY = 'weather-radar.warning-area.v1';
export function useWarnings(offline: boolean) {
  const [active, setActive] = useState(AppState.currentState === 'active');
  const [area, setArea] = useState<string | null>(null);
  const [data, setData] = useState<WarningFeed | null>(null);
  const [fetchedAt, setFetchedAt] = useState(0);
  const [now, setNow] = useState(Date.now);
  const [hydrated, setHydrated] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [storageError, setStorageError] = useState(false);
  const writes = useRef(Promise.resolve());
  const lastFetch = useRef(0);
  const nextAttempt = useRef(0);
  const failures = useRef(0);
  useEffect(() => {
    let alive = true;
    void Promise.all([AsyncStorage.getItem(AREA_KEY), AsyncStorage.getItem(CACHE_KEY)]).then(([savedArea, saved]) => {
      if (!alive) return;
      if (savedArea) { if (validArea(savedArea)) setArea(savedArea); else setStorageError(true); }
      if (saved) {
        const cached = JSON.parse(saved);
        if (!Number.isFinite(cached.fetchedAt) || cached.fetchedAt <= 0 || cached.fetchedAt > Date.now()) throw new Error('Invalid warning cache');
        setData(parseWarnings(cached.raw)); setFetchedAt(cached.fetchedAt);
      }
    }).catch(() => { if (alive) setStorageError(true); }).finally(() => { if (alive) setHydrated(true); });
    const sub = AppState.addEventListener('change', state => { setActive(state === 'active'); if (state === 'active') setNow(Date.now()); });
    return () => { alive = false; sub.remove(); };
  }, []);
  useEffect(() => {
    if (!active) return;
    // Wake at the next validity boundary as well as periodically for clock changes.
    const boundaries = data?.warnings.flatMap(w => [w.start, w.end]).filter(t => t > now) ?? [];
    const delay = Math.min(15000, ...boundaries.map(t => t - now));
    const timer = setTimeout(() => setNow(Date.now()), Math.max(1, delay));
    return () => clearTimeout(timer);
  }, [active, data, now]);
  useEffect(() => {
    if (!active || offline || !hydrated) return;
    let alive = true;
    let timer: ReturnType<typeof setTimeout>;
    let deadline: ReturnType<typeof setTimeout>;
    let controller: AbortController | undefined;
    async function refresh() {
      const time = Date.now();
      // A backwards clock change must not postpone polling indefinitely.
      if (lastFetch.current > time) { lastFetch.current = 0; nextAttempt.current = 0; }
      const wait = Math.max(lastFetch.current + WARNINGS_REFRESH, nextAttempt.current) - time;
      if (wait > 0) { timer = setTimeout(() => { void refresh(); }, Math.min(wait, 15000)); return; }
      controller = new AbortController(); deadline = setTimeout(() => controller?.abort(), 15000);
      setLoading(true);
      try {
        const response = await fetch(WARNINGS_URL, { signal: controller.signal });
        if (!response.ok) throw new Error(`IMGW HTTP ${response.status}`);
        const text = await response.text();
        if (text.length > 2000000) throw new Error('Warning feed too large');
        const raw: unknown = JSON.parse(text), parsed = parseWarnings(raw);
        if (!alive) return;
        const fetched = Date.now();
        setData(parsed); setFetchedAt(fetched); setNow(fetched); setError(false);
        lastFetch.current = fetched; nextAttempt.current = 0; failures.current = 0;
        // A successful empty feed replaces older warnings, including cancellations.
        writes.current = writes.current.then(() => AsyncStorage.setItem(CACHE_KEY, JSON.stringify({ raw, fetchedAt: fetched }))).catch(() => setStorageError(true));
      } catch {
        if (alive) { setError(true); nextAttempt.current = Date.now() + Math.min(300000, 15000 * 2 ** Math.min(failures.current++, 5)); }
      } finally {
        clearTimeout(deadline);
        if (alive) { setLoading(false); timer = setTimeout(() => { void refresh(); }, 1000); }
      }
    }
    void refresh();
    return () => { alive = false; controller?.abort(); clearTimeout(timer); clearTimeout(deadline); };
  }, [active, hydrated, offline]);
  function selectArea(code: string) {
    if (!validArea(code)) return;
    setArea(code);
    writes.current = writes.current.then(() => AsyncStorage.setItem(AREA_KEY, code)).catch(() => setStorageError(true));
  }
  return { area, selectArea, data, fetchedAt, now, loading: !hydrated || (active && !offline && loading), error, offline, storageError };
}
export type WarningsState = ReturnType<typeof useWarnings>;
