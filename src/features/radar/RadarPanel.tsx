import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Slider from '@react-native-community/slider';
import { formatFrameDate, formatFrameTime, frameKey, isStale, RADAR_LEGEND } from '../../providers/rainviewer';
import { theme } from '../../theme/tokens';
import { type useRadar } from './useRadar';

export function RadarPanel({ radar }: { radar: ReturnType<typeof useRadar> }) {
  const [expanded, setExpanded] = useState(false);
  const frames = radar.data?.frames ?? [];
  const displayed = radar.displayed?.frame;
  const newest = frames[frames.length - 1];
  const selected = radar.wanted ? radar.staged?.frame : displayed;
  const index = selected ? frames.findIndex((frame) => frameKey(frame) === frameKey(selected)) : -1;
  const stale = newest ? isStale(newest.time, radar.now) : displayed ? isStale(displayed.time, radar.now) : false;
  const status = !radar.enabled ? 'Radar hidden' : radar.offline ? 'Offline · cached radar' : stale ? 'Outdated radar' : displayed && isStale(displayed.time, radar.now) ? 'Historical frame · over 20 min old' : newest ? 'Past radar · recent data' : 'Past radar';
  const issue = radar.metadataError ? 'Radar update failed. Keeping the last available history.'
    : radar.tileError ? 'Some map or radar tiles are unavailable.' : radar.displayed && radar.viewportLoading ? 'Loading tiles for this map area…' : null;
  const failed = radar.data !== null && !frames.length;
  const coolingDown = radar.retryAt > radar.now;
  const playbackDisabled = !radar.enabled || radar.offline || coolingDown || frames.length < 2;
  return <View style={styles.panel}>
    <View style={styles.handle} />
    <View style={styles.row}>
      <View style={styles.grow}>
        <Text style={styles.heading}>Rain radar</Text>
        <Text accessibilityLiveRegion="polite" style={[styles.status, (stale || radar.offline) && styles.warning]}>{status}</Text>
      </View>
      <Pressable accessibilityRole="button" accessibilityLabel={expanded ? 'Hide radar settings and information' : 'Show radar settings and information'} accessibilityState={{ expanded }}
        onPress={() => setExpanded(!expanded)} style={styles.info}><Text style={styles.infoText}>{expanded ? '⌄' : 'ⓘ'}</Text></Pressable>
    </View>
    <Text style={styles.time}>{displayed ? `Frame ${formatFrameTime(displayed.time)} · ${Math.max(0, Math.floor((radar.now - displayed.time) / 60000))} min ago` : radar.loading ? 'Loading radar history…' : 'No radar frame loaded'}</Text>
    <Text accessibilityLiveRegion="polite" style={styles.note}>{radar.staged ? radar.staged.ready ? 'Next frame ready' : `Loading ${formatFrameTime(radar.staged.frame.time)}${displayed ? ' · keeping current frame' : ''}…` : ' '}</Text>
    {issue && <Text accessibilityLiveRegion="polite" style={styles.warning}>{issue}</Text>}
    {radar.playbackError && <Text style={styles.warning}>Frame unavailable. Keeping the last loaded frame. Select a frame to retry.</Text>}
    {coolingDown && <Text style={styles.warning}>Tile request limit reached. Retry in {Math.ceil((radar.retryAt - radar.now) / 1000)} seconds.</Text>}
    {failed && <Text style={styles.warning}>The provider returned no history. This does not mean no rain.</Text>}
    {!!radar.data?.rejected && <Text style={styles.warning}>Partial history · some invalid frames were omitted.</Text>}
    <View accessible accessibilityLabel="Radar reflectivity legend, Universal Blue, 15 to 50 dBZ" style={styles.legend}>
      <View style={styles.colors}>{RADAR_LEGEND.map((stop) => <View key={stop.dbz} style={[styles.swatch, { backgroundColor: stop.color, opacity: radar.opacity }]} />)}</View>
      <View style={styles.row}>{RADAR_LEGEND.map((stop) => <Text key={stop.dbz} style={styles.legendLabel}>{stop.dbz}</Text>)}</View>
      <Text style={styles.note}>Reflectivity (dBZ) · weaker → stronger</Text>
    </View>
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
          minimumTrackTintColor={theme.color.accent} maximumTrackTintColor={theme.color.border} thumbTintColor={theme.color.accent}
          onValueChange={(value) => { const frame = frames[Math.round(value)]; if (frame) radar.select(frame); }} />
        <View style={styles.row}><Text style={styles.note}>{frames[0] ? formatFrameTime(frames[0].time) : '—'}</Text>
          <Text style={styles.note}>{newest ? formatFrameTime(newest.time) : '—'}</Text></View>
      </View>
    </View>
    <Text style={styles.note}>Blank areas may mean missing coverage, not dry weather.</Text>
    {expanded && <ScrollView style={styles.details} contentContainerStyle={styles.detailsContent}>
      <Text style={styles.time}>Radar opacity · {Math.round(radar.opacity * 100)}%</Text>
      <Slider accessibilityLabel="Radar opacity" minimumValue={0.1} maximumValue={1} step={0.05} value={radar.opacity}
        onSlidingComplete={radar.setOpacity} style={styles.slider} minimumTrackTintColor={theme.color.accent} thumbTintColor={theme.color.accent} />
      <Text style={styles.note}>Displayed frame: {displayed ? formatFrameDate(displayed.time) : 'none'}</Text>
      <Text style={styles.note}>Last successful fetch: {radar.fetchedAt ? formatFrameDate(radar.fetchedAt) : 'not yet'}</Text>
      <Text style={styles.note}>Frame time is the provider’s composite generation time. Individual radar observations can be older. Times use your device’s timezone.</Text>
      <Text style={styles.note}>History only, no nowcast. Zooming in enlarges the source imagery (maximum source zoom 7); it adds no radar detail. Coverage is not guaranteed.</Text>
      {newest && <Pressable accessibilityRole="button" accessibilityLabel="Show latest radar frame" onPress={() => radar.select(newest)} style={styles.latest}><Text style={styles.link}>Show latest frame</Text></Pressable>}
      {(radar.cacheError || radar.preferenceError) && <Text style={styles.warning}>Some radar data or settings could not be saved on this device.</Text>}
    </ScrollView>}
  </View>;
}

