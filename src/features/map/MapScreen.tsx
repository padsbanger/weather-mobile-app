import { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Animated, Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNetInfo } from '@react-native-community/netinfo';
import { Camera, LogManager, Map, type CameraRef } from '@maplibre/maplibre-react-native';
import { basemap, darkBasemap, lightMapStyle } from '../../providers/basemap';
import { CAMERA_KEY, DEFAULT_CAMERA, parseCamera, type SavedCamera } from '../../storage/camera';
import { type ThemeColors } from '../../theme/tokens';
import { useTheme } from '../../theme/ThemeProvider';
import { ThemeSheet } from '../../theme/ThemeSheet';
import { useRequestedLocation } from './useRequestedLocation';
import { useRadar } from '../radar/useRadar';
import { RadarLayers } from '../radar/RadarLayers';
import { RadarPanel } from '../radar/RadarPanel';
import { LocationPicker } from './LocationPicker';
import { ForecastSheet } from '../forecast/ForecastSheet';
import { type Place } from '../../providers/openMeteo';
import { useWarnings } from '../warnings/useWarnings';
import { WarningsSheet, severityColors } from '../warnings/WarningsSheet';
import { areaLabel } from '../warnings/areas';
import { warningPhase, warningsForArea, warningSummary } from '../../providers/imgw';

function Button({ label, children, onPress, disabled = false }: {
  label: string; children: React.ReactNode; onPress: () => void; disabled?: boolean;
}) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  return <Pressable accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ disabled }} disabled={disabled}
    onPress={onPress} style={({ pressed }) => [styles.button, (pressed || disabled) && styles.dim]}>
    <Text style={styles.buttonText}>{children}</Text>
  </Pressable>;
}

