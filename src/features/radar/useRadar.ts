import { useCallback, useEffect, useReducer, useRef, useState } from 'react';
import { AppState } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { NetworkManager } from '@maplibre/maplibre-react-native';
import { frameKey, type RadarFrame } from '../../providers/rainviewer';
import { INITIAL_PLAYBACK, nextFrame, playbackReducer } from './playback';
import { useRadarMetadata } from './useRadarMetadata';

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
  const [now, setNow] = useState(() => Date.now());
  const [state, dispatch] = useReducer(playbackReducer, INITIAL_PLAYBACK);
  const metadata = useRadarMetadata(active, offline);
  const live = useRef(state);
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
  useEffect(() => {
    if (!canLoad || !preferencesReady) { dispatch({ type: 'cancel' }); return; }
    const frames = metadata.data?.frames;
    if (frames?.length && !state.displayed && !state.staged && !state.error) {
      dispatch({ type: 'select', frame: frames[frames.length - 1] });
    }
  }, [canLoad, preferencesReady, metadata.data, state.displayed, state.staged, state.error]);
  useEffect(() => {
    if (!canLoad || offline || !state.playing || state.staged || !state.displayed) return;
    const next = nextFrame(metadata.data?.frames ?? [], state.displayed.frame);
    if (next && frameKey(next) !== frameKey(state.displayed.frame)) dispatch({ type: 'preload', frame: next });
  }, [canLoad, offline, state.playing, state.staged, state.displayed, metadata.data]);
  useEffect(() => {
    if (!canLoad || offline || !state.playing || !state.staged?.ready) return;
    const timer = setTimeout(() => dispatch({ type: 'advance' }), 850);
    return () => clearTimeout(timer);
  }, [canLoad, offline, state.playing, state.staged]);
  useEffect(() => {
    if (!state.staged || state.staged.ready) return;
    const id = state.staged.id;
    const timer = setTimeout(() => dispatch({ type: 'failed', id }), 12000);
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
  }, []);
  const onTileError = useCallback((message: string) => {
    const source = message.match(/source (radar-\d+)/)?.[1];
    if (source && source !== live.current.staged?.id && source !== live.current.displayed?.id) return;
    setTileError(true);
    if (/429|budget|rate.limit/i.test(message)) setRetryAt(Date.now() + 60000);
    const staged = live.current.staged;
    if (staged) dispatch({ type: 'failed', id: staged.id });
    dispatch({ type: 'pause' });
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
    setMoving(true); setViewportLoading(true); dispatch({ type: 'cancel' });
  }
  function cameraEnd() {
    if (cameraSettle.current) clearTimeout(cameraSettle.current);
    cameraSettle.current = setTimeout(() => setMoving(false), 350);
  }
  return { ...metadata, ...state, metadataError: metadata.error, playbackError: state.error, active, enabled, setEnabled, opacity, setOpacity, now, offline,
    preferenceError, viewportLoading, tileError, retryAt, select, togglePlay, cameraStart, cameraEnd, onFullyRendered, onTileError };
}
