import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, BackHandler, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import Slider from '@react-native-community/slider';
import Ionicons from '@react-native-vector-icons/ionicons/static';
import { formatFrameDate, formatFrameTime, frameKey, isStale, RADAR_LEGEND } from '../../providers/rainviewer';
import { type ThemeColors } from '../../theme/tokens';
import { useTheme } from '../../theme/ThemeProvider';
import { type useRadar } from './useRadar';

type DockAction = 'layers' | 'forecast' | 'warnings' | 'settings';
type RadarPanelProps = {
  radar: ReturnType<typeof useRadar>;
  activeAction: DockAction; warningActive: boolean; warningColor: string; warningLabel: string; locating: boolean;
  onLayers: () => void; onForecast: () => void; onWarnings: () => void; onLocate: () => void; onSettings: () => void;
};

export function RadarPanel({ radar, activeAction, warningActive, warningColor, warningLabel, locating,
  onLayers, onForecast, onWarnings, onLocate, onSettings }: RadarPanelProps) {
  const { colors } = useTheme();
  const { fontScale, width } = useWindowDimensions();
  const largeText = fontScale >= 1.3;
  const narrow = width <= 330;
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [expanded, setExpanded] = useState(false);
  useEffect(() => {
    if (!expanded) return;
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => { setExpanded(false); return true; });
    return () => subscription.remove();
  }, [expanded]);
  const frames = radar.data?.frames ?? [];
  const displayed = radar.displayed?.frame;
  const newest = frames.at(-1);
  const selected = radar.wanted ? radar.staged?.frame : displayed;
  const index = selected ? frames.findIndex(frame => frameKey(frame) === frameKey(selected)) : -1;
  const newestStale = newest ? isStale(newest.time, radar.now) : displayed ? isStale(displayed.time, radar.now) : false;
  const coolingDown = radar.retryAt > radar.now;
  const playbackDisabled = !radar.enabled || radar.offline || frames.length < 2 ||
    (!radar.playing && radar.preparedCount < 2 && (coolingDown || radar.preloadLimited));
  const hasIssue = !!(radar.offline || radar.metadataError || newestStale || radar.tileError || radar.playbackError || coolingDown ||
    (radar.data !== null && !frames.length));
  const status = !radar.enabled ? 'Hidden' : radar.offline ? 'Offline' : newestStale ? 'Outdated' : displayed && isStale(displayed.time, radar.now) ? 'Historical' : newest ? 'Recent' : 'Loading';
  const statusItems = [
    radar.offline && 'Offline',
    radar.metadataError && 'Radar update failed',
    newestStale && 'Outdated radar',
    radar.tileError && 'Some tiles unavailable',
    radar.playbackError && 'Frame unavailable',
    coolingDown && 'Radar retry pending',
    radar.data !== null && !frames.length && 'No radar history',
    !!radar.data?.rejected && 'Partial history',
    !radar.displayed && radar.loading && 'Loading radar',
    radar.displayed && radar.viewportLoading && 'Loading map tiles',
    radar.preparing && (radar.preloadLimited ? 'Zoom in to prepare history' : radar.budgetWaitUntil > radar.now
      ? `History ${radar.preparedCount}/${frames.length} ready · waiting for request budget`
      : `Preparing history ${radar.preparedCount}/${frames.length}`),
    radar.playing && !radar.allPrepared && radar.preparedCount >= 2 && 'Playing available frames',
    'Coverage unverified',
  ].filter(Boolean).join(' · ');
  const actions = [
    { key: 'layers', label: 'Layers', icon: 'layers-outline', action: onLayers, hint: 'Open map layers' },
    { key: 'forecast', label: 'Forecast', icon: 'calendar-outline', action: onForecast, hint: 'Forecast for map center' },
    { key: 'warnings', label: 'Warnings', icon: 'warning-outline', action: onWarnings, hint: `Weather warnings. ${warningLabel}` },
    { key: 'locate', label: 'Locate', icon: 'locate-outline', action: onLocate, hint: 'Show my location' },
    { key: 'settings', label: 'Settings', icon: 'settings-outline', action: onSettings, hint: 'Open settings' },
  ] as const;

  return <View style={styles.panel}>
    <View style={styles.playback}>
      <Pressable accessibilityRole="button" accessibilityLabel={radar.playing ? 'Pause radar playback' : 'Play radar history'}
        accessibilityState={{ disabled: playbackDisabled }} disabled={playbackDisabled} onPress={radar.togglePlay}
        style={[styles.play, playbackDisabled && styles.dim]}>
        <Ionicons name={radar.playing ? 'pause' : 'play'} size={24} color={colors.onAccent} />
      </Pressable>
      <View style={styles.timeline}>
        <Text style={styles.timelineTitle}>Radar history · {displayed ? formatFrameTime(displayed.time) : 'Loading'}</Text>
        <Slider accessibilityLabel="Radar frame timeline" accessibilityValue={{ text: selected ? formatFrameDate(selected.time) : 'No frame selected' }}
          style={styles.slider} minimumValue={0} maximumValue={Math.max(1, frames.length - 1)} step={1}
          value={Math.max(0, index)} disabled={!radar.enabled || coolingDown || frames.length < 2}
          minimumTrackTintColor={colors.accent} maximumTrackTintColor={colors.border} thumbTintColor={colors.accent}
          onValueChange={value => { const frame = frames[Math.round(value)]; if (frame) radar.select(frame); }} />
        <View style={styles.endpoints}><Text style={styles.endpoint}>{frames[0] ? formatFrameTime(frames[0].time) : '—'}</Text>
          <Text style={styles.endpoint}>{newest ? formatFrameTime(newest.time) : '—'}</Text></View>
      </View>
      <Pressable accessibilityRole="button" accessibilityLabel={expanded ? 'Hide radar details' : 'Show radar details'} accessibilityState={{ expanded }}
        onPress={() => setExpanded(!expanded)} style={styles.expand}>
        <Ionicons name={expanded ? 'chevron-down' : 'chevron-up'} size={24} color={colors.text} />
      </Pressable>
    </View>
    <Text accessibilityLiveRegion="polite" style={[styles.status, hasIssue && styles.statusWarning]}>{statusItems}</Text>
    {expanded && <ScrollView style={styles.details} contentContainerStyle={styles.detailsContent}>
      <View accessible accessibilityLabel="Radar reflectivity legend, 15 to 50 dBZ" style={styles.legend}>
        <View style={styles.colors}>{RADAR_LEGEND.map(stop => <View key={stop.dbz} style={[styles.swatch, { backgroundColor: stop.color }]} />)}</View>
        <View style={styles.endpoints}>{RADAR_LEGEND.map(stop => <Text key={stop.dbz} style={styles.legendLabel}>{stop.dbz}</Text>)}</View>
        <Text style={styles.detailNote}>Radar reflectivity · dBZ</Text>
      </View>
      <Text style={styles.detailNote}>Blank areas may mean missing coverage or dry weather. Coverage is not guaranteed.</Text>
      <Text style={styles.detailText}>Rain radar · {status}</Text>
      <Text style={styles.detailText}>{displayed ? `Displayed ${formatFrameTime(displayed.time)} · ${Math.max(0, Math.floor((radar.now - displayed.time) / 60000))} min ago` : 'No radar frame loaded'}</Text>
      {radar.wanted && radar.staged && !radar.staged.ready && <ActivityIndicator accessibilityLabel={`Loading ${formatFrameTime(radar.staged.frame.time)}`} size="small" color={colors.accent} />}
      <Pressable accessibilityRole="button" accessibilityLabel="Show latest radar frame" accessibilityState={{ disabled: !newest || coolingDown || !radar.enabled }}
        disabled={!newest || coolingDown || !radar.enabled} onPress={() => { if (newest) radar.select(newest); }} style={styles.latest}>
        <Text style={styles.link}>Show latest frame</Text>
      </Pressable>
      <Text style={styles.detailText}>Radar opacity · {Math.round(radar.opacity * 100)}%</Text>
      <Slider accessibilityLabel="Radar opacity" minimumValue={0.1} maximumValue={1} step={0.05} value={radar.opacity}
        onSlidingComplete={radar.setOpacity} style={styles.opacitySlider} minimumTrackTintColor={colors.accent} thumbTintColor={colors.accent} />
      <Text style={styles.detailNote}>Displayed frame: {displayed ? formatFrameDate(displayed.time) : 'none'}</Text>
      <Text style={styles.detailNote}>Last successful fetch: {radar.fetchedAt ? formatFrameDate(radar.fetchedAt) : 'not yet'}</Text>
      <Text style={styles.detailNote}>Frame time is the provider’s composite generation time. Individual observations can be older. Times use your device’s timezone.</Text>
      <Text style={styles.detailNote}>History only, no nowcast. Zooming in enlarges the source imagery (maximum source zoom 7); it adds no radar detail.</Text>
      {(radar.cacheError || radar.preferenceError) && <Text style={styles.detailWarning}>Some radar data or settings could not be saved on this device.</Text>}
    </ScrollView>}
    <View style={[styles.navigation, largeText && styles.navigationLargeText]}>
      {actions.map(item => {
        const active = item.key === activeAction;
        const disabled = item.key === 'locate' && locating;
        return <Pressable key={item.key} accessibilityRole="button" accessibilityLabel={item.hint}
          accessibilityState={{ selected: active, disabled }} disabled={disabled} onPress={item.action}
          style={[styles.navAction, largeText && styles.navActionLargeText, active && styles.navSelected]}>
          <View style={styles.navIconWrap}>
            <Ionicons name={item.icon} size={23} color={active ? colors.accent : colors.text} />
            {item.key === 'warnings' && warningActive && <View style={[styles.warningDot, { backgroundColor: warningColor }]} />}
          </View>
          <Text style={[styles.navLabel, narrow && styles.navLabelNarrow, active && styles.navLabelActive]}>{item.label}</Text>
        </Pressable>;
      })}
    </View>
  </View>;
}

