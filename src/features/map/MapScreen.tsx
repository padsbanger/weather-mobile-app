import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Linking, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNetInfo } from '@react-native-community/netinfo';
import { Camera, LogManager, Map, type CameraRef } from '@maplibre/maplibre-react-native';
import { basemap, lightMapStyle } from '../../providers/basemap';
import { CAMERA_KEY, DEFAULT_CAMERA, parseCamera, type SavedCamera } from '../../storage/camera';
import { theme } from '../../theme/tokens';
import { useRequestedLocation } from './useRequestedLocation';

function Button({ label, children, onPress, disabled = false }: {
  label: string; children: React.ReactNode; onPress: () => void; disabled?: boolean;
}) {
  return <Pressable accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ disabled }} disabled={disabled}
    onPress={onPress} style={({ pressed }) => [styles.button, (pressed || disabled) && styles.dim]}>
    <Text style={styles.buttonText}>{children}</Text>
  </Pressable>;
}

export function MapScreen() {
  const insets = useSafeAreaInsets();
  const network = useNetInfo();
  const offline = network.isConnected === false || network.isInternetReachable === false;
  const camera = useRef<CameraRef>(null);
  const current = useRef<SavedCamera>(DEFAULT_CAMERA);
  const writes = useRef(Promise.resolve());
  const [initial, setInitial] = useState<SavedCamera | null>(null);
  const [center, setCenter] = useState(DEFAULT_CAMERA.center);
  const [loaded, setLoaded] = useState(false);
  const [mapError, setMapError] = useState(false);
  const [storageError, setStorageError] = useState(false);
  const [modal, setModal] = useState(false);
  const [latitude, setLatitude] = useState('54.5189');
  const [longitude, setLongitude] = useState('18.5380');
  const [inputError, setInputError] = useState(false);
  const location = useRequestedLocation((coordinates) => camera.current?.easeTo({ center: coordinates, zoom: 11, duration: 500 }));

  useEffect(() => {
    let active = true;
    void AsyncStorage.getItem(CAMERA_KEY).then((raw) => {
      const saved = raw ? parseCamera(JSON.parse(raw)) : null;
      if (active) { current.current = saved ?? DEFAULT_CAMERA; setInitial(current.current); setCenter(current.current.center); }
    }).catch(() => { if (active) { setStorageError(true); setInitial(DEFAULT_CAMERA); } });
    LogManager.onLog(({ level, message }) => {
      if ((level === 'error' || level === 'warn') && /tile|http|source/i.test(message) && !/cancel/i.test(message)) setMapError(true);
      return false;
    });
    return () => { active = false; LogManager.onLog(() => false); };
  }, []);

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

  function selectCoordinates() {
    const lat = latitude.trim().replace(',', '.');
    const lon = longitude.trim().replace(',', '.');
    const selected = lat && lon ? parseCamera({ center: [Number(lon), Number(lat)], zoom: 10 }) : null;
    if (!selected) { setInputError(true); return; }
    camera.current?.easeTo({ ...selected, duration: 400 });
    setModal(false);
  }

  const nearGdynia = Math.abs(center[0] - 18.538) < 0.02 && Math.abs(center[1] - 54.5189) < 0.02;
  return <View style={[styles.screen, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
    <View style={styles.mapArea}>
      {initial && <Map mapStyle={lightMapStyle} style={StyleSheet.absoluteFill} attribution={false}
        logo={false} compass={false} touchRotate={false} touchPitch={false}
        onDidFinishLoadingMap={() => setLoaded(true)} onDidFailLoadingMap={() => setMapError(true)}
        onDidFinishRenderingMapFully={() => { setLoaded(true); setMapError(false); }}
        onRegionDidChange={({ nativeEvent }) => {
          const value = parseCamera({ center: nativeEvent.center, zoom: nativeEvent.zoom });
          if (value) { setCenter(value.center); persist(value); }
        }}>
        <Camera ref={camera} initialViewState={initial} minZoom={2} maxZoom={18} />
      </Map>}
      <View style={styles.top}>
        <Pressable accessibilityRole="button" accessibilityLabel="Choose a location on the map" style={styles.location}
          onPress={() => { setLatitude(center[1].toFixed(4)); setLongitude(center[0].toFixed(4)); setInputError(false); setModal(true); }}>
          <Text style={styles.eyebrow}>SELECTED LOCATION</Text>
          <Text style={styles.title}>{nearGdynia ? 'Gdynia' : `${center[1].toFixed(3)}°, ${center[0].toFixed(3)}°`} <Text style={styles.accent}>⌄</Text></Text>
        </Pressable>
        {(offline || mapError || !loaded) && <View accessibilityLiveRegion="polite" style={styles.notice}>
          {!loaded && !offline && !mapError && <ActivityIndicator color={theme.color.accent} />}
          <Text style={styles.noticeText}>{offline ? 'Offline · only previously loaded map areas are available.' : mapError ? 'The map could not load completely. Some areas may be missing.' : 'Loading map…'}</Text>
        </View>}
      </View>
      <View style={styles.controls}>
        <Button label="Show my location" onPress={() => { void location.locate(); }} disabled={location.busy}>{location.busy ? '…' : '◎'}</Button>
        <Button label="Zoom in" onPress={() => camera.current?.zoomTo(Math.min(18, current.current.zoom + 1), { duration: 250 })}>+</Button>
        <Button label="Zoom out" onPress={() => camera.current?.zoomTo(Math.max(2, current.current.zoom - 1), { duration: 250 })}>−</Button>
      </View>
      <Pressable accessibilityRole="link" accessibilityLabel="OpenStreetMap copyright" style={styles.attribution}
        onPress={() => { void Linking.openURL(basemap.attributionUrl); }}><Text style={styles.credit}>{basemap.attribution}</Text></Pressable>
    </View>
    <View style={styles.panel}>
      <View style={styles.handle} />
      <Text style={styles.heading}>Weather map</Text>
      <Text style={styles.body}>Pan the map to choose a location. Tap ◎ to find your location.</Text>
      {location.message && <Text accessibilityLiveRegion="polite" style={styles.feedback}>{location.message}</Text>}
      {storageError && <Text style={styles.feedback}>Settings could not be saved. The map may return to Gdynia when you restart the app.</Text>}
    </View>
    <Modal visible={modal} transparent animationType="slide" onRequestClose={() => setModal(false)}>
      <View style={[styles.modalBackdrop, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.modalPanel}>
          <Text style={styles.heading}>Choose a location</Text>
          <Text style={styles.body}>Enter coordinates, or close this panel and pan the map.</Text>
          <Text style={styles.label}>Latitude (−85 to 85)</Text>
          <TextInput accessibilityLabel="Latitude" value={latitude} onChangeText={setLatitude} style={styles.input} keyboardType="numbers-and-punctuation" />
          <Text style={styles.label}>Longitude (−180 to 180)</Text>
          <TextInput accessibilityLabel="Longitude" value={longitude} onChangeText={setLongitude} style={styles.input} keyboardType="numbers-and-punctuation" />
          {inputError && <Text accessibilityLiveRegion="polite" style={styles.feedback}>Enter valid coordinates within the given ranges.</Text>}
          <Button label="Show selected location" onPress={selectCoordinates}>Show on map</Button>
          <Button label="Return to Gdynia" onPress={() => { camera.current?.easeTo({ ...DEFAULT_CAMERA, duration: 400 }); setModal(false); }}>Gdynia</Button>
          <Button label="Close location picker" onPress={() => setModal(false)}>Close</Button>
        </ScrollView>
      </View>
    </Modal>
  </View>;
}

const c = theme.color;
const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: c.background },
  mapArea: { flex: 1, minHeight: 180 },
  top: { position: 'absolute', top: 16, left: 16, right: 16, gap: 8 },
  location: { backgroundColor: c.surface, borderRadius: 20, padding: 16, elevation: 3 },
  eyebrow: { color: c.muted, fontSize: 11, letterSpacing: 1.4, fontWeight: '600' },
  title: { color: c.text, fontSize: 23, fontWeight: '700', marginTop: 4 },
  accent: { color: c.accent },
  notice: { backgroundColor: c.surface, borderRadius: 12, padding: 12, flexDirection: 'row', gap: 8 },
  noticeText: { color: c.text, flex: 1, fontSize: 14 },
  controls: { position: 'absolute', right: 16, top: '42%', gap: 8 },
  button: { minWidth: 48, minHeight: 48, paddingHorizontal: 14, paddingVertical: 10, backgroundColor: c.surface, borderRadius: 16, borderWidth: 1, borderColor: c.border, justifyContent: 'center', alignItems: 'center' },
  buttonText: { color: c.accent, fontSize: 22, fontWeight: '600' },
  dim: { opacity: 0.55 },
  attribution: { position: 'absolute', bottom: 0, left: 0, minHeight: 48, justifyContent: 'center', paddingHorizontal: 12, backgroundColor: c.surface, borderTopRightRadius: 12 },
  credit: { color: c.text, fontSize: 12 },
  panel: { backgroundColor: c.surface, padding: 20, borderTopLeftRadius: 24, borderTopRightRadius: 24, borderTopWidth: 1, borderColor: c.border },
  handle: { width: 36, height: 4, borderRadius: 2, backgroundColor: c.border, alignSelf: 'center', marginBottom: 16 },
  heading: { fontSize: 23, fontWeight: '700', color: c.text },
  body: { fontSize: 15, lineHeight: 23, color: c.muted, marginTop: 8 },
  feedback: { fontSize: 14, lineHeight: 21, color: c.warning, backgroundColor: c.warningSurface, borderRadius: 8, padding: 10, marginTop: 8 },
  modalBackdrop: { flex: 1, backgroundColor: c.background, justifyContent: 'flex-end' },
  modalPanel: { padding: 24, gap: 12 },
  label: { color: c.text, fontSize: 15 },
  input: { minHeight: 48, borderWidth: 1, borderColor: c.border, borderRadius: 12, padding: 12, color: c.text, backgroundColor: c.surface, fontSize: 18 },
});
