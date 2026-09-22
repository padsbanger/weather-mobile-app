import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, AppState, Linking, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { fetchJson, locationKey, parsePlace, parseSearch, searchUrl, type Place } from '../../providers/openMeteo';
import { theme } from '../../theme/tokens';

const FAVORITES = 'weather-radar.favorites.v1';
let writes = Promise.resolve();
function persistFavorites(next: Place[]) {
  const result = writes.then(() => AsyncStorage.setItem(FAVORITES, JSON.stringify(next)));
  writes = result.catch(() => {});
  return result;
}
function Action({ label, onPress, disabled = false }: { label: string; onPress: () => void; disabled?: boolean }) {
  return <Pressable accessibilityRole="button" accessibilityState={{ disabled }} disabled={disabled} onPress={onPress} style={[s.button, disabled && s.dim]}><Text style={s.link}>{label}</Text></Pressable>;
}
export function LocationPicker({ current, offline, onSelect, onClose }: { current: Place; offline: boolean; onSelect: (place: Place) => void; onClose: () => void }) {
  const insets = useSafeAreaInsets();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Place[]>([]);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [favorites, setFavorites] = useState<Place[]>([]);
  const [ready, setReady] = useState(false);
  const [storageError, setStorageError] = useState(false);
  const [name, setName] = useState(current.name);
  const [latitude, setLatitude] = useState(current.center[1].toFixed(4));
  const [longitude, setLongitude] = useState(current.center[0].toFixed(4));
  const request = useRef<AbortController | null>(null);
  useEffect(() => {
    let alive = true;
    void writes.then(() => AsyncStorage.getItem(FAVORITES)).then(raw => {
      if (!alive) return;
      const parsed: unknown = raw ? JSON.parse(raw) : [];
      if (!Array.isArray(parsed) || parsed.length > 20) throw new Error('Invalid favorites');
      setFavorites(parsed.map(parsePlace));
    }).catch(() => { if (alive) setStorageError(true); }).finally(() => { if (alive) setReady(true); });
    const sub = AppState.addEventListener('change', state => {
      if (state !== 'active' && request.current) { request.current.abort(); request.current = null; setBusy(false); setMessage('Search paused. Submit again when ready.'); }
    });
    return () => { alive = false; request.current?.abort(); request.current = null; sub.remove(); };
  }, []);
  useEffect(() => { if (offline) request.current?.abort(); }, [offline]);
  function save(next: Place[]) {
    setFavorites(next);
    void persistFavorites(next).catch(() => setStorageError(true));
  }
  async function search() {
    request.current?.abort();
    const controller = new AbortController(); request.current = controller;
    setResults([]); setMessage('');
    if (query.trim().length < 2 || offline) { setMessage('Enter at least two characters and connect to the internet.'); return; }
    setBusy(true);
    const timeout = setTimeout(() => controller.abort(), 15000);
    try {
      const found = parseSearch(await fetchJson(searchUrl(query), controller.signal));
      if (request.current !== controller) return;
      setResults(found); if (!found.length) setMessage('No matching places. Try a city and country, or coordinates.');
    } catch { if (request.current === controller) setMessage('Search unavailable. Try again, choose a favorite, or enter coordinates.'); }
    finally { clearTimeout(timeout); if (request.current === controller) { setBusy(false); request.current = null; } }
  }
  function coordinates() {
    if (!latitude.trim() || !longitude.trim()) { setMessage('Enter both coordinates.'); return; }
    try { onSelect(parsePlace({ name: `${latitude.trim()}°, ${longitude.trim()}°`, center: [Number(longitude.replace(',', '.')), Number(latitude.replace(',', '.'))] })); }
    catch { setMessage('Use latitude −85 to 85 and longitude −180 to 180.'); }
  }
  const button = (label: string, action: () => void, disabled = false) => <Action label={label} onPress={action} disabled={disabled} />;
  return <Modal transparent animationType="slide" onRequestClose={onClose}>
    <View style={[s.backdrop, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      <View style={s.header}><Text style={s.heading}>Choose a location</Text>{button('Close', onClose)}</View>
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={s.content}>
        <Text style={s.body}>Search a city or postal code. Selecting a place moves the map; Forecast uses its center.</Text>
        <TextInput accessibilityLabel="Search city or postal code" placeholder="City, country" placeholderTextColor={theme.color.muted} value={query} maxLength={100} onChangeText={value => { request.current?.abort(); request.current = null; setBusy(false); setResults([]); setMessage(''); setQuery(value); }} onSubmitEditing={() => { void search(); }} returnKeyType="search" style={s.input} />
        <Action label="Search" onPress={() => { void search(); }} disabled={busy || offline || query.trim().length < 2} />
        {busy && <ActivityIndicator accessibilityLabel="Searching places" color={theme.color.accent} />}
        {offline && <Text style={s.notice}>Offline · search is unavailable. Favorites and coordinates still work.</Text>}
        {!!message && <Text accessibilityLiveRegion="polite" style={s.notice}>{message}</Text>}
        {results.map((place, i) => <View key={`${place.name}-${i}`}>{button(place.name, () => onSelect(place))}</View>)}
        <Text style={s.heading}>Favorites</Text>
        {storageError && <Text style={s.notice}>Favorites storage failed. Changes may not survive a restart.</Text>}
        {ready && !favorites.length && <Text style={s.body}>No favorites yet. Save the current map center below.</Text>}
        {favorites.map(place => <View key={locationKey(place.center)} style={s.favorite}>{button(place.name, () => onSelect(place))}{button(`Remove ${place.name}`, () => save(favorites.filter(p => locationKey(p.center) !== locationKey(place.center))))}</View>)}
        <Text style={s.body}>Save current map center: {current.center[1].toFixed(4)}°, {current.center[0].toFixed(4)}°</Text>
        <TextInput accessibilityLabel="Favorite name" value={name} maxLength={120} onChangeText={setName} style={s.input} />
        {button('Save current location', () => {
          const next = favorites.filter(p => locationKey(p.center) !== locationKey(current.center));
          if (next.length >= 20) { setMessage('Up to 20 favorites. Remove one before adding another.'); return; }
          save([...next, { name: name.trim(), center: current.center }]);
        }, !ready || !name.trim())}
        <Text style={s.heading}>Coordinates</Text>
        <Text style={s.body}>Latitude −85 to 85; longitude −180 to 180.</Text>
        <TextInput accessibilityLabel="Latitude" value={latitude} onChangeText={setLatitude} keyboardType="numbers-and-punctuation" style={s.input} />
        <TextInput accessibilityLabel="Longitude" value={longitude} onChangeText={setLongitude} keyboardType="numbers-and-punctuation" style={s.input} />
        {button('Show on map', coordinates)}
        {button('Gdynia', () => onSelect({ name: 'Gdynia', center: [18.538, 54.5189] }))}
        <Pressable accessibilityRole="link" style={s.button} onPress={() => { void Linking.openURL('https://open-meteo.com/en/docs/geocoding-api'); }}><Text style={s.link}>Search by Open-Meteo</Text></Pressable>
        <Pressable accessibilityRole="link" style={s.button} onPress={() => { void Linking.openURL('https://www.geonames.org/'); }}><Text style={s.link}>Location data by GeoNames · CC BY 4.0</Text></Pressable>
      </ScrollView>
    </View>
  </Modal>;
}
const c = theme.color;
const s = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: c.background }, header: { paddingHorizontal: 20, flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' },
  content: { padding: 20, gap: 12 }, heading: { color: c.text, fontSize: 22, fontWeight: '700' }, body: { color: c.muted, fontSize: 15, lineHeight: 22 },
  button: { minHeight: 48, padding: 12, justifyContent: 'center', borderRadius: 12, backgroundColor: c.surface }, link: { color: c.accent, fontSize: 16 }, dim: { opacity: 0.5 },
  input: { minHeight: 48, borderWidth: 1, borderColor: c.border, borderRadius: 12, padding: 12, color: c.text, backgroundColor: c.surface, fontSize: 18 },
  notice: { padding: 12, color: c.warning, backgroundColor: c.warningSurface, borderRadius: 12 }, favorite: { borderWidth: 1, borderColor: c.border, borderRadius: 12, overflow: 'hidden' },
});
