import { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Animated, AppState, Pressable, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@react-native-vector-icons/ionicons/static';
import * as ExpoLocation from 'expo-location';
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
import { parsePlace, type Place } from '../../providers/openMeteo';
import { useWarnings } from '../warnings/useWarnings';
import { WarningsSheet, severityColors } from '../warnings/WarningsSheet';
import { areaLabel } from '../warnings/areas';
import { warningPhase, warningsForArea, warningSummary } from '../../providers/imgw';
import { LightningLayer } from '../lightning/LightningLayer';
import { LightningSheet } from '../lightning/LightningSheet';
import { useLightning } from '../lightning/useLightning';
import { type Bounds } from '../../providers/dmiLightning';
import { formatFrameTime, isStale } from '../../providers/rainviewer';
import { DEFAULT_PLACE, SELECTED_PLACE_KEY, placeHeadline } from './selectedPlace';

type Sheet = 'layers' | 'forecast' | 'warnings' | 'location' | 'settings' | 'lightning' | null;
type Action = 'layers' | 'forecast' | 'warnings' | 'settings';

export function MapScreen() {
  const { colors, resolved, reducedMotion, storageError: themeStorageError } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [sheet, setSheet] = useState<Sheet>(null);
  const [activeAction, setActiveAction] = useState<Action>('layers');
  const [mapOpacity] = useState(() => new Animated.Value(1));
  const previousTheme = useRef(resolved);
  const transitioning = useRef(false);
  const insets = useSafeAreaInsets();
  const network = useNetInfo();
  const offline = network.isConnected === false || network.isInternetReachable === false;
  const radar = useRadar(offline);
  const invalidateRadarPrepared = radar.invalidatePrepared;
  const warnings = useWarnings(offline);
  const lightning = useLightning(offline);
  const [lightningMaxAge, setLightningMaxAge] = useState<10 | 30 | 60>(60);
  const radarTileError = radar.onTileError;
  const camera = useRef<CameraRef>(null);
  const map = useRef<MapRef>(null);
  const current = useRef<SavedCamera>(DEFAULT_CAMERA);
  const zoomTarget = useRef(DEFAULT_CAMERA.zoom);
  const writes = useRef(Promise.resolve());
  const [initial, setInitial] = useState<SavedCamera | null>(null);
  const [center, setCenter] = useState(DEFAULT_CAMERA.center);
  const [loaded, setLoaded] = useState(false);
  const [mapError, setMapError] = useState(false);
  const [storageError, setStorageError] = useState(false);
  const [forecastPlace, setForecastPlace] = useState<Place | null>(null);
  const [namedPlace, setNamedPlace] = useState<Place | null>(null);
  const geocodeGeneration = useRef(0);
  function savePlace(place: Place) {
    setNamedPlace(place);
    writes.current = writes.current.then(() => AsyncStorage.setItem(SELECTED_PLACE_KEY, JSON.stringify(place)))
      .catch(() => { setStorageError(true); });
  }
  const location = useRequestedLocation((coordinates) => {
    const generation = ++geocodeGeneration.current;
    setNamedPlace(null);
    writes.current = writes.current.then(() => AsyncStorage.removeItem(SELECTED_PLACE_KEY))
      .catch(() => { setStorageError(true); });
    zoomTarget.current = 11;
    camera.current?.easeTo({ center: coordinates, zoom: 11, duration: 500 });
    if (AppState.currentState !== 'active') return;
    void ExpoLocation.reverseGeocodeAsync({ latitude: coordinates[1], longitude: coordinates[0] })
      .then(addresses => {
        if (generation !== geocodeGeneration.current || AppState.currentState !== 'active') return;
        const address = addresses[0];
        const name = address?.city || address?.district || address?.subregion || address?.region || address?.country;
        if (name) savePlace({ name, center: coordinates });
      }).catch(() => {}); // Coordinates remain available when reverse geocoding fails.
  });

  useEffect(() => {
    if (previousTheme.current === resolved) return;
    previousTheme.current = resolved;
    invalidateRadarPrepared();
    transitioning.current = !reducedMotion;
    if (reducedMotion) { mapOpacity.setValue(1); return; }
    Animated.timing(mapOpacity, { toValue: 0.85, duration: 120, useNativeDriver: true }).start();
    const fallback = setTimeout(() => { transitioning.current = false; Animated.timing(mapOpacity, { toValue: 1, duration: 180, useNativeDriver: true }).start(); }, 1200);
    return () => clearTimeout(fallback);
  }, [resolved, reducedMotion, mapOpacity, invalidateRadarPrepared]);
  function finishThemeTransition() {
    if (!transitioning.current) return;
    transitioning.current = false;
    Animated.timing(mapOpacity, { toValue: 1, duration: 180, useNativeDriver: true }).start();
  }

  useEffect(() => {
    let active = true;
    void Promise.allSettled([AsyncStorage.getItem(CAMERA_KEY), AsyncStorage.getItem(SELECTED_PLACE_KEY)]).then(([cameraResult, placeResult]) => {
      if (!active) return;
      let saved: SavedCamera | null = null;
      let place: Place | null = null;
      try { if (cameraResult.status === 'fulfilled' && cameraResult.value) saved = parseCamera(JSON.parse(cameraResult.value)); }
      catch { setStorageError(true); }
      try { if (placeResult.status === 'fulfilled' && placeResult.value) place = parsePlace(JSON.parse(placeResult.value)); }
      catch { setStorageError(true); }
      if (cameraResult.status === 'rejected' || placeResult.status === 'rejected') setStorageError(true);
      current.current = saved ?? DEFAULT_CAMERA;
      zoomTarget.current = current.current.zoom;
      setInitial(current.current); setCenter(current.current.center);
      const atDefaultPlace = Math.abs(current.current.center[0] - DEFAULT_PLACE.center[0]) < 0.1 &&
        Math.abs(current.current.center[1] - DEFAULT_PLACE.center[1]) < 0.1;
      const selected = place ?? (atDefaultPlace ? DEFAULT_PLACE : null);
      setNamedPlace(selected);
      if (selected === DEFAULT_PLACE) {
        writes.current = writes.current.then(() => AsyncStorage.setItem(SELECTED_PLACE_KEY, JSON.stringify(DEFAULT_PLACE)))
          .catch(() => { setStorageError(true); });
      }
    });
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
    geocodeGeneration.current++;
    savePlace(place); setCenter(place.center);
    zoomTarget.current = 10;
    camera.current?.easeTo({ center: place.center, zoom: 10, duration: 400 });
    setSheet(null);
  }

  function zoomBy(step: number) {
    const zoom = Math.max(2, Math.min(18, zoomTarget.current + step));
    if (zoom === zoomTarget.current) return;
    zoomTarget.current = zoom;
    camera.current?.zoomTo(zoom, { duration: 250 });
  }

  const placeName = placeHeadline(namedPlace, center);
  function openSheet(next: Exclude<Sheet, null>) { setSheet(next); }
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
        onDidFinishRenderingMapFully={() => { setLoaded(true); setMapError(false); finishThemeTransition(); radar.markDisplayReady(); }}
        onDidFinishRenderingFrameFully={({ nativeEvent }) => radar.onFullyRendered(nativeEvent)}
        onRegionWillChange={({ nativeEvent }) => { if (nativeEvent.userInteraction || nativeEvent.animated) radar.cameraStart(); }}
        onRegionDidChange={({ nativeEvent }) => {
          radar.cameraEnd(nativeEvent.bounds, nativeEvent.zoom);
          lightning.setViewBounds(nativeEvent.bounds);
          const value = parseCamera({ center: nativeEvent.center, zoom: nativeEvent.zoom });
          if (value) { zoomTarget.current = value.zoom; setCenter(value.center); persist(value); }
        }}>
        <Camera ref={camera} initialViewState={initial} minZoom={2} maxZoom={18} />
        <RadarLayers displayed={radar.displayed} staged={radar.staged} cached={radar.cached} enabled={radar.enabled} opacity={radar.opacity} />
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
    <View style={styles.spacer} pointerEvents="box-none">
      <View style={styles.mapControls}>
        <Pressable accessibilityRole="button" accessibilityLabel="Zoom in" accessibilityHint="Increase map zoom"
          onPress={() => zoomBy(1)} style={styles.mapControl}>
          <Ionicons name="add" size={24} color={colors.text} />
        </Pressable>
        <Pressable accessibilityRole="button" accessibilityLabel="Zoom out" accessibilityHint="Decrease map zoom"
          onPress={() => zoomBy(-1)} style={styles.mapControl}>
          <Ionicons name="remove" size={24} color={colors.text} />
        </Pressable>
        <Pressable accessibilityRole="button" accessibilityLabel="Recenter on my location" accessibilityHint="Request location and center the map"
          accessibilityState={{ disabled: location.busy }} disabled={location.busy} onPress={() => { void location.locate(); }}
          style={[styles.mapControl, location.busy && styles.mapControlBusy]}>
          {location.busy ? <ActivityIndicator color={colors.accent} /> : <Ionicons name="locate-outline" size={24} color={colors.text} />}
        </Pressable>
      </View>
    </View>
    <View>
      {location.message && <Text accessibilityLiveRegion="polite" style={styles.feedback}>{location.message}</Text>}
      {themeStorageError && <Text style={styles.feedback}>Theme settings could not be saved.</Text>}
      {storageError && <Text style={styles.feedback}>Settings could not be saved. The map may return to Gdynia when you restart the app.</Text>}
    </View>
    <RadarPanel radar={radar} activeAction={activeAction}
      warningActive={activeWarnings.length > 0} warningColor={severityColors(highestSeverity, colors).color} warningLabel={warningLabel}
      locating={location.busy} onLayers={() => { setActiveAction('layers'); openSheet('layers'); }}
      onForecast={() => { setActiveAction('forecast'); setForecastPlace({ name: placeName, center }); openSheet('forecast'); }}
      onWarnings={() => { setActiveAction('warnings'); openSheet('warnings'); }}
      onLocate={() => { void location.locate(); }} onSettings={() => { setActiveAction('settings'); openSheet('settings'); }} />
    {sheet === 'layers' && <LayersSheet rainEnabled={radar.enabled} onRainChange={() => radar.setEnabled(!radar.enabled)} lightningEnabled={lightning.enabled}
      onLightningChange={() => lightning.setVisible(!lightning.enabled)} onLightningDetails={() => openSheet('lightning')} onClose={() => setSheet(null)} />}
    {sheet === 'location' && <LocationPicker current={{ name: placeName, center }} offline={offline} onSelect={selectPlace} onClose={() => setSheet(null)} />}
    {sheet === 'forecast' && forecastPlace && <ForecastSheet place={forecastPlace} offline={offline} onClose={() => setSheet(null)} />}
    {sheet === 'settings' && <ThemeSheet currentLocation={placeName} onChooseLocation={() => openSheet('location')}
      onZoomIn={() => zoomBy(1)} onZoomOut={() => zoomBy(-1)}
      onClose={() => setSheet(null)} />}
    {sheet === 'warnings' && <WarningsSheet state={warnings} onClose={() => setSheet(null)} />}
    {sheet === 'lightning' && <LightningSheet lightning={lightning} maxAge={lightningMaxAge} setMaxAge={setLightningMaxAge} currentBounds={currentBounds} onClose={() => setSheet(null)} />}
  </View>;
}

function makeStyles(c: ThemeColors) { return StyleSheet.create({
  screen: { flex: 1, backgroundColor: c.background },
  mapArea: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0 },
  spacer: { flex: 1, justifyContent: 'flex-end', alignItems: 'flex-end' },
  mapControls: { marginRight: 16, marginBottom: 12, gap: 8 },
  mapControl: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center', borderRadius: 16,
    backgroundColor: c.surface, borderWidth: 1, borderColor: c.border, elevation: 4 },
  mapControlBusy: { opacity: 0.65 },
  top: { position: 'absolute', left: 20, right: 20, gap: 3 },
  place: { color: c.text, fontSize: 25, fontWeight: '700', textShadowColor: c.surface, textShadowRadius: 5 },
  radarTime: { color: c.text, fontSize: 16, textShadowColor: c.surface, textShadowRadius: 5 },
  notice: { backgroundColor: c.surface, borderRadius: 12, padding: 12, flexDirection: 'row', gap: 8 },
  noticeText: { color: c.text, flex: 1, fontSize: 14 },
  feedback: { fontSize: 14, lineHeight: 21, color: c.warning, backgroundColor: c.warningSurface, borderRadius: 8, padding: 10, marginTop: 8 },
}); }
