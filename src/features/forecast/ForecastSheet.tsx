import { ActivityIndicator, Linking, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { hourLabel, forecastStale, upcomingHours, type Place } from '../../providers/openMeteo';
import { useMemo } from 'react';
import { type ThemeColors } from '../../theme/tokens';
import { useTheme } from '../../theme/ThemeProvider';
import { useForecast } from './useForecast';

export function ForecastSheet({ place, offline, onClose }: { place: Place; offline: boolean; onClose: () => void }) {
  const { colors } = useTheme();
  const s = useMemo(() => makeStyles(colors), [colors]);
  const insets = useSafeAreaInsets();
  const forecast = useForecast(place.center, offline);
  const hours = forecast.data ? upcomingHours(forecast.data, forecast.now) : [];
  const value = (v: number | null, unit: string) => v === null ? 'Unavailable' : `${v}${unit}`;
  return <Modal transparent animationType="slide" onRequestClose={onClose}>
    <View style={[s.backdrop, { paddingTop: insets.top + 24, paddingBottom: insets.bottom }]}>
      <View style={s.panel}>
        <View style={s.header}><Text style={s.heading}>Hourly forecast</Text><Pressable accessibilityRole="button" onPress={onClose} style={s.button}><Text style={s.link}>Close</Text></Pressable></View>
        <ScrollView contentContainerStyle={s.content}>
          <Text style={s.title}>{place.name}</Text>
          <Text style={s.body}>Model forecast · next 24 hours</Text>
          <Pressable accessibilityRole="link" style={s.button} onPress={() => { void Linking.openURL('https://open-meteo.com/'); }}><Text style={s.link}>Weather data by Open-Meteo · CC BY 4.0</Text></Pressable>
          <Text style={s.body}>Location: {place.center[1].toFixed(2)}°, {place.center[0].toFixed(2)}°</Text>
          {offline && <Text style={s.notice}>Offline · showing saved forecast if available.</Text>}
          {forecast.loading && <View accessibilityLiveRegion="polite"><ActivityIndicator color={colors.accent} /><Text style={s.body}>Loading forecast…</Text></View>}
          {forecast.error && <Text accessibilityLiveRegion="polite" style={s.notice}>Forecast could not refresh. Saved values may be outdated. Reopen this sheet to retry.</Text>}
          {forecast.cacheError && <Text style={s.notice}>Forecast storage is unavailable. Offline access may not work.</Text>}
          {forecast.data && <>
            <Text style={s.body}>Times: {forecast.data.timezone}</Text>
            <Text style={s.body}>Downloaded: {hourLabel(forecast.fetchedAt, forecast.data.timezone)}</Text>
            {forecastStale(forecast.fetchedAt, forecast.now) && <Text style={s.notice}>Outdated saved forecast · last fetched over 30 minutes ago, or the device clock changed.</Text>}
            {forecast.data.partial && <Text style={s.notice}>Partial forecast · unavailable values are not zero.</Text>}
          </>}
          {!forecast.loading && !hours.length && <Text style={s.notice}>{forecast.data ? 'No upcoming hours are available in this forecast.' : 'No saved forecast is available for this location.'}</Text>}
          <Text style={s.body}>Precipitation: hour ending at each time; chance of more than 0.1 mm, including snow water equivalent. Wind at 10 m.</Text>
          {hours.map(hour => <View key={hour.time} style={s.hour} accessible accessibilityLabel={`${hourLabel(hour.time, forecast.data!.timezone)}. Temperature ${value(hour.temperature, ' degrees Celsius')}. Precipitation probability ${value(hour.probability, ' percent')}. Precipitation ${value(hour.precipitation, ' millimetres')}. Wind ${value(hour.wind, ' kilometres per hour')}.`}>
            <Text style={s.title}>{hourLabel(hour.time, forecast.data!.timezone)}</Text>
            <View style={s.metrics}><Text style={s.body}>Temperature {value(hour.temperature, ' °C')}</Text><Text style={s.body}>Wind {value(hour.wind, ' km/h')}</Text></View>
            <View style={s.metrics}><Text style={s.body}>Precipitation {value(hour.probability, '%')}</Text><Text style={s.body}>Amount {value(hour.precipitation, ' mm')}</Text></View>
          </View>)}
        </ScrollView>
      </View>
    </View>
  </Modal>;
}
function makeStyles(c: ThemeColors) { return StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: c.scrim, justifyContent: 'flex-end' },
  panel: { maxHeight: '92%', backgroundColor: c.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, flexShrink: 1 },
  header: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 12 },
  heading: { color: c.text, fontSize: 23, fontWeight: '700' }, title: { color: c.text, fontSize: 17, fontWeight: '600' },
  content: { padding: 20, gap: 12 }, body: { color: c.muted, fontSize: 15, lineHeight: 22 },
  notice: { color: c.warning, backgroundColor: c.warningSurface, padding: 12, borderRadius: 12, fontSize: 15 },
  hour: { borderTopWidth: 1, borderColor: c.border, paddingTop: 12, gap: 6 },
  metrics: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: 8 },
  button: { minHeight: 48, justifyContent: 'center', paddingHorizontal: 8 }, link: { color: c.accent, fontSize: 16 },
}); }
