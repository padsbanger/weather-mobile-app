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

## Radar (M2): RainViewer

Checked 2026-09-22 against the [API terms](https://www.rainviewer.com/api.html),
[Weather Maps schema](https://www.rainviewer.com/api/weather-maps-api.html),
[transition summary](https://www.rainviewer.com/api/transition-faq.html) and
[color table](https://www.rainviewer.com/api/color-schemes.html).
Personal use is permitted without an account/token. Visible linked RainViewer
credit is included. Service availability and regional coverage are not guaranteed.

The transition summary is stricter than the general FAQ: use past history only,
Universal Blue (scheme 2), source zoom at most 7 and a 100 requests/IP/minute
ceiling. The real response contained 13 past frames over two hours, with empty
nowcast and satellite arrays. The application ignores those future/satellite
fields. Tile URLs always use the returned HTTPS host and opaque frame path.
The smoke check found hash-like paths, not timestamp paths.

At 15:17:43 UTC, the live metadata described 13 frames from 13:10 to 15:10 UTC.
The actual Gdynia tile at z7/x70/y40 returned a valid 256×256 PNG (2,316 bytes),
HTTP 200 and `Cache-Control: max-age=172800`. Evidence and a tile image are saved
by `npm run smoke:radar` under ignored `artifacts/`.

Rendering uses 256-pixel source tiles, smoothing on and snow recoloring off
(`2/1_0.png`). Native overscaling permits map zoom beyond 7 without requesting
unsupported radar zoom levels. The legend samples the official Universal Blue
rain column at 15, 20, 30, 35, 40, 45 and 50 dBZ, including the correct dark red
at 50 dBZ. It represents reflectivity, not rainfall rate. Weak returns below
15 dBZ can also appear; the legend is a sampled scale, not a coverage test.

Frame time is composite generation time; contributing observations may be older.
It is displayed separately from the last successful metadata fetch. A 20-minute
threshold flags outdated history and older selected frames. Blank/transparent
pixels do not establish dry weather. The coverage caveat is always visible;
the provider's coverage mask is not yet integrated.

### Loading, caching and request limits

- Metadata is validated, sorted and deduplicated; malformed entries produce a
  partial-history notice. Empty history is distinguished from a request failure.
  Refresh at launch and every five foreground minutes; failures retry with
  backoff from 15 seconds up to five minutes. Requests time out after 15 seconds
  and are aborted when backgrounded/offline.
- Persist usable metadata plus its original successful-fetch timestamp. Restore
  it on launch, then refresh; cached data does not become fresh merely by loading
  from disk. Native tiles retain provider caching headers and the ambient cache.
- Stage one adjacent frame only during playback, underneath the opaque basemap.
  This visible-to-the-renderer layer requests only current viewport weather
  tiles, while the basemap covers it. Its display layer stays transparent until
  native full-frame readiness. At most two weather sources exist: displayed and
  staged. No second map, offline packs, region scans or basemap prefetch.
- The versioned Android patch tags fully-rendered events with installed staging
  layer IDs so late events cannot complete a newer scrub request. Source removal
  cancels obsolete tile work after scrubbing or camera changes. Camera movement
  suspends staging; backgrounding stops playback and native network access.
- The same patch caps outbound RainViewer tile requests at 80 per rolling minute
  per app process, leaving headroom for metadata. Excess requests receive a local
  429/Retry-After response without contacting the provider. Shared-IP traffic
  from other clients can still cause provider throttling. The UI pauses on tile
  failure/rate limiting and retains the previously loaded frame, with a retry
  notice. This budget does not guarantee availability.
- A staged frame times out after 12 seconds; selecting another frame retries.
  Loading/readiness is conservative: basemap loading can delay a radar transition.
  The previous frame remains visible at its own timestamp; coverage/partial
  notices remain necessary even for successfully rendered transparent tiles.

Forecast, warnings and lightning remain outside the completed radar slice.
# Open-Meteo forecast and geocoding (M3)

Verified 2026-09-22 against the official [forecast docs](https://open-meteo.com/en/docs),
[geocoding docs](https://open-meteo.com/en/docs/geocoding-api),
[terms](https://open-meteo.com/en/terms) and [pricing](https://open-meteo.com/en/pricing).
The free endpoints support personal noncommercial use without an API key.
Published limits: fewer than 10,000 calls/day, 5,000/hour and 600/minute; no uptime
guarantee. Commercial distribution requires revisiting the plan and terms.
Attribution is CC BY 4.0: forecast links to Open-Meteo; search credits Open-Meteo
and the underlying GeoNames location data. English results are requested, but
proper place names can fall back to native names where translations are absent.

- Geocoding: `https://geocoding-api.open-meteo.com/v1/search`, explicit submit,
  minimum two characters, eight results, `language=en`. No location permission
  needed. Query changes, sheet closure and backgrounding cancel obsolete requests.
- Forecast: `https://api.open-meteo.com/v1/forecast`, rounded coordinates (0.01°),
  `temperature_2m,precipitation_probability,precipitation,wind_speed_10m`, explicit
  Celsius/mm/kmh units, `timezone=auto`, `timeformat=unixtime`, three days requested
  to cover the next 24 hours even late in the day. Unix timestamps are UTC instants;
  format with the returned IANA timezone, never manually add an offset.
- The parser validates units, array lengths, hourly ordering, dates, timezone and
  numeric ranges. Null values remain missing. Precipitation refers to the preceding
  hour; probability means more than 0.1 mm. This is model output, not observed radar.
- A 30-minute persistent cache retains at most 12 locations, with original fetch
  timestamps. Refresh only while the forecast sheet is open and foregrounded.
  Requests time out after 15 seconds; failures back off from 30 seconds to 5 minutes.
  Cached data remains visible with error/stale status; unavailable locations and
  expired ranges have explicit empty states. No forecast background service.
- `npm.cmd run smoke:forecast` on 2026-09-22 at 16:49:29 UTC validated actual
  Gdynia results (54.51889, 18.53188) and 72 hourly entries in Europe/Warsaw,
  with all four requested fields and no null values in that particular response.
  Evidence: `artifacts/open-meteo-search.json`, `open-meteo-forecast.json` and
  `open-meteo-smoke.json`. No weather values are hardcoded into the app.

## IMGW meteorological warnings (M4)

Verified 2026-09-22: documented public endpoint
[`/api/data/warningsmeteo`](https://danepubliczne.imgw.pl/api/data/warningsmeteo)
and [API information/terms](https://danepubliczne.imgw.pl/apiinfo). No API key.
The terms permit private use and require source attribution, plus notice when
data is processed. Both prescribed Polish statements are displayed in the sheet;
the user explicitly approved original Polish warnings and credits within the
otherwise English UI. Warning wording is preserved verbatim, not translated or
summarized into safety advice. The official IMGW warnings page is linked.

The actual response is an array with `id`, `nazwa_zdarzenia`, `stopien` (string
1–3), `prawdopodobienstwo` (percentage string), `obowiazuje_od`, `obowiazuje_do`,
`opublikowano`, `tresc`, `komentarz`, `biuro`, and `teryt` (four-digit county codes).
Do not treat `teryt` as coordinates or generate polygons from the county names.
Missing probability stays unknown. Invalid records create a partial-feed warning;
an entirely invalid response preserves the previous cache and reports failure.
Duplicate IDs retain the newest publication; conflicting equal-time records fail
validation. A successful empty response replaces the previous warnings, allowing
removed/withdrawn bulletins to disappear. Absence is not labeled cancellation.

**Time convention:** API strings contain no offset. Treat them as Polish civil
time in `Europe/Warsaw`, independently of the device timezone. This is an adapter
interpretation corroborated against the matching official bulletin, not an explicit
timezone declaration in the API documentation. On 2026-09-22, warning
`Sk20260921094811163` (county `1217`, level 1, 80%) matched
`MAW_STAN_20260921094942162.pdf` from the
[official September archive](https://danepubliczne.imgw.pl/data/arch/ost_meteo/2026/09.zip):
published 21 September 11:48, valid from 21 September 18:00 until 22 September
24:00 (23 September 00:00). API wording and county matched. Local evidence:
`artifacts/imgw-warning-reference.pdf`. The archive was inspected during development;
the app fetches only the small JSON endpoint, never archive ZIPs.

Nonexistent spring DST times are rejected. For ambiguous autumn times the app
uses earliest start/latest end and visibly flags the ambiguity. Exact end time is
exclusive: a warning stops being active at its end, not at the next network poll.
Current/upcoming/expired are separate; old records can be inspected as expired.
Validity state updates at the next boundary, every 15 foreground seconds for clock
changes, and on resume. No push notifications or background service.

Fetch at launch and every five foreground minutes; 15-second request timeout,
retry backoff from 15 seconds to five minutes, cancellation on background/offline.
Persist one feed with its original successful fetch time. At 15 minutes it is
stale. Offline, failure, partial or stale data cannot yield a current no-warning
status. Previously known warnings remain available with clear qualification.
Polling interval is an app choice, not an IMGW latency/SLA promise.

`npm.cmd run smoke:warnings` at 17:14:14 UTC on 2026-09-22 validated one real
warning, no rejected records or unknown county codes, and nonempty original text.
Normalized validity: 2026-09-21 16:00 UTC to 2026-09-22 22:00 UTC.
Evidence: `artifacts/imgw-live.json`, `imgw-smoke.json`. An empty future response
can pass the smoke check; malformed or partially invalid responses cannot.

### Administrative-area catalogue

The 380 counties are bundled from Statistics Poland's
[2026 KTS/TERYT correspondence table](https://stat.gov.pl/download/gfx/portalinformacyjny/pl/defaultstronaopisowa/5875/1/1/tablica_kts-teryt_2026.xls),
downloaded 2026-09-22. Source sheets: `Powiaty` and `Województwa`; the TERYT column
is used directly, not inferred from BDL statistical identifiers. `2262` is Gdynia
city; `1217` is tatrzański county. Official geographic names are preserved, while
county/city labels and casing are reformatted. The UI credits the source, edition,
acquisition date and processing per [GUS reuse conditions](https://bip.stat.gov.pl/en/contact-with-the-office/reuse-of-public-sector-information/).

Select a county manually, or explicitly choose All Poland. Search matches names,
regions or exact code, including input without diacritics. Selection persists and
never follows map/GPS. No location-to-county lookup or boundary dataset is claimed.
The catalogue is a versioned snapshot; refresh it when administrative units change.

To reproduce the catalogue (development only; no app/runtime dependencies):

```powershell
Invoke-WebRequest -UseBasicParsing 'https://stat.gov.pl/download/gfx/portalinformacyjny/pl/defaultstronaopisowa/5875/1/1/tablica_kts-teryt_2026.xls' -OutFile artifacts/gus-kts-teryt-2026.xls
python -m pip install --target artifacts/python-tools xlrd==2.0.2
python scripts/import-counties.py artifacts/gus-kts-teryt-2026.xls
```
