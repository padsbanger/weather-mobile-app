import { useMemo } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from './ThemeProvider';
import { type ThemeColors } from './tokens';
import { type ThemeMode } from './schedule';

const hours = Array.from({ length: 24 }, (_, hour) => hour);
function hourLabel(hour: number) { return `${String(hour).padStart(2, '0')}:00`; }
export function ThemeSheet({ currentLocation, onChooseLocation, onZoomIn, onZoomOut, onClose }: {
  currentLocation: string; onChooseLocation: () => void; onZoomIn: () => void; onZoomOut: () => void; onClose: () => void;
}) {
  const { colors, preference, resolved, setMode, setHours, reducedMotion } = useTheme();
  const s = useMemo(() => makeStyles(colors), [colors]);
  const insets = useSafeAreaInsets();
  const modes: { mode: ThemeMode; label: string }[] = [
    { mode: 'auto', label: 'Automatic' }, { mode: 'light', label: 'Light' }, { mode: 'dark', label: 'Dark' },
  ];
  const startHours = hours.filter(hour => hour !== preference.lightEnd);
  const endHours = hours.filter(hour => hour !== preference.lightStart);
  return <Modal transparent animationType={reducedMotion ? 'none' : 'fade'} onRequestClose={onClose}>
    <View style={[s.backdrop, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      <View style={s.panel}>
        <View style={s.header}><Text style={s.heading}>Settings</Text>
          <Pressable accessibilityRole="button" accessibilityLabel="Close settings" onPress={onClose} style={s.close}><Text style={s.link}>Close</Text></Pressable>
        </View>
        <ScrollView contentContainerStyle={s.content}>
          <Text style={s.title}>Map location</Text>
          <Text style={s.body}>Current map center: {currentLocation}</Text>
          <Pressable accessibilityRole="button" accessibilityLabel="Choose map location" onPress={onChooseLocation} style={s.locationAction}>
            <Text style={s.link}>Search or choose a location</Text>
          </Pressable>
          <Text style={s.title}>Map zoom</Text>
          <View style={s.modeRow}>
            <Pressable accessibilityRole="button" accessibilityLabel="Zoom in" onPress={onZoomIn} style={s.locationAction}><Text style={s.link}>Zoom in +</Text></Pressable>
            <Pressable accessibilityRole="button" accessibilityLabel="Zoom out" onPress={onZoomOut} style={s.locationAction}><Text style={s.link}>Zoom out −</Text></Pressable>
          </View>
          <Text style={s.title}>Appearance</Text>
          <Text style={s.body}>Current appearance: {resolved}. Automatic mode follows the device local time.</Text>
          <View style={s.modeRow}>{modes.map(({ mode, label }) => <Pressable key={mode} accessibilityRole="radio"
            accessibilityLabel={`${label} theme`} accessibilityState={{ checked: preference.mode === mode }}
            onPress={() => setMode(mode)} style={[s.mode, preference.mode === mode && s.selected]}>
            <Text style={[s.modeText, preference.mode === mode && s.selectedText]}>{label}</Text>
          </Pressable>)}</View>
          <Text style={s.title}>Automatic schedule</Text>
          <Text style={s.body}>Light starts at {hourLabel(preference.lightStart)}. Dark starts at {hourLabel(preference.lightEnd)}. You can cross midnight. Changes take effect while the app is open or when it resumes.</Text>
          <Text style={s.label}>Light starts</Text>
          <ScrollView horizontal contentContainerStyle={s.hours} showsHorizontalScrollIndicator={false} accessibilityLabel="Choose the hour when light mode starts">
            {startHours.map(hour => <Pressable key={hour} accessibilityRole="button" accessibilityLabel={`Start light mode at ${hourLabel(hour)}`}
              accessibilityState={{ selected: preference.lightStart === hour }} onPress={() => setHours(hour, preference.lightEnd)}
              style={[s.hour, preference.lightStart === hour && s.selected]}><Text style={[s.modeText, preference.lightStart === hour && s.selectedText]}>{hourLabel(hour)}</Text></Pressable>)}
          </ScrollView>
          <Text style={s.label}>Dark starts</Text>
          <ScrollView horizontal contentContainerStyle={s.hours} showsHorizontalScrollIndicator={false} accessibilityLabel="Choose the hour when dark mode starts">
            {endHours.map(hour => <Pressable key={hour} accessibilityRole="button" accessibilityLabel={`Start dark mode at ${hourLabel(hour)}`}
              accessibilityState={{ selected: preference.lightEnd === hour }} onPress={() => setHours(preference.lightStart, hour)}
              style={[s.hour, preference.lightEnd === hour && s.selected]}><Text style={[s.modeText, preference.lightEnd === hour && s.selectedText]}>{hourLabel(hour)}</Text></Pressable>)}
          </ScrollView>
          <Text style={s.body}>Both map themes use OpenFreeMap with OpenMapTiles and OpenStreetMap data. Radar colors stay the same.</Text>
        </ScrollView>
      </View>
    </View>
  </Modal>;
}
function makeStyles(c: ThemeColors) { return StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: c.scrim, justifyContent: 'flex-end' },
  panel: { maxHeight: '88%', backgroundColor: c.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24 },
  header: { paddingHorizontal: 20, paddingTop: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  heading: { color: c.text, fontSize: 23, fontWeight: '700' }, close: { minHeight: 48, justifyContent: 'center', paddingHorizontal: 8 },
  link: { color: c.accent, fontSize: 16 }, content: { padding: 20, gap: 12 }, body: { color: c.muted, fontSize: 15, lineHeight: 22 },
  title: { color: c.text, fontSize: 18, fontWeight: '600' }, label: { color: c.text, fontSize: 15, fontWeight: '600' },
  modeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  mode: { minHeight: 48, borderRadius: 24, paddingHorizontal: 16, justifyContent: 'center', backgroundColor: c.background, borderWidth: 1, borderColor: c.border },
  locationAction: { minHeight: 48, alignSelf: 'flex-start', justifyContent: 'center', paddingHorizontal: 14, borderRadius: 16, backgroundColor: c.background, borderWidth: 1, borderColor: c.border },
  hour: { minHeight: 48, minWidth: 64, borderRadius: 24, paddingHorizontal: 12, justifyContent: 'center', alignItems: 'center', backgroundColor: c.background, borderWidth: 1, borderColor: c.border },
  hours: { gap: 8, paddingVertical: 2 }, modeText: { color: c.text, fontSize: 15 },
  selected: { backgroundColor: c.accent, borderColor: c.accent }, selectedText: { color: c.onAccent, fontWeight: '700' },
}); }
