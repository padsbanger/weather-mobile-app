import { useMemo } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../theme/ThemeProvider';
import { type ThemeColors } from '../../theme/tokens';

export function LayersSheet({ rainEnabled, onRainChange, lightningEnabled, onLightningChange, onLightningDetails, onClose }: {
  rainEnabled: boolean; onRainChange: () => void;
  lightningEnabled: boolean; onLightningChange: () => void;
  onLightningDetails: () => void; onClose: () => void;
}) {
  const { colors, reducedMotion } = useTheme();
  const s = useMemo(() => makeStyles(colors), [colors]);
  const insets = useSafeAreaInsets();
  return <Modal transparent animationType={reducedMotion ? 'none' : 'fade'} onRequestClose={onClose}>
    <View style={[s.backdrop, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      <View style={s.panel}>
        <View style={s.header}><Text style={s.heading}>Map layers</Text>
          <Pressable accessibilityRole="button" accessibilityLabel="Close map layers" onPress={onClose} style={s.action}><Text style={s.link}>Close</Text></Pressable>
        </View>
        <Pressable accessibilityRole="switch" accessibilityLabel="Rain radar layer" accessibilityState={{ checked: rainEnabled }} onPress={onRainChange} style={s.row}>
          <View style={s.copy}><Text style={s.title}>Rain radar</Text><Text style={s.body}>Observed past frames</Text></View>
          <Text style={[s.state, rainEnabled && s.active]}>{rainEnabled ? 'On' : 'Off'}</Text>
        </Pressable>
        <Pressable accessibilityRole="switch" accessibilityLabel="Lightning observations layer" accessibilityState={{ checked: lightningEnabled }} onPress={onLightningChange} style={s.row}>
          <View style={s.copy}><Text style={s.title}>Lightning</Text><Text style={s.body}>Recent DMI observations</Text></View>
          <Text style={[s.state, lightningEnabled && s.active]}>{lightningEnabled ? 'On' : 'Off'}</Text>
        </Pressable>
        <Pressable accessibilityRole="button" accessibilityLabel="Lightning observation details and time filter" onPress={onLightningDetails} style={s.action}>
          <Text style={s.link}>Lightning details and time filter</Text>
        </Pressable>
        <Text style={s.body}>Lightning uses a recent observation window independent of the selected radar frame.</Text>
      </View>
    </View>
  </Modal>;
}

function makeStyles(c: ThemeColors) { return StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: c.scrim, justifyContent: 'flex-end' },
  panel: { backgroundColor: c.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, gap: 8 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  heading: { color: c.text, fontSize: 22, fontWeight: '700' },
  row: { minHeight: 64, flexDirection: 'row', alignItems: 'center', gap: 12, borderBottomWidth: 1, borderColor: c.border },
  copy: { flex: 1 }, title: { color: c.text, fontSize: 16, fontWeight: '600' },
  body: { color: c.muted, fontSize: 13, lineHeight: 19 },
  state: { color: c.muted, minWidth: 48, textAlign: 'center', padding: 8, borderRadius: 12, overflow: 'hidden', backgroundColor: c.background },
  active: { backgroundColor: c.accent, color: c.onAccent, fontWeight: '700' },
  action: { minHeight: 48, justifyContent: 'center', paddingHorizontal: 8 }, link: { color: c.accent, fontSize: 15, fontWeight: '600' },
}); }