function makeStyles(c: ThemeColors) { return StyleSheet.create({
  panel: { backgroundColor: c.surface, borderRadius: 28, marginHorizontal: 16, marginBottom: 8, paddingHorizontal: 12, paddingTop: 6, paddingBottom: 8, borderWidth: 1, borderColor: c.border, elevation: 6 },
  playback: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  play: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center', backgroundColor: c.accent },
  dim: { opacity: 0.45 },
  timeline: { flex: 1, minWidth: 0 },
  timelineTitle: { color: c.text, fontSize: 12, fontWeight: '500' },
  slider: { height: 32, width: '100%' },
  endpoints: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  endpoint: { color: c.muted, fontSize: 11, lineHeight: 14 },
  expand: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center' },
  status: { color: c.muted, fontSize: 11, lineHeight: 14, marginTop: 3 }, statusWarning: { color: c.warning },
  details: { maxHeight: 200, marginTop: 6 }, detailsContent: { gap: 7, paddingBottom: 6 },
  legend: { gap: 2 }, colors: { flexDirection: 'row', height: 8, borderRadius: 4, overflow: 'hidden' },
  swatch: { flex: 1 }, legendLabel: { flex: 1, textAlign: 'center', color: c.muted, fontSize: 10 },
  detailNote: { color: c.muted, fontSize: 12, lineHeight: 17 },
  detailText: { color: c.text, fontSize: 14 }, detailWarning: { color: c.warning, fontSize: 12 },
  opacitySlider: { height: 48, width: '100%' },
  latest: { minHeight: 48, justifyContent: 'center' }, link: { color: c.accent, fontSize: 14, fontWeight: '600' },
  navigation: { flexDirection: 'row', borderTopWidth: 1, borderColor: c.border, marginTop: 6, paddingTop: 6 },
  navigationLargeText: { flexWrap: 'wrap', justifyContent: 'center' },
  navAction: { flex: 1, minWidth: 0, minHeight: 58, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 2, paddingVertical: 4, borderRadius: 14, gap: 2 },
  navActionLargeText: { flex: 0, width: '33.333%', minHeight: 66 },
  navSelected: { backgroundColor: c.dockActiveSurface },
  navIconWrap: { width: 28, height: 28, alignItems: 'center', justifyContent: 'center' },
  navLabel: { color: c.text, fontSize: 12, textAlign: 'center' }, navLabelActive: { color: c.accent, fontWeight: '700' },
  navLabelNarrow: { fontSize: 11 },
  warningDot: { position: 'absolute', width: 6, height: 6, right: 0, top: 0, borderRadius: 3 },
}); }
