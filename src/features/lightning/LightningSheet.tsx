import { useMemo } from 'react';
import { Linking, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LIGHTNING_STALE_MS, lightningAge, validLightningBounds, type Bounds } from '../../providers/dmiLightning';
import { useTheme } from '../../theme/ThemeProvider';
import { type ThemeColors } from '../../theme/tokens';
import { type LightningState } from './useLightning';

export function LightningSheet({ lightning, maxAge, setMaxAge, currentBounds, onClose }: {
  lightning: LightningState; maxAge: 10 | 30 | 60; setMaxAge: (value: 10 | 30 | 60) => void;
  currentBounds: () => Promise<Bounds | null>; onClose: () => void;
}) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const insets = useSafeAreaInsets();
  const count = lightning.feed?.strikes.filter(s => { const age = lightningAge(s.observed, lightning.now); return age !== null && (age === 0 || (age === 1 && maxAge >= 30) || (age === 2 && maxAge === 60)); }).length ?? 0;
  const old = lightning.fetchedAt > 0 && lightning.now - lightning.fetchedAt >= LIGHTNING_STALE_MS;
  const tooWide = !!lightning.viewBounds && !validLightningBounds(lightning.viewBounds);
  async function fetchView() {
    const bounds = await currentBounds();
    if (bounds) void lightning.refresh(bounds);
  }
  return <Modal visible animationType="slide" transparent onRequestClose={onClose}>
    <View style={styles.backdrop}>
      <ScrollView style={[styles.sheet, { paddingBottom: insets.bottom + 20 }]} contentContainerStyle={styles.content}>
        <View style={styles.row}><Text style={styles.heading}>Lightning observations</Text>
          <Pressable accessibilityRole="button" accessibilityLabel="Close lightning details" onPress={onClose} style={styles.close}><Text style={styles.closeText}>×</Text></Pressable></View>
        <Text style={styles.body}>DMI detected strokes · last hour</Text>
        <Text accessibilityLiveRegion="polite" style={styles.status}>{!lightning.enabled ? 'Layer hidden' : lightning.offline ? 'Offline · saved observations from this session only' : lightning.loading ? 'Loading observations…' : tooWide ? 'Zoom in to request an area under 5° wide and tall' : lightning.error ? 'Update failed · previous observations may remain visible' : lightning.viewChanged ? 'Map moved · refresh for this view' : old ? 'Update is over 10 minutes old · refresh for current view' : lightning.feed ? `${count} observed point${count === 1 ? '' : 's'} in the selected age range` : 'Tap refresh to load this view'}</Text>
        {lightning.feed && !lightning.error && !lightning.loading && count === 0 && <Text style={styles.caveat}>No points returned in this view and time range. This does not prove there was no lightning.</Text>}
        {lightning.feed?.partial && <Text style={styles.caveat}>The 500-point response limit was reached. More observations may exist; zoom in for a smaller area.</Text>}
        {!!lightning.feed?.rejected && <Text style={styles.caveat}>Some invalid observations were omitted.</Text>}
        <View style={styles.row}>
          <Pressable accessibilityRole="switch" accessibilityLabel="Show lightning observations" accessibilityState={{ checked: lightning.enabled }} onPress={() => { const next = !lightning.enabled; lightning.setVisible(next); if (next && !lightning.feed && !lightning.offline) void fetchView(); }} style={[styles.action, lightning.enabled && styles.active]}><Text style={[styles.actionText, lightning.enabled && styles.activeText]}>{lightning.enabled ? 'Hide layer' : 'Show layer'}</Text></Pressable>
          <Pressable accessibilityRole="button" accessibilityLabel="Refresh lightning for current map view" disabled={lightning.offline || lightning.loading || tooWide} onPress={() => { void fetchView(); }} style={[styles.action, (lightning.offline || lightning.loading || tooWide) && styles.disabled]}><Text style={styles.actionText}>Refresh view</Text></Pressable>
        </View>
        <Text style={styles.label}>Show observations from the last</Text>
        <View style={styles.row}>{([10, 30, 60] as const).map(age => <Pressable key={age} accessibilityRole="button" accessibilityLabel={`Show lightning from the last ${age} minutes`} accessibilityState={{ selected: maxAge === age }} onPress={() => setMaxAge(age)} style={[styles.age, maxAge === age && styles.active]}><Text style={[styles.actionText, maxAge === age && styles.activeText]}>{age} min</Text></Pressable>)}</View>
        <View style={styles.legend}>{[['#E54836', '0–10 min'], ['#EF9C27', '10–30 min'], ['#798BA4', '30–60 min']].map(([color, label]) => <View key={label} style={styles.legendItem}><View style={[styles.dot, { backgroundColor: color }]} /><Text style={styles.body}>{label}</Text></View>)}</View>
        <Text style={styles.body}>Last successful fetch: {lightning.fetchedAt ? new Date(lightning.fetchedAt).toLocaleString('en-GB') : 'not yet'}</Text>
        <Text style={styles.caveat}>DMI officially describes coverage as Denmark and surrounding areas. Points have been returned in parts of Poland, but detection coverage there is unverified and may be incomplete. A blank map is not an all-clear. Positions are approximate (500–2,000 m). Observations can contain errors. Time shown is the occurrence time, not fetch time.</Text>
        <Pressable accessibilityRole="link" accessibilityLabel="DMI lightning data terms" onPress={() => { void Linking.openURL('https://www.dmi.dk/friedata/dokumentation/terms-of-use'); }} style={styles.credit}><Text style={styles.link}>Data: DMI · points filtered by age and viewport · view terms</Text></Pressable>
        <Pressable accessibilityRole="link" accessibilityLabel="Creative Commons Attribution 4.0 license" onPress={() => { void Linking.openURL('https://creativecommons.org/licenses/by/4.0/'); }} style={styles.credit}><Text style={styles.link}>License: CC BY 4.0</Text></Pressable>
      </ScrollView>
    </View>
  </Modal>;
}

function makeStyles(c: ThemeColors) { return StyleSheet.create({
  backdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: c.scrim },
  sheet: { maxHeight: '85%', flexGrow: 0, backgroundColor: c.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20 },
  content: { gap: 12 }, row: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  heading: { flex: 1, color: c.text, fontSize: 22, fontWeight: '700' }, close: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center' }, closeText: { color: c.text, fontSize: 28 },
  body: { color: c.muted, fontSize: 14, lineHeight: 21 }, status: { color: c.text, fontSize: 15, fontWeight: '600' }, caveat: { color: c.warning, fontSize: 13, lineHeight: 19 },
  action: { minHeight: 48, borderRadius: 24, borderColor: c.border, borderWidth: 1, paddingHorizontal: 16, justifyContent: 'center' },
  actionText: { color: c.text, fontSize: 14, fontWeight: '600' }, active: { backgroundColor: c.accent }, activeText: { color: c.onAccent }, disabled: { opacity: 0.45 },
  label: { color: c.text, fontSize: 15, fontWeight: '600' }, age: { minWidth: 72, minHeight: 48, alignItems: 'center', justifyContent: 'center', borderRadius: 24, borderWidth: 1, borderColor: c.border },
  legend: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 }, legendItem: { flexDirection: 'row', alignItems: 'center', gap: 5 }, dot: { width: 13, height: 13, borderRadius: 7 },
  credit: { minHeight: 48, justifyContent: 'center' }, link: { color: c.accent, fontSize: 13 },
}); }