export function MapScreen() {
  const { colors, resolved, reducedMotion, storageError: themeStorageError } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [themeOpen, setThemeOpen] = useState(false);
  const [mapOpacity] = useState(() => new Animated.Value(1));
  const previousTheme = useRef(resolved);
  const transitioning = useRef(false);
  const insets = useSafeAreaInsets();
  const network = useNetInfo();
  const offline = network.isConnected === false || network.isInternetReachable === false;
  const radar = useRadar(offline);
  const warnings = useWarnings(offline);
  const [warningsOpen, setWarningsOpen] = useState(false);
  const radarTileError = radar.onTileError;
  const camera = useRef<CameraRef>(null);
  const current = useRef<SavedCamera>(DEFAULT_CAMERA);
  const writes = useRef(Promise.resolve());
  const [initial, setInitial] = useState<SavedCamera | null>(null);
  const [center, setCenter] = useState(DEFAULT_CAMERA.center);
  const [loaded, setLoaded] = useState(false);
  const [mapError, setMapError] = useState(false);
  const [storageError, setStorageError] = useState(false);
  const [modal, setModal] = useState(false);
  const [forecastPlace, setForecastPlace] = useState<Place | null>(null);
  const [namedPlace, setNamedPlace] = useState<Place | null>(null);
  const location = useRequestedLocation((coordinates) => camera.current?.easeTo({ center: coordinates, zoom: 11, duration: 500 }));

  useEffect(() => {
    if (previousTheme.current === resolved) return;
    previousTheme.current = resolved;
    transitioning.current = !reducedMotion;
    if (reducedMotion) { mapOpacity.setValue(1); return; }
    Animated.timing(mapOpacity, { toValue: 0.85, duration: 120, useNativeDriver: true }).start();
    const fallback = setTimeout(() => { transitioning.current = false; Animated.timing(mapOpacity, { toValue: 1, duration: 180, useNativeDriver: true }).start(); }, 1200);
    return () => clearTimeout(fallback);
  }, [resolved, reducedMotion, mapOpacity]);
  function finishThemeTransition() {
    if (!transitioning.current) return;
    transitioning.current = false;
    Animated.timing(mapOpacity, { toValue: 1, duration: 180, useNativeDriver: true }).start();
  }

  useEffect(() => {
    let active = true;
    void AsyncStorage.getItem(CAMERA_KEY).then((raw) => {
      const saved = raw ? parseCamera(JSON.parse(raw)) : null;
      if (active) { current.current = saved ?? DEFAULT_CAMERA; setInitial(current.current); setCenter(current.current.center); }
    }).catch(() => { if (active) { setStorageError(true); setInitial(DEFAULT_CAMERA); } });
    LogManager.onLog(({ level, message }) => {
      if ((level === 'error' || level === 'warn') && /tile|http|source/i.test(message) && !/cancel/i.test(message)) {
        if (!/source radar-|rainviewer|radar tile budget/i.test(message)) setMapError(true);
        if (!/source basemap|openstreetmap/i.test(message)) radarTileError(message);
        if (__DEV__) console.info(`Map resource unavailable: ${message}`);
        return true; // The app reports recoverable tile failures; avoid a blocking dev LogBox.
      }
      return false;
    });
    return () => { active = false; LogManager.onLog(() => false); };
  }, [radarTileError]);

  useEffect(() => {
    if (loaded) return;
    const timer = setTimeout(() => setMapError(true), 20000);
    return () => clearTimeout(timer);
  }, [loaded]);

  function persist(value: SavedCamera) {
    current.current = value;
    // Serialize writes so an older camera cannot overwrite the latest gesture.
    writes.current = writes.current.then(() => AsyncStorage.setItem(CAMERA_KEY, JSON.stringify(value)))
      .catch(() => { setStorageError(true); });
  }

  function selectPlace(place: Place) {
    setNamedPlace(place); setCenter(place.center);
    camera.current?.easeTo({ center: place.center, zoom: 10, duration: 400 });
    setModal(false);
  }

  const nearGdynia = Math.abs(center[0] - 18.538) < 0.02 && Math.abs(center[1] - 54.5189) < 0.02;
  const placeName = namedPlace && Math.abs(center[0] - namedPlace.center[0]) < 0.001 && Math.abs(center[1] - namedPlace.center[1]) < 0.001
    ? namedPlace.name : nearGdynia ? 'Gdynia' : `${center[1].toFixed(3)}°, ${center[0].toFixed(3)}°`;
  function openSheet() { if (radar.playing) radar.togglePlay(); }
  const activeWarnings = warningsForArea(warnings.data, warnings.area).filter(w => warningPhase(w, warnings.now) === 'active');
  const highestSeverity = activeWarnings.reduce<1 | 2 | 3>((level, w) => w.severity > level ? w.severity : level, 1);
  return <View style={[styles.screen, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
    <View style={styles.mapArea}>
      {initial && <Animated.View style={[StyleSheet.absoluteFill, { opacity: mapOpacity }]}><Map mapStyle={resolved === 'dark' ? darkBasemap.style : lightMapStyle} style={StyleSheet.absoluteFill} attribution={false}
        logo={false} compass={false} touchRotate={false} touchPitch={false}
        onDidFinishLoadingMap={() => { setLoaded(true); finishThemeTransition(); }} onDidFailLoadingMap={() => { setMapError(true); finishThemeTransition(); }}
        onDidFinishRenderingMapFully={() => { setLoaded(true); setMapError(false); finishThemeTransition(); }}
        onDidFinishRenderingFrameFully={({ nativeEvent }) => radar.onFullyRendered(nativeEvent)}
        onRegionWillChange={({ nativeEvent }) => { if (nativeEvent.userInteraction || nativeEvent.animated) radar.cameraStart(); }}
        onRegionDidChange={({ nativeEvent }) => {
          radar.cameraEnd();
          const value = parseCamera({ center: nativeEvent.center, zoom: nativeEvent.zoom });
          if (value) { setCenter(value.center); persist(value); }
        }}>
        <Camera ref={camera} initialViewState={initial} minZoom={2} maxZoom={18} />
        <RadarLayers displayed={radar.displayed} staged={radar.staged} enabled={radar.enabled} opacity={radar.opacity} />
      </Map></Animated.View>}
      <View style={styles.top}>
        <Pressable accessibilityRole="button" accessibilityLabel="Choose a location on the map" style={styles.location}
          onPress={() => { openSheet(); setModal(true); }}>
          <Text style={styles.title}>⌖  {placeName} <Text style={styles.accent}>⌄</Text></Text>
        </Pressable>
        <View style={styles.layerRow}><Pressable accessibilityRole="switch" accessibilityLabel="Rain radar layer" accessibilityState={{ checked: radar.enabled }}
          onPress={() => radar.setEnabled(!radar.enabled)} style={[styles.rainPill, radar.enabled && styles.rainPillActive]}>
          <Text style={[styles.rainText, radar.enabled && styles.rainTextActive]}>☂  Rain</Text>
        </Pressable>
        <Pressable accessibilityRole="button" accessibilityLabel="Forecast for map center" style={styles.rainPill}
          onPress={() => { openSheet(); setForecastPlace({ name: placeName, center }); }}><Text style={styles.rainText}>Forecast</Text></Pressable>
        <Pressable accessibilityRole="button" accessibilityLabel="Open theme settings" style={styles.rainPill}
          onPress={() => setThemeOpen(true)}><Text style={styles.rainText}>Theme</Text></Pressable>
        <Pressable accessibilityRole="button" accessibilityLabel="Open weather warnings" style={styles.rainPill}
          onPress={() => { openSheet(); setWarningsOpen(true); }}><Text style={styles.rainText}>Warnings</Text></Pressable></View>
        {warnings.area && <Pressable accessibilityRole="button" accessibilityLabel={`Warnings for ${areaLabel(warnings.area)}. ${warningSummary(warnings.data, warnings.area, warnings.now, warnings.fetchedAt, offline, warnings.error)}`}
          onPress={() => { openSheet(); setWarningsOpen(true); }} style={[styles.warningBanner, activeWarnings.length > 0 && { backgroundColor: severityColors(highestSeverity, colors).backgroundColor }]}>
          <Text numberOfLines={1} style={styles.credit}>IMGW-PIB · {areaLabel(warnings.area)} · manual area</Text>
          <Text style={[styles.warningText, activeWarnings.length > 0 && { color: severityColors(highestSeverity, colors).color }]}>{warningSummary(warnings.data, warnings.area, warnings.now, warnings.fetchedAt, offline, warnings.error)}</Text>
        </Pressable>}
        {(offline || mapError || !loaded) && <View accessibilityLiveRegion="polite" style={styles.notice}>
          {!loaded && !offline && !mapError && <ActivityIndicator color={colors.accent} />}
          <Text style={styles.noticeText}>{offline ? 'Offline · only previously loaded map areas are available.' : mapError ? 'The map could not load completely. Some areas may be missing.' : 'Loading map…'}</Text>
        </View>}
      </View>
      <View style={styles.controls}>
        <Button label="Show my location" onPress={() => { void location.locate(); }} disabled={location.busy}>{location.busy ? '…' : '◎'}</Button>
        <Button label="Zoom in" onPress={() => camera.current?.zoomTo(Math.min(18, current.current.zoom + 1), { duration: 250 })}>+</Button>
        <Button label="Zoom out" onPress={() => camera.current?.zoomTo(Math.max(2, current.current.zoom - 1), { duration: 250 })}>−</Button>
      </View>
      <View style={styles.credits}>
        <Pressable accessibilityRole="link" accessibilityLabel={resolved === 'dark' ? 'OpenFreeMap, OpenMapTiles and OpenStreetMap copyright' : 'OpenStreetMap copyright'} style={styles.attribution}
          onPress={() => { void Linking.openURL(resolved === 'dark' ? darkBasemap.attributionUrl : basemap.attributionUrl); }}><Text style={styles.credit}>{resolved === 'dark' ? darkBasemap.attribution : basemap.attribution}</Text></Pressable>
        <Pressable accessibilityRole="link" accessibilityLabel="Weather data by RainViewer" style={styles.attribution}
          onPress={() => { void Linking.openURL('https://www.rainviewer.com/'); }}><Text style={styles.credit}>Radar by RainViewer</Text></Pressable>
      </View>
    </View>
    <View>
      {location.message && <Text accessibilityLiveRegion="polite" style={styles.feedback}>{location.message}</Text>}
      {themeStorageError && <Text style={styles.feedback}>Theme settings could not be saved.</Text>}
      {storageError && <Text style={styles.feedback}>Settings could not be saved. The map may return to Gdynia when you restart the app.</Text>}
    </View>
    <RadarPanel radar={radar} />
    {modal && <LocationPicker current={{ name: placeName, center }} offline={offline} onSelect={selectPlace} onClose={() => setModal(false)} />}
    {forecastPlace && <ForecastSheet place={forecastPlace} offline={offline} onClose={() => setForecastPlace(null)} />}
    {themeOpen && <ThemeSheet onClose={() => setThemeOpen(false)} />}
    {warningsOpen && <WarningsSheet state={warnings} onClose={() => setWarningsOpen(false)} />}
  </View>;
}

function makeStyles(c: ThemeColors) { return StyleSheet.create({
  screen: { flex: 1, backgroundColor: c.background },
  mapArea: { flex: 1, minHeight: 240 },
  top: { position: 'absolute', top: 16, left: 16, right: 16, gap: 8 },
  layerRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  warningBanner: { backgroundColor: c.surface, borderRadius: 12, padding: 12, minHeight: 48, gap: 4 },
  warningText: { color: c.text, fontSize: 14, fontWeight: '600' },
  location: { backgroundColor: c.surface, borderRadius: 16, paddingHorizontal: 16, paddingVertical: 12, elevation: 3, minHeight: 48 },
  eyebrow: { color: c.muted, fontSize: 11, letterSpacing: 1.4, fontWeight: '600' },
  title: { color: c.text, fontSize: 18, fontWeight: '600' },
  rainPill: { alignSelf: 'flex-start', backgroundColor: c.surface, borderRadius: 24, minHeight: 48, paddingHorizontal: 20, justifyContent: 'center', elevation: 2 },
  rainPillActive: { backgroundColor: c.accent }, rainText: { color: c.text, fontSize: 16, fontWeight: '600' }, rainTextActive: { color: c.onAccent },
  accent: { color: c.accent },
  notice: { backgroundColor: c.surface, borderRadius: 12, padding: 12, flexDirection: 'row', gap: 8 },
  noticeText: { color: c.text, flex: 1, fontSize: 14 },
  controls: { position: 'absolute', right: 16, bottom: 64, gap: 8 },
  button: { minWidth: 48, minHeight: 48, paddingHorizontal: 14, paddingVertical: 10, backgroundColor: c.surface, borderRadius: 24, borderWidth: 1, borderColor: c.border, justifyContent: 'center', alignItems: 'center' },
  buttonText: { color: c.accent, fontSize: 22, fontWeight: '600' },
  dim: { opacity: 0.55 },
  credits: { position: 'absolute', bottom: 0, left: 0, right: 0, flexDirection: 'row', justifyContent: 'space-between', backgroundColor: c.surface },
  attribution: { minHeight: 48, flexShrink: 1, justifyContent: 'center', paddingHorizontal: 8 },
  credit: { color: c.text, fontSize: 10 },
  panel: { backgroundColor: c.surface, padding: 20, borderTopLeftRadius: 24, borderTopRightRadius: 24, borderTopWidth: 1, borderColor: c.border },
  handle: { width: 36, height: 4, borderRadius: 2, backgroundColor: c.border, alignSelf: 'center', marginBottom: 16 },
  heading: { fontSize: 23, fontWeight: '700', color: c.text },
  body: { fontSize: 15, lineHeight: 23, color: c.muted, marginTop: 8 },
  feedback: { fontSize: 14, lineHeight: 21, color: c.warning, backgroundColor: c.warningSurface, borderRadius: 8, padding: 10, marginTop: 8 },
  modalBackdrop: { flex: 1, backgroundColor: c.background, justifyContent: 'flex-end' },
  modalPanel: { padding: 24, gap: 12 },
  label: { color: c.text, fontSize: 15 },
  input: { minHeight: 48, borderWidth: 1, borderColor: c.border, borderRadius: 12, padding: 12, color: c.text, backgroundColor: c.surface, fontSize: 18 },
}); }
