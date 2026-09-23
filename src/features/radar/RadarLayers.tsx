import { Layer, RasterSource } from '@maplibre/maplibre-react-native';
import { radarTiles, RADAR_SOURCE_ZOOM } from '../../providers/rainviewer';
import { type RadarSlot } from './playback';

export function RadarLayers({ displayed, staged, enabled, opacity }: {
  displayed: RadarSlot | null; staged: RadarSlot | null; enabled: boolean; opacity: number;
}) {
  if (!enabled) return null;
  return <>{[displayed, staged].filter((slot): slot is RadarSlot => slot !== null).map((slot) =>
    <RasterSource key={slot.id} id={slot.id} tiles={[radarTiles(slot.frame)]} tileSize={256} maxzoom={RADAR_SOURCE_ZOOM}>
      {/* The opaque basemap hides this staging layer, while native loads only
          its viewport tiles. At most one adjacent frame is staged at a time. */}
      <Layer id={`radar-preload-${slot.id}`} type="raster" beforeId="background"
        paint={{ 'raster-opacity': 1, 'raster-fade-duration': 0 }} />
      <Layer id={`radar-visible-${slot.id}`} type="raster"
        paint={{ 'raster-opacity': slot.id === displayed?.id ? opacity : 0, 'raster-fade-duration': 0 }} />
    </RasterSource>)}</>;
}
