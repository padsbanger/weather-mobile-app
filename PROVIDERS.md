# Providers

## Base map (M1): OpenStreetMap standard raster

Selected for this small, personal-use Android application. No account, token or
payment is required. This is a community service with best-effort availability,
not a paid SLA. Recheck the policy before distributing the app or increasing use.

- Endpoint: `https://tile.openstreetmap.org/{z}/{x}/{y}.png`, 256-pixel tiles.
- Visible, linked `© OpenStreetMap contributors` attribution remains on the map.
- Native requests identify the app as
  `WeatherRadarPersonal/0.1 (Android; pl.konta.weatherradar)`.
  MapLibre 11.4's `TransformRequestManager.addHeader` replaces the default
  User-Agent for this host only. Native apps do not require a browser Referer.
- MapLibre Native retains its ambient tile cache. Its HTTP implementation passes
  ETag, Last-Modified, Cache-Control and Expires to the native cache, and sends
  conditional requests when appropriate. We never add cache-bypass headers.
- No offline downloads, region downloads or application basemap preloading.
  A small `patch-package` patch sets Android `prefetchZoomDelta = 0` before the
  native map is created. This disables the renderer's lower-zoom prefetch;
  the RN wrapper does not expose that native option. The dependency is pinned
  to 11.4.0 and `npm ci` applies the checked-in patch. Re-review on upgrade.
- Configuration and style are isolated in `src/providers/basemap.ts`. A future
  provider switch requires editing this module and checking the new policy.
  This is the authentic OSM light cartographic style, without precipitation
  recoloring or demo tiles. A dark basemap remains an M5 decision.
- Tile requests disclose the viewed area and IP address to OSM's service.
  GPS is requested only by an explicit tap; coordinates are kept locally as
  the map camera, never sent to a geocoding service in M1.

Checked 2026-09-22:

- [OSM tile usage policy](https://operations.osmfoundation.org/policies/tiles/)
- [OSM attribution](https://www.openstreetmap.org/copyright)
- [OSMF privacy policy](https://osmfoundation.org/wiki/Privacy_Policy)
- [MapLibre Android HTTP implementation, 13.6.1](https://github.com/maplibre/maplibre-native/blob/android-v13.6.1/platform/android/MapLibreAndroid/src/main/java/org/maplibre/android/module/http/HttpRequestImpl.java)
- [Native map options](https://maplibre.org/maplibre-native/android/api/-map-libre%20-native%20-android/org.maplibre.android.maps/-map-libre-map-options/index.html)

The one-tile smoke check on 2026-09-22 at 14:51:15 UTC returned an actual
256×256 PNG (35,030 bytes), HTTP 200 and
`Cache-Control: max-age=525161, stale-while-revalidate=604800, stale-if-error=604800`.
Run `npm run smoke:map` for a single Gdynia viewport tile; do not turn this
script into a tile crawler.

Android verification on the Pixel_10 / API 36 emulator also rendered real tiles.
Temporary native debug logging confirmed the User-Agent override was applied
and cached requests received HTTP 304 responses. Verbose logging was removed
after verification. Disabling Wi-Fi and mobile data retained the cached viewport
and displayed the offline notice (translated to English after the initial M1 check). This does not provide offline download
functionality or guarantee cache coverage.

## Weather providers

RainViewer metadata, tiles, radar timestamps and weather source limitations
will be verified in M2 after the requested M1 review checkpoint. There is no
radar, forecast, warnings or lightning control in the M1 UI.
