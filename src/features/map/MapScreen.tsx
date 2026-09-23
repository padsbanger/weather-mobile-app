import { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Animated, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNetInfo } from '@react-native-community/netinfo';
import { Camera, LogManager, Map, type CameraRef, type MapRef } from '@maplibre/maplibre-react-native';
import { darkBasemap, lightBasemap } from '../../providers/basemap';
import { CAMERA_KEY, DEFAULT_CAMERA, parseCamera, type SavedCamera } from '../../storage/camera';
import { type ThemeColors } from '../../theme/tokens';
import { useTheme } from '../../theme/ThemeProvider';
import { ThemeSheet } from '../../theme/ThemeSheet';
import { useRequestedLocation } from './useRequestedLocation';
import { useRadar } from '../radar/useRadar';
import { RadarLayers } from '../radar/RadarLayers';
import { RadarPanel } from '../radar/RadarPanel';
import { LocationPicker } from './LocationPicker';
import { LayersSheet } from './LayersSheet';
import { ForecastSheet } from '../forecast/ForecastSheet';
import { type Place } from '../../providers/openMeteo';
import { useWarnings } from '../warnings/useWarnings';
import { WarningsSheet, severityColors } from '../warnings/WarningsSheet';
import { areaLabel } from '../warnings/areas';
import { warningPhase, warningsForArea, warningSummary } from '../../providers/imgw';
import { LightningLayer } from '../lightning/LightningLayer';
import { LightningSheet } from '../lightning/LightningSheet';
import { useLightning } from '../lightning/useLightning';
import { type Bounds } from '../../providers/dmiLightning';
import { formatFrameTime, isStale } from '../../providers/rainviewer';

