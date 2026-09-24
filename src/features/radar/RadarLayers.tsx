import { Layer, RasterSource } from '@maplibre/maplibre-react-native';
import { radarTiles, RADAR_SOURCE_ZOOM } from '../../providers/rainviewer';
import { type RadarSlot } from './playback';

export function RadarLayers({ displayed, staged, cached, enabled, opacity }: {
  displayed: RadarSlot | null; staged: RadarSlot | null; cached: RadarSlot[]; enabled: boolean; opacity: number;
}) {
  if (!enabled) return null;
  const slots = new Map<string, RadarSlot>();
  for (const slot of [...cached, displayed, staged]) if (slot) slots.set(slot.id, slot);
  return <>{[...slots.values()].map((slot) =>
    <RasterSource key={slot.id} id={slot.id} tiles={[radarTiles(slot.frame)]} tileSize={256} maxzoom={RADAR_SOURCE_ZOOM}>
      {/* The basemap hides prepared frames while native loads only viewport tiles.
          Keeping their sources mounted makes playback a layer-opacity change. */}
      <Layer id={`radar-preload-${slot.id}`} type="raster" beforeId="background"
        paint={{ 'raster-opacity': 1, 'raster-fade-duration': 0 }} />
      <Layer id={`radar-visible-${slot.id}`} type="raster" beforeId="radar-label-anchor"
        paint={{ 'raster-opacity': slot.id === displayed?.id ? opacity : 0, 'raster-fade-duration': 0 }} />
    </RasterSource>)}</>;
}
