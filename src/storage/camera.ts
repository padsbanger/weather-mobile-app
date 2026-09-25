export type SavedCamera = { center: [number, number]; zoom: number };
export const DEFAULT_CAMERA: SavedCamera = { center: [18.538, 54.5189], zoom: 4 };
export const CAMERA_KEY = 'weather-radar.camera.v1';

export function parseCamera(value: unknown): SavedCamera | null {
  if (!value || typeof value !== 'object') return null;
  const { center, zoom } = value as Partial<SavedCamera>;
  if (!Array.isArray(center) || center.length !== 2 ||
    !center.every((n) => typeof n === 'number' && Number.isFinite(n)) ||
    Math.abs(center[0]) > 180 || Math.abs(center[1]) > 85 ||
    typeof zoom !== 'number' || !Number.isFinite(zoom) || zoom < 2 || zoom > 18) return null;
  return { center: [center[0], center[1]], zoom };
}
