import { useMemo } from 'react';
import { GeoJSONSource, Layer } from '@maplibre/maplibre-react-native';
import { lightningAge } from '../../providers/dmiLightning';
import { useTheme } from '../../theme/ThemeProvider';
import { type LightningState } from './useLightning';

export function LightningLayer({ lightning, maxAge }: { lightning: LightningState; maxAge: 10 | 30 | 60 }) {
  const { resolved } = useTheme();
  const data = useMemo(() => ({ type: 'FeatureCollection' as const, features: (lightning.feed?.strikes ?? [])
    .filter(s => { const age = lightningAge(s.observed, lightning.now); return age !== null && (age === 0 || (age === 1 && maxAge >= 30) || (age === 2 && maxAge === 60)); })
    .map(s => ({ type: 'Feature' as const, id: s.id, geometry: { type: 'Point' as const, coordinates: s.coordinates },
      properties: { age: lightningAge(s.observed, lightning.now), observed: s.observed, kind: s.type } })) }), [lightning.feed, lightning.now, maxAge]);
  if (!lightning.enabled) return null;
  return <GeoJSONSource id="dmi-lightning" data={data}>
    <Layer id="dmi-lightning-halo" type="circle" paint={{ 'circle-radius': 8, 'circle-color': resolved === 'dark' ? '#091B30' : '#FFFFFF', 'circle-opacity': 0.9 }} />
    <Layer id="dmi-lightning-points" type="circle" paint={{ 'circle-radius': 5, 'circle-color': ['match', ['get', 'age'], 0, '#E54836', 1, '#EF9C27', '#798BA4'] }} />
  </GeoJSONSource>;
}
