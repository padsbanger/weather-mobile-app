import { type StyleSpecification } from '@maplibre/maplibre-react-native';
import positronStyle from './styles/positron.json';
import darkStyle from './styles/dark.json';

// Provider details and policy constraints are documented in PROVIDERS.md.
export const darkBasemap = {
  style: darkStyle as StyleSpecification,
  attribution: '© OpenMapTiles · © OpenStreetMap contributors · OpenFreeMap',
  attributionUrl: 'https://openfreemap.org/',
};
export const lightBasemap = {
  style: positronStyle as StyleSpecification,
  attribution: '© OpenMapTiles · © OpenStreetMap contributors · OpenFreeMap',
  attributionUrl: 'https://openfreemap.org/',
};
