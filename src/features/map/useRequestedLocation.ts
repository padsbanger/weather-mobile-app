import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import * as Location from 'expo-location';

// A cancellable, one-fix foreground subscription. Never start GPS on mount.
export function useRequestedLocation(onFix: (center: [number, number]) => void) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const generation = useRef(0);
  const subscription = useRef<Location.LocationSubscription | null>(null);
  const timeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const permissionPending = useRef(false);
  const fix = useRef(onFix);
  useEffect(() => { fix.current = onFix; }, [onFix]);
  const cancel = useCallback(() => {
    generation.current++;
    subscription.current?.remove();
    subscription.current = null;
    if (timeout.current) clearTimeout(timeout.current);
    timeout.current = null;
    setBusy(false);
  }, []);
  useEffect(() => {
    const listener = AppState.addEventListener('change', (state) => {
      // Android's permission dialog itself backgrounds the activity. There is
      // no GPS subscription yet, so let the permission result reach the UI.
      if (state === 'background' && !permissionPending.current) cancel();
    });
    return () => { listener.remove(); cancel(); };
  }, [cancel]);

  const locate = useCallback(async () => {
    cancel();
    const request = generation.current;
    setBusy(true);
    setMessage(null);
    try {
      permissionPending.current = true;
      const permission = await Location.requestForegroundPermissionsAsync();
      permissionPending.current = false;
      if (request !== generation.current) return;
      if (!permission.granted) {
        setMessage('Location permission denied. You can pan the map or choose a location manually.');
        cancel();
        return;
      }
      if (AppState.currentState !== 'active') {
        setMessage('Permission saved. Tap the location button again when you return to the map.');
        cancel();
        return;
      }
      timeout.current = setTimeout(() => {
        setMessage('Could not find your location. Try again or choose a location manually.');
        cancel();
      }, 15000);
      const watcher = await Location.watchPositionAsync({ accuracy: Location.Accuracy.High, mayShowUserSettingsDialog: false }, (position) => {
        if (request !== generation.current || AppState.currentState !== 'active') return;
        fix.current([position.coords.longitude, position.coords.latitude]);
        setMessage(`Approximate location · accuracy about ${Math.round(position.coords.accuracy ?? 0)} m`);
        cancel();
      });
      if (request !== generation.current) watcher.remove();
      else subscription.current = watcher;
    } catch {
      permissionPending.current = false;
      if (request !== generation.current) return;
      setMessage('Location unavailable. Check your GPS settings or choose a location manually.');
      cancel();
    }
  }, [cancel]);
  return { busy, message, locate };
}
