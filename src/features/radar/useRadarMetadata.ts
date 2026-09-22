import { useEffect, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { parseRadarMetadata, RADAR_METADATA_URL, RADAR_REFRESH_MS, retryDelay, type RadarMetadata } from '../../providers/rainviewer';

const CACHE_KEY = 'weather-radar.metadata.v1';
export function useRadarMetadata(active: boolean, offline: boolean) {
  const [data, setData] = useState<RadarMetadata | null>(null);
  const [fetchedAt, setFetchedAt] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [cacheError, setCacheError] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const lastSuccess = useRef(0);
  const nextAttempt = useRef(0);
  const failures = useRef(0);

  useEffect(() => {
    let alive = true;
    void AsyncStorage.getItem(CACHE_KEY).then((raw) => {
      if (!raw || !alive) return;
      const cached = JSON.parse(raw);
      if (typeof cached.fetchedAt !== 'number' || !Number.isFinite(cached.fetchedAt) || cached.fetchedAt > Date.now()) return;
      const parsed = parseRadarMetadata(cached.raw);
      setData(parsed); setFetchedAt(cached.fetchedAt);
    }).catch(() => { if (alive) setCacheError(true); }).finally(() => { if (alive) setHydrated(true); });
    return () => { alive = false; };
  }, []);

  useEffect(() => {
    if (!hydrated || !active || offline) return;
    let alive = true;
    let controller: AbortController | undefined;
    let timer: ReturnType<typeof setTimeout> | undefined;
    async function refresh() {
      const wait = Math.max(lastSuccess.current + RADAR_REFRESH_MS, nextAttempt.current) - Date.now();
      if (wait > 0) { timer = setTimeout(() => { void refresh(); }, wait); return; }
      controller = new AbortController();
      const deadline = setTimeout(() => controller?.abort(), 15000);
      setLoading(true);
      try {
        const response = await fetch(RADAR_METADATA_URL, { signal: controller.signal });
        if (!response.ok) throw new Error(`Radar metadata HTTP ${response.status}`);
        const text = await response.text();
        if (text.length > 128_000) throw new Error('Radar metadata too large');
        const raw: unknown = JSON.parse(text);
        const parsed = parseRadarMetadata(raw);
        if (!alive) return;
        const now = Date.now();
        setData(parsed); setFetchedAt(now); setError(false);
        lastSuccess.current = now; nextAttempt.current = 0; failures.current = 0;
        // Do not evict usable history when a valid response temporarily has no frames.
        if (parsed.frames.length) void AsyncStorage.setItem(CACHE_KEY, JSON.stringify({ raw, fetchedAt: now }))
          .catch(() => { if (alive) setCacheError(true); });
      } catch {
        if (alive) { setError(true); nextAttempt.current = Date.now() + retryDelay(failures.current++); }
      } finally {
        clearTimeout(deadline);
        if (alive) { setLoading(false); timer = setTimeout(() => { void refresh(); }, 1000); }
      }
    }
    void refresh();
    return () => { alive = false; controller?.abort(); clearTimeout(timer); setLoading(false); };
  }, [active, offline, hydrated]);
  return { data, fetchedAt, loading: !hydrated || loading, error, cacheError };
}
