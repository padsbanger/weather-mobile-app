import { TransformRequestManager, type StyleSpecification } from '@maplibre/maplibre-react-native';
import { theme } from '../theme/tokens';

// Provider details and policy constraints are documented in PROVIDERS.md.
export const basemap = {
  tiles: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
  attribution: '© OpenStreetMap contributors',
  attributionUrl: 'https://www.openstreetmap.org/copyright',
  userAgent: 'WeatherRadarPersonal/0.1 (Android; pl.konta.weatherradar)',
};

export function configureMapRequests() {
  TransformRequestManager.addHeader({
    id: 'osm-identification', match: '^https://tile\\.openstreetmap\\.org/',
    name: 'User-Agent', value: basemap.userAgent,
  });
}

export const lightMapStyle: StyleSpecification = {
  version: 8,
  sources: { basemap: { type: 'raster', tiles: [basemap.tiles], tileSize: 256,
    minzoom: 0, maxzoom: 19, attribution: basemap.attribution } },
  layers: [
    { id: 'background', type: 'background', paint: { 'background-color': theme.color.background } },
    { id: 'basemap', type: 'raster', source: 'basemap', paint: { 'raster-fade-duration': 0 } },
  ],
};
