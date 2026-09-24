import { RADAR_SOURCE_ZOOM } from '../../providers/rainviewer.ts';

export const PREFETCH_TILE_BUDGET = 64; // Leave room below the native 80/minute guard.
export type RadarBounds = readonly [west: number, south: number, east: number, north: number];

export function visibleRadarTileCount(bounds: RadarBounds, zoom: number): number {
  const [west, south, east, north] = bounds;
  if (![...bounds, zoom].every(Number.isFinite) || south > north || west < -180 || west > 180 ||
    east < -180 || east > 180 || south < -90 || north > 90) return PREFETCH_TILE_BUDGET + 1;
  const sourceZoom = Math.max(0, Math.min(RADAR_SOURCE_ZOOM, Math.floor(zoom)));
  const tiles = 2 ** sourceZoom;
  const longitudeSpan = east >= west ? east - west : 360 - west + east;
  const westX = (west + 180) / 360 * tiles;
  const eastX = westX + longitudeSpan / 360 * tiles;
  const columns = longitudeSpan >= 360 ? tiles : Math.min(tiles, Math.max(1, Math.floor(eastX - 1e-9) - Math.floor(westX) + 1));
  const mercatorY = (latitude: number) => {
    const radians = Math.max(-85.051129, Math.min(85.051129, latitude)) * Math.PI / 180;
    return (1 - Math.asinh(Math.tan(radians)) / Math.PI) / 2 * tiles;
  };
  const rows = Math.min(tiles, Math.max(1, Math.floor(mercatorY(south) - 1e-9) - Math.floor(mercatorY(north)) + 1));
  return columns * rows;
}