export function MapScreen() {
  const { colors, resolved, reducedMotion, storageError: themeStorageError } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [themeOpen, setThemeOpen] = useState(false);
  const [layersOpen, setLayersOpen] = useState(false);
  const [mapOpacity] = useState(() => new Animated.Value(1));
  const previousTheme = useRef(resolved);
  const transitioning = useRef(false);
  const insets = useSafeAreaInsets();
  const network = useNetInfo();
  const offline = network.isConnected === false || network.isInternetReachable === false;
  const radar = useRadar(offline);
  const warnings = useWarnings(offline);
  const lightning = useLightning(offline);
  const [lightningOpen, setLightningOpen] = useState(false);
  const [lightningMaxAge, setLightningMaxAge] = useState<10 | 30 | 60>(60);
  const [warningsOpen, setWarningsOpen] = useState(false);
  const radarTileError = radar.onTileError;
  const camera = useRef<CameraRef>(null);
  const map = useRef<MapRef>(null);
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
        if (!/source radar-|rainviewer|radar tile budget|dmi-lightning/i.test(message)) setMapError(true);
        if (!/source basemap|source openmaptiles|openstreetmap|openfreemap|dmi-lightning/i.test(message)) radarTileError(message);
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
  async function currentBounds(): Promise<Bounds | null> {
    try { return await map.current?.getBounds() ?? null; } catch { return null; }
  }
  const activeWarnings = warningsForArea(warnings.data, warnings.area).filter(w => warningPhase(w, warnings.now) === 'active');
  const highestSeverity = activeWarnings.reduce<1 | 2 | 3>((level, w) => w.severity > level ? w.severity : level, 1);
  const warningLabel = warnings.area ? `Selected county: ${areaLabel(warnings.area)}. ${warningSummary(warnings.data, warnings.area, warnings.now, warnings.fetchedAt, offline, warnings.error)}` : 'Choose a county to check warnings.';
  const newestRadar = radar.data?.frames.at(-1);
  const radarStatus = radar.offline ? 'Offline' : radar.metadataError ? 'Update failed' : newestRadar && isStale(newestRadar.time, radar.now) ? 'Outdated' : !radar.enabled ? 'Hidden' : null;
  return <View style={[styles.screen, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
    <View style={styles.mapArea}>
      {initial && <Animated.View style={[StyleSheet.absoluteFill, { opacity: mapOpacity }]}><Map ref={map} mapStyle={resolved === 'dark' ? darkBasemap.style : lightBasemap.style} style={StyleSheet.absoluteFill} attribution={false}
        logo={false} compass={false} touchRotate={false} touchPitch={false}
        onDidFinishLoadingMap={() => { setLoaded(true); finishThemeTransition(); }} onDidFailLoadingMap={() => { setMapError(true); finishThemeTransition(); }}
        onDidFinishRenderingMapFully={() => { setLoaded(true); setMapError(false); finishThemeTransition(); }}
        onDidFinishRenderingFrameFully={({ nativeEvent }) => radar.onFullyRendered(nativeEvent)}
        onRegionWillChange={({ nativeEvent }) => { if (nativeEvent.userInteraction || nativeEvent.animated) radar.cameraStart(); }}
        onRegionDidChange={({ nativeEvent }) => {
          radar.cameraEnd();
          lightning.setViewBounds(nativeEvent.bounds);
          const value = parseCamera({ center: nativeEvent.center, zoom: nativeEvent.zoom });
          if (value) { setCenter(value.center); persist(value); }
        }}>
        <Camera ref={camera} initialViewState={initial} minZoom={2} maxZoom={18} />
        <RadarLayers displayed={radar.displayed} staged={radar.staged} enabled={radar.enabled} opacity={radar.opacity} />
        <LightningLayer lightning={lightning} maxAge={lightningMaxAge} />
      </Map></Animated.View>}
      <View style={[styles.top, { top: insets.top + 16 }]} pointerEvents="none">
        <Text style={styles.place} numberOfLines={1}>{placeName}</Text>
        <Text style={styles.radarTime} accessibilityLiveRegion="polite">Radar · {radar.displayed ? formatFrameTime(radar.displayed.frame.time) : 'Loading'}{radarStatus ? ` · ${radarStatus}` : ''}</Text>
        {(offline || mapError || !loaded) && <View accessibilityLiveRegion="polite" style={styles.notice}>
          {!loaded && !offline && !mapError && <ActivityIndicator color={colors.accent} />}
          <Text style={styles.noticeText}>{offline ? 'Offline · only previously loaded map areas are available.' : mapError ? 'The map could not load completely. Some areas may be missing.' : 'Loading map…'}</Text>
        </View>}
      </View>
    </View>
    <View style={styles.spacer} pointerEvents="none" />
    <View>
      {location.message && <Text accessibilityLiveRegion="polite" style={styles.feedback}>{location.message}</Text>}
      {themeStorageError && <Text style={styles.feedback}>Theme settings could not be saved.</Text>}
      {storageError && <Text style={styles.feedback}>Settings could not be saved. The map may return to Gdynia when you restart the app.</Text>}
    </View>
    <RadarPanel radar={radar} layersActive={radar.enabled || lightning.enabled}
      warningActive={activeWarnings.length > 0} warningColor={severityColors(highestSeverity, colors).color} warningLabel={warningLabel}
      locating={location.busy} onLayers={() => { openSheet(); setLayersOpen(true); }}
      onForecast={() => { openSheet(); setForecastPlace({ name: placeName, center }); }}
      onWarnings={() => { openSheet(); setWarningsOpen(true); }}
      onLocate={() => { void location.locate(); }} onSettings={() => { openSheet(); setThemeOpen(true); }} />
    {layersOpen && <LayersSheet rainEnabled={radar.enabled} onRainChange={() => radar.setEnabled(!radar.enabled)} lightningEnabled={lightning.enabled}
      onLightningChange={() => lightning.setVisible(!lightning.enabled)} onLightningDetails={() => { setLayersOpen(false); setLightningOpen(true); }} onClose={() => setLayersOpen(false)} />}
    {modal && <LocationPicker current={{ name: placeName, center }} offline={offline} onSelect={selectPlace} onClose={() => setModal(false)} />}
    {forecastPlace && <ForecastSheet place={forecastPlace} offline={offline} onClose={() => setForecastPlace(null)} />}
    {themeOpen && <ThemeSheet currentLocation={placeName} onChooseLocation={() => { setThemeOpen(false); setModal(true); }}
      onZoomIn={() => camera.current?.zoomTo(Math.min(18, current.current.zoom + 1), { duration: 250 })}
      onZoomOut={() => camera.current?.zoomTo(Math.max(2, current.current.zoom - 1), { duration: 250 })}
      onClose={() => setThemeOpen(false)} />}
    {warningsOpen && <WarningsSheet state={warnings} onClose={() => setWarningsOpen(false)} />}
    {lightningOpen && <LightningSheet lightning={lightning} maxAge={lightningMaxAge} setMaxAge={setLightningMaxAge} currentBounds={currentBounds} onClose={() => setLightningOpen(false)} />}
  </View>;
}

function makeStyles(c: ThemeColors) { return StyleSheet.create({
  screen: { flex: 1, backgroundColor: c.background },
  mapArea: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0 },
  spacer: { flex: 1 },
  top: { position: 'absolute', left: 20, right: 20, gap: 3 },
  place: { color: c.text, fontSize: 25, fontWeight: '700', textShadowColor: c.surface, textShadowRadius: 5 },
  radarTime: { color: c.text, fontSize: 16, textShadowColor: c.surface, textShadowRadius: 5 },
  notice: { backgroundColor: c.surface, borderRadius: 12, padding: 12, flexDirection: 'row', gap: 8 },
  noticeText: { color: c.text, flex: 1, fontSize: 14 },
  feedback: { fontSize: 14, lineHeight: 21, color: c.warning, backgroundColor: c.warningSurface, borderRadius: 8, padding: 10, marginTop: 8 },
}); }