const c = theme.color;
const styles = StyleSheet.create({
  panel: { backgroundColor: c.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 20, paddingTop: 10, paddingBottom: 12, borderTopWidth: 1, borderColor: c.border },
  handle: { width: 36, height: 4, borderRadius: 2, backgroundColor: c.border, alignSelf: 'center', marginBottom: 8 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  grow: { flex: 1 }, heading: { fontSize: 22, fontWeight: '700', color: c.text },
  status: { fontSize: 12, color: c.muted, marginTop: 2 },
  time: { fontSize: 14, color: c.text, marginTop: 4 }, note: { fontSize: 11, color: c.muted, lineHeight: 16 },
  warning: { fontSize: 12, color: c.warning, marginTop: 3 },
  info: { width: 48, height: 48, justifyContent: 'center', alignItems: 'center' }, infoText: { fontSize: 24, color: c.muted },
  legend: { marginTop: 10, gap: 2 }, colors: { flexDirection: 'row', height: 12, borderRadius: 6, overflow: 'hidden' },
  swatch: { flex: 1 }, legendLabel: { flex: 1, textAlign: 'center', fontSize: 10, color: c.muted },
  playback: { flexDirection: 'row', alignItems: 'center', gap: 16, marginVertical: 8 },
  play: { width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center', backgroundColor: c.accent },
  playText: { fontSize: 24, color: c.surface }, dim: { opacity: 0.45 },
  slider: { height: 48, width: '100%' }, details: { maxHeight: 190, marginTop: 8 }, detailsContent: { gap: 8 },
  latest: { minHeight: 48, justifyContent: 'center' }, link: { color: c.accent, fontSize: 15 },
});
