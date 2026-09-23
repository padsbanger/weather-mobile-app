import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { boundsContain, lightningUrl, parseLightning, type Bounds, type LightningFeed } from '../../providers/dmiLightning';

export function useLightning(offline: boolean) {
  const [active, setActive] = useState(AppState.currentState === 'active');
  const [enabled, setEnabled] = useState(false);
  const [feed, setFeed] = useState<LightningFeed | null>(null);
  const [fetchedAt, setFetchedAt] = useState(0);
  const [queryBounds, setQueryBounds] = useState<Bounds | null>(null);
  const [viewBounds, setViewBounds] = useState<Bounds | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [now, setNow] = useState(Date.now);
  const controller = useRef<AbortController | null>(null);
  const requestId = useRef(0);

  useEffect(() => {
    const requests = requestId;
    const pending = controller;
    const sub = AppState.addEventListener('change', state => {
      const foreground = state === 'active';
      setActive(foreground);
      setNow(Date.now());
      if (!foreground) { requests.current++; pending.current?.abort(); setLoading(false); }
    });
    return () => { sub.remove(); requests.current++; pending.current?.abort(); };
  }, []);
  useEffect(() => {
    if (!active || !enabled) return;
    const timer = setInterval(() => setNow(Date.now()), 15_000);
    return () => clearInterval(timer);
  }, [active, enabled]);
  useEffect(() => {
    if (!offline) return;
    requestId.current++; controller.current?.abort();
  }, [offline]);

  const refresh = useCallback(async (bounds: Bounds) => {
    if (offline || !active) return;
    let url: string;
    try { url = lightningUrl(bounds); } catch { setError(true); return; }
    requestId.current++;
    const id = requestId.current;
    controller.current?.abort();
    const signal = new AbortController(); controller.current = signal;
    setLoading(true); setError(false);
    const deadline = setTimeout(() => signal.abort(), 15_000);
    try {
      const response = await fetch(url, { signal: signal.signal });
      if (!response.ok) throw new Error(`DMI HTTP ${response.status}`);
      const body = await response.text();
      if (body.length > 750_000) throw new Error('Lightning response too large');
      const fetched = Date.now();
      const parsed = parseLightning(JSON.parse(body), fetched);
      if (id !== requestId.current) return;
      setFeed(parsed); setFetchedAt(fetched); setQueryBounds(bounds); setNow(fetched); setError(false);
    } catch {
      if (id === requestId.current) setError(true);
    } finally {
      clearTimeout(deadline);
      if (id === requestId.current) setLoading(false);
    }
  }, [active, offline]);

  function setVisible(value: boolean) {
    setEnabled(value);
    if (!value) { requestId.current++; controller.current?.abort(); setLoading(false); }
  }
  return { active, enabled, setVisible, feed, fetchedAt, queryBounds, viewBounds, setViewBounds, refresh,
    viewChanged: !!queryBounds && !!viewBounds && !boundsContain(queryBounds, viewBounds), loading: loading && !offline && active, error, offline, now };
}
export type LightningState = ReturnType<typeof useLightning>;
