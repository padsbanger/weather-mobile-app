import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react';
import { AppState } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { NetworkManager } from '@maplibre/maplibre-react-native';
import { frameKey, type RadarFrame } from '../../providers/rainviewer';
import { INITIAL_PLAYBACK, nextFrame, playbackReducer } from './playback';
import { useRadarMetadata } from './useRadarMetadata';
import { PREFETCH_TILE_BUDGET, prefetchWaitUntil, visibleRadarTileCount, type RadarBounds } from './prefetch';

const PREFERENCES = 'weather-radar.radar-preferences.v1';
export function useRadar(offline: boolean) {
  const [active, setActive] = useState(AppState.currentState === 'active');
  const [enabled, setEnabled] = useState(true);
  const [opacity, setOpacity] = useState(0.7);
  const [preferencesReady, setPreferencesReady] = useState(false);
  const [preferenceError, setPreferenceError] = useState(false);
  const [moving, setMoving] = useState(false);
  const [viewportLoading, setViewportLoading] = useState(false);
  const [tileError, setTileError] = useState(false);
  const [retryAt, setRetryAt] = useState(0);
  const [budgetWaitUntil, setBudgetWaitUntil] = useState(0);
  const [tilesPerFrame, setTilesPerFrame] = useState(4);
  const [now, setNow] = useState(() => Date.now());
  const [state, dispatch] = useReducer(playbackReducer, INITIAL_PLAYBACK);
  const metadata = useRadarMetadata(active, offline);
  const live = useRef(state);
  const movingRef = useRef(false);
  const fullFrameReady = useRef(false);
  const prefetchRequests = useRef<{ at: number; tiles: number }[]>([]);
  const failedUntil = useRef(new Map<string, number>());
  const writes = useRef(Promise.resolve());
  const cameraSettle = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => { if (cameraSettle.current) clearTimeout(cameraSettle.current); }, []);
  useEffect(() => { live.current = state; }, [state]);
  useEffect(() => {
    let mounted = true;
    async function readPreferences() {
      try {
        await writes.current;
        const raw = await AsyncStorage.getItem(PREFERENCES);
        if (raw && mounted) {
          const value = JSON.parse(raw);
          if (typeof value.opacity === 'number' && Number.isFinite(value.opacity) && value.opacity >= 0.1 && value.opacity <= 1) setOpacity(value.opacity);
          if (typeof value.enabled === 'boolean') setEnabled(value.enabled);
        }
      } catch { if (mounted) setPreferenceError(true); }
      finally { if (mounted) setPreferencesReady(true); }
    }
    void readPreferences();
    const subscription = AppState.addEventListener('change', (value) => {
      setActive(value === 'active'); setNow(Date.now());
      if (value !== 'active') { dispatch({ type: 'pause' }); dispatch({ type: 'cancel' }); }
      else void readPreferences();
    });
    return () => { mounted = false; subscription.remove(); };
  }, []);
  useEffect(() => {
    if (!preferencesReady) return;
    writes.current = writes.current.then(() => AsyncStorage.setItem(PREFERENCES, JSON.stringify({ enabled, opacity })))
      .catch(() => setPreferenceError(true));
  }, [enabled, opacity, preferencesReady]);
  useEffect(() => {
    NetworkManager.setConnected(active && !offline);
    if (!active) return;
    const timer = setInterval(() => setNow(Date.now()), 15000);
    return () => clearInterval(timer);
  }, [active, offline]);

  const canLoad = enabled && active && !moving;
  const frames = useMemo(() => metadata.data?.frames ?? [], [metadata.data]);
  const cachedKeys = useMemo(() => new Set(state.cached.map(slot => frameKey(slot.frame))), [state.cached]);
  const preparedCount = frames.filter(frame => cachedKeys.has(frameKey(frame))).length;
  const readyFrames = useMemo(() => frames.filter(frame => cachedKeys.has(frameKey(frame))), [frames, cachedKeys]);
  const allPrepared = frames.length > 0 && preparedCount === frames.length;
  const preparing = canLoad && !offline && !!state.displayed && !allPrepared && !state.error;
  const preloadLimited = Math.max(2, tilesPerFrame * 2) > PREFETCH_TILE_BUDGET;
  useEffect(() => {
    if (!budgetWaitUntil || !canLoad || offline) return;
    const timer = setTimeout(() => setBudgetWaitUntil(0), Math.max(0, budgetWaitUntil - Date.now()));
    return () => clearTimeout(timer);
  }, [budgetWaitUntil, canLoad, offline]);
  useEffect(() => {
    if (!retryAt || !active || offline) return;
    const timer = setTimeout(() => {
      setRetryAt(0); setTileError(false); dispatch({ type: 'clearError' });
    }, Math.max(0, retryAt - Date.now()));
    return () => clearTimeout(timer);
  }, [retryAt, active, offline]);
  useEffect(() => {
    if (metadata.data) {
      dispatch({ type: 'prune', frames: metadata.data.frames });
      const keys = new Set(metadata.data.frames.map(frameKey));
      for (const key of failedUntil.current.keys()) if (!keys.has(key)) failedUntil.current.delete(key);
    }
  }, [metadata.data]);
  useEffect(() => {
    if (!canLoad || !preferencesReady) { dispatch({ type: 'cancel' }); return; }
    const frames = metadata.data?.frames;
    if (frames?.length && !state.displayed && !state.staged && !state.error) {
      dispatch({ type: 'select', frame: frames[frames.length - 1] });
    }
  }, [canLoad, preferencesReady, metadata.data, state.displayed, state.staged, state.error]);
  useEffect(() => {
    if (!canLoad || offline || !state.displayed || state.staged || state.error || allPrepared || retryAt > now || preloadLimited) return;
    const next = [...frames].reverse().find(frame => !cachedKeys.has(frameKey(frame)) &&
      (failedUntil.current.get(frameKey(frame)) ?? 0) <= Date.now());
    if (!next) return;
    const cutoff = Date.now() - 60_000;
    prefetchRequests.current = prefetchRequests.current.filter(entry => entry.at > cutoff);
    const estimatedRequests = Math.max(2, tilesPerFrame * 2);
    const waitUntil = prefetchWaitUntil(prefetchRequests.current, estimatedRequests, Date.now());
    setBudgetWaitUntil(waitUntil);
    if (waitUntil) return;
    prefetchRequests.current.push({ at: Date.now(), tiles: estimatedRequests });
    dispatch({ type: 'preload', frame: next });
  }, [canLoad, offline, state.displayed, state.staged, state.error, frames, cachedKeys, allPrepared, retryAt, now, tilesPerFrame, preloadLimited, budgetWaitUntil]);
  useEffect(() => {
    if (!canLoad || offline || !state.playing || !state.displayed || readyFrames.length < 2) return;
    const next = nextFrame(readyFrames, state.displayed.frame);
    if (!next) return;
    const timer = setTimeout(() => dispatch({ type: 'show', frame: next }), 850);
    return () => clearTimeout(timer);
  }, [canLoad, offline, state.playing, state.displayed, readyFrames]);
  useEffect(() => {
    if (!state.staged || state.staged.ready) return;
    const id = state.staged.id;
    const key = frameKey(state.staged.frame);
    const timer = setTimeout(() => {
      failedUntil.current.set(key, Date.now() + 60000);
      setRetryAt(Date.now() + 30000);
      dispatch({ type: 'failed', id });
    }, 30000);
    return () => clearTimeout(timer);
  }, [state.staged]);
  useEffect(() => {
    if (offline || !enabled) { dispatch({ type: 'pause' }); dispatch({ type: 'cancel' }); }
  }, [offline, enabled]);

  const onFullyRendered = useCallback((payload: unknown) => {
    const ready = (payload as { radarReady?: string[] } | null)?.radarReady;
    if (!Array.isArray(ready)) return;
    setViewportLoading(false);
    const staged = live.current.staged;
    if (staged && ready.includes(`radar-preload-${staged.id}`)) dispatch({ type: 'loaded', id: staged.id });
    const displayed = live.current.displayed;
    if (!movingRef.current && displayed && ready.includes(`radar-preload-${displayed.id}`)) dispatch({ type: 'cacheDisplayed' });
  }, []);
  const markDisplayReady = useCallback(() => {
    fullFrameReady.current = true;
    if (!movingRef.current) dispatch({ type: 'cacheDisplayed' });
  }, []);
  const invalidatePrepared = useCallback(() => {
    fullFrameReady.current = false;
    dispatch({ type: 'invalidate' });
  }, []);
  const onTileError = useCallback((message: string) => {
    const source = message.match(/source (radar-\d+)/)?.[1];
    if (source && source !== live.current.staged?.id && source !== live.current.displayed?.id) return;
    setTileError(true);
    setRetryAt(Date.now() + (/429|budget|rate.limit/i.test(message) ? 60000 : 30000));
    const staged = live.current.staged;
    if (staged) {
      failedUntil.current.set(frameKey(staged.frame), Date.now() + 90000);
      dispatch({ type: 'failed', id: staged.id });
    }
  }, []);
  function select(frame: RadarFrame) { setTileError(false); dispatch({ type: 'select', frame }); }
  function togglePlay() {
    setTileError(false);
    if (state.playing) dispatch({ type: 'pause' });
    else if (state.displayed) dispatch({ type: 'play' });
    else if (metadata.data?.frames.length) select(metadata.data.frames[metadata.data.frames.length - 1]);
  }
  function cameraStart() {
    if (cameraSettle.current) clearTimeout(cameraSettle.current);
    movingRef.current = true; fullFrameReady.current = false;
    setMoving(true); setViewportLoading(true); dispatch({ type: 'invalidate' });
  }
  function cameraEnd(bounds?: RadarBounds, zoom?: number) {
    if (cameraSettle.current) clearTimeout(cameraSettle.current);
    cameraSettle.current = setTimeout(() => {
      movingRef.current = false;
      setMoving(false);
      if (bounds && zoom !== undefined) setTilesPerFrame(visibleRadarTileCount(bounds, zoom));
      if (fullFrameReady.current) dispatch({ type: 'cacheDisplayed' });
    }, 350);
  }
  return { ...metadata, ...state, metadataError: metadata.error, playbackError: state.error, active, enabled, setEnabled, opacity, setOpacity, now, offline,
    preferenceError, viewportLoading, tileError, retryAt, budgetWaitUntil, preparedCount, allPrepared, preparing, preloadLimited, select, togglePlay,
    cameraStart, cameraEnd, markDisplayReady, invalidatePrepared, onFullyRendered, onTileError };
}
