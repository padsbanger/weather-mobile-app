import type { Place } from '../../providers/openMeteo.ts';
import { DEFAULT_CAMERA } from '../../storage/camera.ts';

export const SELECTED_PLACE_KEY = 'weather-radar.selected-place.v1';
export const DEFAULT_PLACE: Place = { name: 'Gdynia', center: DEFAULT_CAMERA.center };

export function placeHeadline(place: Place | null, center: [number, number]): string {
  if (place) {
    const [longitude, latitude] = center;
    const [placeLongitude, placeLatitude] = place.center;
    const latitudeKm = (latitude - placeLatitude) * 111;
    const longitudeKm = (longitude - placeLongitude) * 111 * Math.cos(latitude * Math.PI / 180);
    if (Math.hypot(latitudeKm, longitudeKm) <= 15) return place.name.split(',')[0].trim();
  }
  return `${center[1].toFixed(3)}°, ${center[0].toFixed(3)}°`;
}
