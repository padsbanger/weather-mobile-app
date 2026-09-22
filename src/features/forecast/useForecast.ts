import { useEffect, useState } from 'react';
import { AppState } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { fetchJson, forecastStale, forecastUrl, locationKey, parseForecast, type Forecast } from '../../providers/openMeteo';

const CACHE = 'weather-radar.forecasts.v1';
type Entry = { raw: unknown; fetchedAt: number };
let writes = Promise.resolve();
export function useForecast(center: [number, number], offline: boolean) {
  const key = locationKey(center);
  const [active, setActive] = useState(AppState.currentState === 'active');
  const [data, setData] = useState<Forecast | null>(null);
  const [fetchedAt, setFetchedAt] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [cacheError, setCacheError] = useState(false);
  const [now, setNow] = useState(Date.now);
  useEffect(() => {
    const sub = AppState.addEventListener('change', s => { setActive(s === 'active'); if (s === 'active') setNow(Date.now()); });
    return () => sub.remove();
  }, []);
  useEffect(() => {
    if (!active) return;
    const timer = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(timer);
  }, [active]);
  useEffect(() => {
    let alive = true;
    let controller: AbortController | undefined;
    let timer: ReturnType<typeof setTimeout>;
    let deadline: ReturnType<typeof setTimeout>;
    let lastFetch = 0;
    let failures = 0;
    const [lat, lon] = key.split(',').map(Number);
    async function refresh() {
      if (!alive || !active || offline) { if (alive) setLoading(false); return; }
      if (lastFetch && !forecastStale(lastFetch, Date.now())) {
        setLoading(false); timer = setTimeout(() => { void refresh(); }, 30000); return;
      }
      setLoading(true);
      controller = new AbortController();
      deadline = setTimeout(() => controller?.abort(), 15000);
      try {
        const raw = await fetchJson(forecastUrl([lon, lat]), controller.signal);
        const parsed = parseForecast(raw);
        if (!alive) return;
        lastFetch = Date.now(); failures = 0;
        setData(parsed); setFetchedAt(lastFetch); setNow(lastFetch); setError(false);
        const entry = { raw, fetchedAt: lastFetch };
        writes = writes.then(async () => {
          const saved = await AsyncStorage.getItem(CACHE);
          let entries: Record<string, Entry> = {};
          try { entries = saved ? JSON.parse(saved) : {}; if (!entries || typeof entries !== 'object' || Array.isArray(entries)) entries = {}; } catch { /* Replace corrupt cache. */ }
          entries[key] = entry;
          const bounded = Object.fromEntries(Object.entries(entries).filter(([, v]) => v && Number.isFinite(v.fetchedAt)).sort((a, b) => b[1].fetchedAt - a[1].fetchedAt).slice(0, 12));
          await AsyncStorage.setItem(CACHE, JSON.stringify(bounded));
        }).catch(() => { if (alive) setCacheError(true); });
      } catch { if (alive) { setError(true); failures++; } }
      finally {
        clearTimeout(deadline);
        if (alive) {
          setLoading(false);
          timer = setTimeout(() => { void refresh(); }, failures ? Math.min(300000, 30000 * 2 ** Math.min(failures - 1, 4)) : 30000);
        }
      }
    }
    async function start() {
      setLoading(true);
      try {
        await writes;
        const saved = await AsyncStorage.getItem(CACHE);
        const entry = saved ? JSON.parse(saved)?.[key] as Entry | undefined : undefined;
        if (entry && typeof entry.fetchedAt === 'number' && Number.isFinite(entry.fetchedAt) && entry.fetchedAt > 0 && entry.fetchedAt <= Date.now()) {
          const parsed = parseForecast(entry.raw);
          if (!alive) return;
          setData(parsed); setFetchedAt(entry.fetchedAt); lastFetch = entry.fetchedAt;
        }
      } catch { if (alive) setCacheError(true); }
      if (alive) void refresh();
    }
    void start();
    return () => { alive = false; controller?.abort(); clearTimeout(timer); clearTimeout(deadline); };
  }, [key, active, offline]);
  return { data, fetchedAt, loading, error, cacheError, now };
}
