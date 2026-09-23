import { useMemo, useState } from 'react';
import { ActivityIndicator, Linking, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { warningDate, warningPhase, warningsForArea, warningsStale, warningSummary, type WeatherWarning } from '../../providers/imgw';
import { type ThemeColors } from '../../theme/tokens';
import { useTheme } from '../../theme/ThemeProvider';
import { areaLabel, searchAreas, validArea } from './areas';
import { type WarningsState } from './useWarnings';

export function severityColors(level: 1 | 2 | 3, c: ThemeColors) {
  return level === 3 ? { color: c.severity3, backgroundColor: c.severity3Surface } : level === 2
    ? { color: c.severity2, backgroundColor: c.severity2Surface } : { color: c.severity1, backgroundColor: c.severity1Surface };
}
function Action({ label, onPress }: { label: string; onPress: () => void }) {
  const { colors } = useTheme();
  const s = useMemo(() => makeStyles(colors), [colors]);
  return <Pressable accessibilityRole="button" onPress={onPress} style={s.button}><Text style={s.link}>{label}</Text></Pressable>;
}
function CountyCredit() {
  const { colors } = useTheme();
  const s = useMemo(() => makeStyles(colors), [colors]);
  return <View style={s.source}>
    <Pressable accessibilityRole="link" style={s.button} onPress={() => { void Linking.openURL('https://stat.gov.pl/statystyka-regionalna/jednostki-terytorialne/system-kts/jednostki-kts-i-ich-symbole/'); }}><Text style={s.link}>County catalogue: Statistics Poland ↗</Text></Pressable>
    <Text style={s.small}>2026 KTS/TERYT table · downloaded 22 Sept 2026. Names reformatted; county/city labels translated.</Text>
  </View>;
}
function SourceCredit() {
  const { colors } = useTheme();
  const s = useMemo(() => makeStyles(colors), [colors]);
  return <View style={s.source}>
    <Pressable accessibilityRole="link" style={s.button} onPress={() => { void Linking.openURL('https://meteo.imgw.pl/dyn/index.html#osmet=true'); }}><Text style={s.link}>Official warnings · IMGW-PIB ↗</Text></Pressable>
    <Text style={s.small}>Source credit (original Polish):</Text>
    <Text selectable style={s.small}>Źródłem pochodzenia danych jest Instytut Meteorologii i Gospodarki Wodnej – Państwowy Instytut Badawczy.</Text>
    <Text selectable style={s.small}>Dane Instytutu Meteorologii i Gospodarki Wodnej – Państwowego Instytutu Badawczego zostały przetworzone.</Text>
    <Text style={s.small}>The app filters areas and formats dates. Original warning wording is unchanged.</Text>
    <CountyCredit />
  </View>;
}
function WarningDetails({ warning, now }: { warning: WeatherWarning; now: number }) {
  const { colors } = useTheme();
  const s = useMemo(() => makeStyles(colors), [colors]);
  const phase = warningPhase(warning, now);
  return <View style={s.content}>
    <Text style={[s.badge, severityColors(warning.severity, colors)]}>Level {warning.severity} of 3 · {phase === 'expired' ? 'Expired' : phase === 'upcoming' ? 'Upcoming' : 'Active'}</Text>
    <Text style={s.heading}>Warning details</Text>
    <Text style={s.body}>Affected areas: {warning.areas.map(areaLabel).join('; ')}</Text>
    <Text style={s.body}>Valid from: {warningDate(warning.start)}</Text>
    <Text style={s.body}>Valid until: {warningDate(warning.end)}</Text>
    <Text style={s.body}>Published: {warningDate(warning.published)}</Text>
    <Text style={s.body}>Probability: {warning.probability === null ? 'Not supplied' : `${warning.probability}%`}</Text>
    {warning.ambiguousTime && <Text style={s.notice}>The source time falls in the repeated daylight-saving hour. The widest possible validity interval is shown; confirm the bulletin with IMGW.</Text>}
    <Text style={s.title}>Original warning · Polish</Text>
    <Text selectable style={s.title}>{warning.event}</Text>
    <Text selectable style={s.original}>{warning.text}</Text>
    <Text style={s.title}>Source comment · Polish</Text>
    <Text selectable style={s.original}>{warning.comment || 'Not supplied'}</Text>
    <Text style={s.title}>Issuing office · original name</Text>
    <Text selectable style={s.body}>{warning.office}</Text>
    <Text selectable style={s.small}>Warning ID: {warning.id}</Text>
    <SourceCredit />
  </View>;
}
export function WarningsSheet({ state, onClose }: { state: WarningsState; onClose: () => void }) {
  const { colors } = useTheme();
  const s = useMemo(() => makeStyles(colors), [colors]);
  const insets = useSafeAreaInsets();
  const [picker, setPicker] = useState(!state.area);
  const [query, setQuery] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showExpired, setShowExpired] = useState(false);
  const selected = state.data?.warnings.find(w => w.id === selectedId);
  const warnings = warningsForArea(state.data, state.area);
  const current = warnings.filter(w => warningPhase(w, state.now) !== 'expired');
  const expired = warnings.filter(w => warningPhase(w, state.now) === 'expired');
  const matches = searchAreas(query);
  const suggested = [...new Set(state.data?.warnings.filter(w => warningPhase(w, state.now) !== 'expired').flatMap(w => w.areas) ?? [])].filter(validArea);
  const stale = !!state.data && warningsStale(state.fetchedAt, state.now);
  function back() { if (selectedId) setSelectedId(null); else if (picker && state.area) setPicker(false); else onClose(); }
  function choose(code: string) { state.selectArea(code); setPicker(false); setSelectedId(null); setShowExpired(false); }
  return <Modal transparent animationType="slide" onRequestClose={back}>
    <View style={[s.backdrop, { paddingTop: insets.top + 16, paddingBottom: insets.bottom }]}>
      <View style={s.panel}>
        <View style={s.header}><Text style={s.heading}>{picker ? 'Warning area' : 'Weather warnings'}</Text>
          <Action label={selectedId || (picker && state.area) ? 'Back' : 'Close'} onPress={back} />
        </View>
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={s.content}>
          <Text style={s.body}>IMGW-PIB · Poland · in-app warnings only</Text>
          {state.loading && <View accessibilityLiveRegion="polite"><ActivityIndicator color={colors.accent} /><Text style={s.body}>Checking warnings…</Text></View>}
          {state.offline && <Text style={s.notice}>Offline · saved warnings may have changed or been withdrawn.</Text>}
          {state.error && <Text accessibilityLiveRegion="polite" style={s.notice}>IMGW could not be refreshed. Current warning status is unconfirmed. Retrying while the app is open.</Text>}
          {stale && <Text style={s.notice}>Outdated feed · last checked at least 15 minutes ago, or the device clock changed.</Text>}
          {!!state.data?.rejected && <Text style={s.notice}>Partial feed · {state.data.rejected} invalid record(s) could not be displayed. Other warnings may be missing.</Text>}
          {state.storageError && <Text style={s.notice}>Warning storage is unavailable. Saved warnings or area selection may not survive a restart.</Text>}
          {!!state.fetchedAt && <Text style={s.small}>Last successful check: {warningDate(state.fetchedAt)}</Text>}
          {picker ? <>
            <Text style={s.body}>Choose a county explicitly. This selection does not follow the map or GPS.</Text>
            <TextInput accessibilityLabel="Search warning county or TERYT code" placeholder="County, city or code" placeholderTextColor={colors.muted} value={query} onChangeText={setQuery} maxLength={100} style={s.input} />
            {!query.trim() && <>
              <Action label="All Poland" onPress={() => choose('*')} />
              <Action label={areaLabel('2262')} onPress={() => choose('2262')} />
              {!!suggested.length && <Text style={s.title}>Areas in current/upcoming warnings</Text>}
              {suggested.slice(0, 12).map(code => <Action key={code} label={areaLabel(code)} onPress={() => choose(code)} />)}
            </>}
            <Text style={s.small}>{matches.length} {matches.length === 1 ? 'county' : 'counties'} · {matches.length > 30 ? 'type to narrow the list' : 'select an area'}</Text>
            {matches.slice(0, 30).map(area => <Action key={area.code} label={`${area.name} · ${area.region} · ${area.code}`} onPress={() => choose(area.code)} />)}
            {!matches.length && <Text style={s.body}>No matching county. Try a county name or four-digit TERYT code.</Text>}
            <CountyCredit />
          </> : selectedId ? selected ? <WarningDetails warning={selected} now={state.now} />
            : <Text style={s.notice}>This warning is no longer present in the latest feed. Return to the list for current information.</Text>
            : <>
              <Text style={s.title}>{state.area ? areaLabel(state.area) : 'Choose an area'}</Text>
              <Action label="Change warning area" onPress={() => { setPicker(true); setQuery(''); }} />
              <Text style={s.small}>Manual area selection · independent of map/GPS. All times: Europe/Warsaw.</Text>
              <Text accessibilityLiveRegion="polite" style={s.title}>{warningSummary(state.data, state.area, state.now, state.fetchedAt, state.offline, state.error)}</Text>
              {!state.data && !state.loading && <Text style={s.notice}>No saved warning feed is available. This does not mean there are no warnings.</Text>}
              {current.map(w => <Pressable key={w.id} accessibilityRole="button" accessibilityLabel={`Open level ${w.severity} ${warningPhase(w, state.now)} warning`} style={[s.card, { backgroundColor: severityColors(w.severity, colors).backgroundColor }]} onPress={() => setSelectedId(w.id)}>
                <Text style={[s.title, { color: severityColors(w.severity, colors).color }]}>Level {w.severity} of 3 · {warningPhase(w, state.now) === 'upcoming' ? 'Upcoming' : 'Active'}</Text>
                <Text style={s.small}>Original event name · Polish</Text><Text style={s.title}>{w.event}</Text>
                <Text style={s.body}>{w.areas.map(areaLabel).join('; ')}</Text>
                <Text style={s.body}>From {warningDate(w.start)}{ '\n' }Until {warningDate(w.end)}</Text>
                <Text style={s.link}>Read full warning →</Text>
              </Pressable>)}
              {!!expired.length && <Action label={`${showExpired ? 'Hide' : 'Show'} expired warnings (${expired.length})`} onPress={() => setShowExpired(!showExpired)} />}
              {showExpired && expired.map(w => <Action key={w.id} label={`Expired · Level ${w.severity} · ended ${warningDate(w.end)}`} onPress={() => setSelectedId(w.id)} />)}
              <SourceCredit />
            </>}
        </ScrollView>
      </View>
    </View>
  </Modal>;
}
function makeStyles(c: ThemeColors) { return StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: c.scrim, justifyContent: 'flex-end' },
  panel: { height: '96%', backgroundColor: c.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24 },
  header: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 12 },
  content: { padding: 16, gap: 12 }, heading: { color: c.text, fontSize: 23, fontWeight: '700' }, title: { color: c.text, fontSize: 17, fontWeight: '600' },
  body: { color: c.muted, fontSize: 15, lineHeight: 22 }, small: { color: c.muted, fontSize: 13, lineHeight: 19 }, original: { color: c.text, fontSize: 17, lineHeight: 26 },
  notice: { color: c.warning, backgroundColor: c.warningSurface, padding: 12, borderRadius: 12, fontSize: 15 },
  button: { minHeight: 48, justifyContent: 'center', padding: 12, borderRadius: 12, backgroundColor: c.background }, link: { color: c.accent, fontSize: 16 },
  input: { minHeight: 48, borderWidth: 1, borderColor: c.border, borderRadius: 12, padding: 12, color: c.text, backgroundColor: c.surface, fontSize: 18 },
  card: { padding: 16, borderRadius: 16, gap: 8, minHeight: 48 }, badge: { padding: 12, borderRadius: 12, fontSize: 17, fontWeight: '700' },
  source: { gap: 8, borderTopWidth: 1, borderColor: c.border, paddingTop: 12 },
}); }
