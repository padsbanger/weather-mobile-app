import { useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Slider from '@react-native-community/slider';
import { formatFrameDate, formatFrameTime, frameKey, isStale, RADAR_LEGEND } from '../../providers/rainviewer';
import { type ThemeColors } from '../../theme/tokens';
import { useTheme } from '../../theme/ThemeProvider';
import { type useRadar } from './useRadar';

type RadarPanelProps = {
  radar: ReturnType<typeof useRadar>;
  layersActive: boolean; warningActive: boolean; warningColor: string; warningLabel: string; locating: boolean;
  onLayers: () => void; onForecast: () => void; onWarnings: () => void; onLocate: () => void; onSettings: () => void;
};

export function RadarPanel({ radar, layersActive, warningActive, warningColor, warningLabel, locating,
  onLayers, onForecast, onWarnings, onLocate, onSettings }: RadarPanelProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [expanded, setExpanded] = useState(false);
  const frames = radar.data?.frames ?? [];
  const displayed = radar.displayed?.frame;
  const newest = frames[frames.length - 1];
  const selected = radar.wanted ? radar.staged?.frame : displayed;
  const index = selected ? frames.findIndex((frame) => frameKey(frame) === frameKey(selected)) : -1;
  const stale = newest ? isStale(newest.time, radar.now) : displayed ? isStale(displayed.time, radar.now) : false;
  const status = !radar.enabled ? 'Hidden' : radar.offline ? 'Offline' : stale ? 'Outdated' : displayed && isStale(displayed.time, radar.now) ? 'Historical' : newest ? 'Recent' : 'Loading';
  const issue = radar.metadataError ? 'Radar update failed. Keeping the last available history.'
    : radar.tileError ? 'Some map or radar tiles are unavailable.' : radar.displayed && radar.viewportLoading ? 'Loading tiles for this map area…' : null;
  const failed = radar.data !== null && !frames.length;
  const coolingDown = radar.retryAt > radar.now;
  const playbackDisabled = !radar.enabled || radar.offline || coolingDown || frames.length < 2;
  return <View style={styles.panel}>
    {issue && <Text accessibilityLiveRegion="polite" style={styles.warning}>{issue}</Text>}
    {radar.playbackError && <Text style={styles.warning}>Frame unavailable. Keeping the last loaded frame. Select a frame to retry.</Text>}
    {coolingDown && <Text style={styles.warning}>Tile request limit reached. Retry in {Math.ceil((radar.retryAt - radar.now) / 1000)} seconds.</Text>}
    {failed && <Text style={styles.warning}>The provider returned no history. This does not mean no rain.</Text>}
    {!!radar.data?.rejected && <Text style={styles.warning}>Partial history · some invalid frames were omitted.</Text>}
    <View style={styles.playback}>
      <Pressable accessibilityRole="button" accessibilityLabel={radar.playing ? 'Pause radar playback' : 'Play radar history'}
        accessibilityState={{ disabled: playbackDisabled }}
        disabled={playbackDisabled} onPress={radar.togglePlay}
        style={[styles.play, playbackDisabled && styles.dim]}>
        <Text style={styles.playText}>{radar.playing ? 'Ⅱ' : '▶'}</Text>
      </Pressable>
      <View style={styles.grow}>
        <Slider accessibilityLabel="Radar frame timeline" accessibilityValue={{ text: selected ? formatFrameDate(selected.time) : 'No frame selected' }}
          style={styles.slider} minimumValue={0} maximumValue={Math.max(1, frames.length - 1)} step={1}
          value={Math.max(0, index)} disabled={!radar.enabled || coolingDown || frames.length < 2}
          minimumTrackTintColor={colors.accent} maximumTrackTintColor={colors.border} thumbTintColor={colors.accent}
          onValueChange={(value) => { const frame = frames[Math.round(value)]; if (frame) radar.select(frame); }} />
        <View style={styles.row}><Text style={styles.note}>{frames[0] ? formatFrameTime(frames[0].time) : '—'}</Text>
          <Text style={styles.note}>{newest ? formatFrameTime(newest.time) : '—'}</Text></View>
      </View>
      <Pressable accessibilityRole="button" accessibilityLabel="Show latest radar frame" accessibilityState={{ disabled: !newest || coolingDown || !radar.enabled }} disabled={!newest || coolingDown || !radar.enabled}
        onPress={() => { if (newest) radar.select(newest); }} style={styles.latest}><Text style={styles.link}>Latest</Text></Pressable>
      <Pressable accessibilityRole="button" accessibilityLabel={expanded ? 'Hide radar settings and information' : 'Show radar settings and information'} accessibilityState={{ expanded }}
        onPress={() => setExpanded(!expanded)} style={styles.info}><Text style={styles.infoText}>{expanded ? '⌄' : '⌃'}</Text></Pressable>
    </View>
    <Text style={styles.coverage}>Blank areas may mean missing coverage.</Text>
    {expanded && <ScrollView style={styles.details} contentContainerStyle={styles.detailsContent}>
      <Text style={styles.time}>Rain radar · <Text style={(stale || radar.offline) && styles.warning}>{status}</Text></Text>
      <Text style={styles.time}>{displayed ? `Displayed ${formatFrameTime(displayed.time)} · ${Math.max(0, Math.floor((radar.now - displayed.time) / 60000))} min ago` : radar.loading ? 'Loading radar history…' : 'No radar frame loaded'}</Text>
      {radar.staged && !radar.staged.ready && <ActivityIndicator accessibilityLabel={`Loading ${formatFrameTime(radar.staged.frame.time)}`} size="small" color={colors.accent} />}
      <View accessible accessibilityLabel="Radar reflectivity legend, Universal Blue, 15 to 50 dBZ" style={styles.legend}>
        <View style={styles.colors}>{RADAR_LEGEND.map((stop) => <View key={stop.dbz} style={[styles.swatch, { backgroundColor: stop.color }]} />)}</View>
        <View style={styles.row}>{RADAR_LEGEND.map((stop) => <Text key={stop.dbz} style={styles.legendLabel}>{stop.dbz}</Text>)}</View>
        <Text style={styles.note}>Reflectivity · dBZ</Text>
      </View>
      <Text style={styles.note}>Blank areas may mean missing coverage.</Text>
      <Text style={styles.time}>Radar opacity · {Math.round(radar.opacity * 100)}%</Text>
      <Slider accessibilityLabel="Radar opacity" minimumValue={0.1} maximumValue={1} step={0.05} value={radar.opacity}
        onSlidingComplete={radar.setOpacity} style={styles.slider} minimumTrackTintColor={colors.accent} thumbTintColor={colors.accent} />
      <Text style={styles.note}>Displayed frame: {displayed ? formatFrameDate(displayed.time) : 'none'}</Text>
      <Text style={styles.note}>Last successful fetch: {radar.fetchedAt ? formatFrameDate(radar.fetchedAt) : 'not yet'}</Text>
      <Text style={styles.note}>Frame time is the provider’s composite generation time. Individual radar observations can be older. Times use your device’s timezone.</Text>
      <Text style={styles.note}>History only, no nowcast. Zooming in enlarges the source imagery (maximum source zoom 7); it adds no radar detail. Coverage is not guaranteed.</Text>
      <Text style={styles.note}>Blank areas may also be dry; radar coverage is not guaranteed.</Text>
      {(radar.cacheError || radar.preferenceError) && <Text style={styles.warning}>Some radar data or settings could not be saved on this device.</Text>}
    </ScrollView>}
    <View style={styles.navigation}>
      {([
        { label: 'Layers', icon: '▱', action: onLayers, active: layersActive, hint: 'Open map layers' },
        { label: 'Forecast', icon: '☁', action: onForecast, hint: 'Forecast for map center' },
        { label: 'Warnings', icon: '⚠', action: onWarnings, hint: `Weather warnings. ${warningLabel}` },
        { label: 'Locate', icon: locating ? '…' : '◎', action: onLocate, hint: 'Show my location', disabled: locating },
        { label: 'Settings', icon: '⚙', action: onSettings, hint: 'Open settings' },
      ] as const).map((item) => <Pressable key={item.label} accessibilityRole="button" accessibilityLabel={item.hint}
        accessibilityState={{ disabled: 'disabled' in item && item.disabled, selected: 'active' in item && item.active }}
        disabled={'disabled' in item && item.disabled} onPress={item.action} style={styles.navAction}>
        <View style={styles.navIconWrap}><Text style={[styles.navIcon, 'active' in item && item.active && styles.navActive]}>{item.icon}</Text>
          {item.label === 'Warnings' && warningActive && <View style={[styles.warningDot, { backgroundColor: warningColor }]} />}</View>
        <Text style={[styles.navLabel, 'active' in item && item.active && styles.navActive]} numberOfLines={1}>{item.label}</Text>
      </Pressable>)}
    </View>
  </View>;
}

function makeStyles(c: ThemeColors) { return StyleSheet.create({
  panel: { backgroundColor: c.surface, borderRadius: 28, marginHorizontal: 10, marginBottom: 8, paddingHorizontal: 12, paddingTop: 10, paddingBottom: 8, borderWidth: 1, borderColor: c.border, elevation: 6 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  grow: { flex: 1 },
  time: { fontSize: 14, color: c.text, marginTop: 4 }, note: { fontSize: 11, color: c.muted, lineHeight: 16 },
  warning: { fontSize: 12, color: c.warning, marginTop: 3 },
  info: { width: 48, height: 48, justifyContent: 'center', alignItems: 'center' }, infoText: { fontSize: 24, color: c.muted },
  legend: { marginTop: 2, gap: 1 }, colors: { flexDirection: 'row', height: 8, borderRadius: 4, overflow: 'hidden' },
  swatch: { flex: 1 }, legendLabel: { flex: 1, textAlign: 'center', fontSize: 10, color: c.muted },
  playback: { flexDirection: 'row', alignItems: 'center', gap: 6, marginVertical: 2 },
  play: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center', backgroundColor: c.accent },
  playText: { fontSize: 24, color: c.onAccent }, dim: { opacity: 0.45 },
  slider: { height: 48, width: '100%' }, details: { maxHeight: 190, marginTop: 8 }, detailsContent: { gap: 8 },
  latest: { minHeight: 48, justifyContent: 'center', paddingHorizontal: 2 }, link: { color: c.accent, fontSize: 12, fontWeight: '600' },
  navigation: { flexDirection: 'row', borderTopWidth: 1, borderColor: c.border, marginTop: 10, paddingTop: 8 },
  navAction: { flex: 1, minWidth: 0, minHeight: 72, alignItems: 'center', justifyContent: 'center', gap: 2 },
  navIconWrap: { minHeight: 34, justifyContent: 'center' }, navIcon: { fontSize: 27, color: c.muted, textAlign: 'center' },
  navLabel: { fontSize: 11, color: c.muted, textAlign: 'center' }, navActive: { color: c.accent, fontWeight: '700' },
  warningDot: { position: 'absolute', width: 8, height: 8, right: -7, top: 2, borderRadius: 4 },
  coverage: { color: c.muted, fontSize: 10, textAlign: 'center' },
}); }
