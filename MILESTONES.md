# Milestones

M1 is complete, approved and committed as `b25a8ff`. M2 is committed as `b9d9dc1`; M3 as `281b553`; M4 as `f654254`; M5 as `8a01155`, all approved. M6's emulator-verified release was approved; physical-device checks remain open. Pause after each milestone and commit only after user approval.

## M1 — Android foundation and base map
- [x] Scaffold compatible Expo/React Native/TypeScript and MapLibre development build.
- [x] Preserve project instructions; configure scripts, lockfile and semantic light theme.
- [x] Select and document a permitted base-map provider; validate actual map loading.
- [x] Implement light map shell, attribution, Gdynia default, locate and zoom.
- [x] Foreground permission denial and last camera persistence work.
Exit: Android build opens a usable, pannable native map; no paid dependency silently introduced.

## M2 — Radar MVP
- [x] Validate live RainViewer metadata and real tiles; record source limitations.
- [x] Render precipitation over the map with opacity and provider-correct legend.
- [x] Add available-frame timeline, play/pause and selected time.
- [x] Add bounded weather preloading, caching, cancellation and app lifecycle behavior.
- [x] Handle source zoom, coverage, staleness, missing tiles and offline states.
- [x] Focused parser/playback tests and Android interaction checks.
Exit: live rain history is usable during pan/zoom; errors never appear as dry weather. Light mode only.

## M3 — Location and forecast
- [x] Manual location search/selection with persisted favorites; document geocoding source.
- [x] Open-Meteo hourly forecast for selected location in a secondary sheet.
- [x] Explicit timezone, units, source credit, caching and stale/error behavior.
Exit: observed radar and model forecast are clearly distinguished.

## M4 — IMGW warnings
- [x] Inspect actual response schema and normalize active warnings.
- [x] Select administrative area manually unless a reliable mapping is available.
- [x] Show severity, area, valid times and full source text.
- [x] Handle expired warnings, no active warnings and provider failures distinctly.
Exit: useful in-app warnings without background-location or push infrastructure.

## M5 — Dark mode by local time
- [x] Add complete dark UI and compatible dark basemap.
- [x] Auto schedule (default 07:00/19:00), manual overrides and persistence.
- [x] Recompute after app resume and time/timezone changes.
- [x] Preserve camera and radar state through style reloads.
- [x] Test boundaries, overnight schedules, daylight-saving behavior and overrides.
Exit: automatic switching works without background permissions; radar stays readable.

## M6 — Personal-use release
- [ ] Physical Android checks, network recovery, large fonts, lifecycle and memory review.
- [x] Validate attributions, provider usage and absence of bundled secrets.
- [x] Build an installable release APK that runs without Metro; document signing backup.
- [x] Write concise README with exact setup/build commands and known limitations.
Exit: the owner can install and use the app independently of the development computer.

## Deferred — lightning
- [ ] Confirm permitted live data access, coverage, cost, latency and retention.
- [ ] Then implement point layer, age legend, time filtering and honest update status.
This is not a gate for the radar release. Do not show synthetic strikes as real observations.

## Progress log
For each completed milestone record: changes, commands/checks actually run, device/emulator used, unresolved issues. Keep unchecked any requirement that has not been verified.

### M1 — 2026-09-22 — complete and approved

- Scaffolded in a temporary sibling, selectively copied app files, excluding its
  `.git` and instruction files. AGENTS.md, DESIGN.md and SETUP.md remain unchanged.
- Expo 57 / React Native 0.86.3 / React 19.2.3 / MapLibre RN 11.4.0, checked against
  current official requirements and the official Expo template. npm lockfile;
  strict TypeScript; Android-only config and development client; semantic light
  tokens with no dark-mode implementation.
- Real OSM raster map, linked visible attribution, Gdynia default, zoom buttons,
  coordinate picker, persistent camera, one-fix foreground GPS, permission-denial
  feedback, separate loading/map-error/offline notices. No unfinished weather
  controls. Provider terms and native request/caching details: PROVIDERS.md.
- OSM no-prefetch requirement enforced by the checked-in version-pinned MapLibre
  patch. Native request logs confirmed our User-Agent and conditional HTTP 304s.
- Host: Windows PowerShell, Node 24.15.0, JDK 17.0.20.1, Android SDK 36,
  build-tools 36.0.0, NDK 27.1.12297006. Emulator: Pixel_10, Android 16 / API 36,
  x86_64. No physical device tested.
- Passed: `npm.cmd run typecheck`, `npm.cmd run lint`, `npm.cmd test` (camera
  parsing/range validation), `npx.cmd expo install --check`, `npx.cmd expo-doctor`
  (21/21), and `npm.cmd run smoke:map` (PNG signature/dimensions, actual bytes and
  cache headers; not merely status 200).
- Passed native builds: `npx.cmd expo prebuild --platform android --no-install`
  and `npx.cmd expo run:android --no-bundler`. Installed development APK at
  `android/app/build/outputs/apk/debug/app-debug.apk`. This requires Metro and
  targets the emulator ABI; it is not the M6 release APK.
- Emulator checks passed: real native map render; initial Gdynia without a location
  request; panning and zoom buttons; permission denial with Polish feedback;
  explicit GPS request with emulator-injected fix (54.445, 18.565); location
  subscription removed after fix (verified via `dumpsys location`); manual
  coordinates (54.350, 18.640); hardware Back dismisses the picker; saved camera
  survives force-stop/relaunch; cached viewport plus offline banner with Wi-Fi and
  data disabled; recovery after re-enabling network; background/return retains map.
- The permission dialog exposed an Android lifecycle bug during testing; fixed
  by keeping the permission result pending when the dialog backgrounds the
  activity, while still cancelling active GPS work on background. Denial and
  granted one-fix behavior were then verified. The emulator's GPS fix is a test
  input, not a real physical-device location claim.
- Windows Metro bound only to IPv6 with default localhost resolution. Verified
  workaround: `NODE_OPTIONS=--dns-result-order=ipv4first`, localhost Metro and
  `adb reverse tcp:8081 tcp:8081`. Exact PowerShell commands are in README.md.
- Local ignored evidence is in `artifacts/`: map/offline/denial/GPS screenshots,
  accessibility hierarchy captures and native provider log excerpts.
- Outstanding: physical phone verification, approximate-location permission,
  explicit GPS cancellation during an in-flight request on Home, missing-tile
  injection, larger fonts/TalkBack and long-running lifecycle/memory checks.
  Radar parsing, freshness, playback and all weather-specific checks belong to
  M2 and have not been run. RainViewer metadata/tiles are not yet verified.
- `npm audit` reports 11 moderate transitive/toolchain findings rooted in uuid
  through xcode/Expo; no high/critical findings. No forced SDK downgrade applied.
- Stop here for the explicitly requested M1 review. No commit has been made.

### M1 language correction — 2026-09-22

- User superseded the Polish UI requirement: English app copy only, including
  accessibility labels, validation, loading/offline and location messages.
- Translated all current app-authored strings and updated AGENTS.md, DESIGN.md,
  SETUP.md and README.md to preserve the English requirement for future work.
  Earlier Polish-language verification notes above describe the original run.
- Type checking, linting and diff whitespace checks passed. No new dependencies
  or native changes; no commit made. M1 remains at the approval checkpoint.
- OSM raster tiles contain provider-rendered local geographic labels. These are
  baked into the images and cannot be translated by changing application copy.

### Visual reference added — 2026-09-22

- Reviewed the user-provided `ui mockup.png` and recorded its leftmost
  `01 / LIGHT` concept as the M1–M2 design reference in DESIGN.md and AGENTS.md.
- Apply the reference during subsequent UI work, retaining English copy and
  actual provider data. This records design direction, not a completed visual
  implementation or approval to commit M1/start M2.

### M1 approval — 2026-09-22

- User confirmed: "Looks good. MIlestone complete." M1 is approved for commit;
  continue with M2 and pause again before its commit.

### M2 — 2026-09-22 — complete and approved

- Added live RainViewer metadata parsing, normalized past frames, available-frame
  timeline/playback, persisted opacity/layer visibility, visible attribution,
  source-correct Universal Blue reflectivity legend and coverage caveat.
- Updated the layout toward `ui mockup.png` / 01 LIGHT: compact rounded location
  control, Rain pill, circular map buttons and white bottom playback panel.
  App copy remains English. No dark mode, future radar, warning or lightning UI.
- Live smoke at 15:17:43 UTC validated 13 metadata frames and actual Gdynia PNG
  bytes at supported zoom 7. Response host and opaque hash paths are used intact.
  Native requests during playback also confirmed radar zoom 7 while map zoom
  exceeded it. Full provider details and evidence paths are in PROVIDERS.md.
- Metadata refreshes every five foreground minutes, with bounded retry backoff,
  timeouts and cancellation. Cached metadata keeps its original fetch time.
  Selected composite time is separate from successful fetch time. Empty, partial,
  old-history, older-selected-frame, offline and failure notices are distinct.
- At most one adjacent frame is staged under the opaque basemap, with the prior
  frame visible until native readiness. Unique staging IDs reject late callbacks;
  camera movement cancels staging and waits 350 ms after settling to restart it.
  Duplicate native readiness events do not reset the playback dwell timer.
- Expanded the version-pinned native patch to report installed staging layer IDs
  on full-frame rendering and enforce an 80 radar tile requests/minute process
  budget. The documented provider ceiling is 100 requests/IP/minute. No bulk
  downloads, offline packs or basemap preloading. The patch contains only two
  Kotlin source files; generated build artifacts were excluded and reverse-apply
  validation passed. Rebuild the native client after pulling this milestone.
- Passed: typecheck, lint, seven focused tests, Expo Doctor (21/21), native Android
  build/install, metadata + tile smoke. The focused tests cover ordering, duplicate
  frames, malformed/empty metadata, safe hosts/paths, timestamps, freshness boundary,
  retry limits, available-frame wrapping, late callbacks, readiness, cancellation,
  and retained imagery after failure. Node prints a harmless TS module-detection
  warning during the tests; no test failed.
- Emulator: Pixel_10 / Android 16 API 36 / x86_64. Verified actual radar rendering,
  playback advancing through history during pan/zoom, timeline interaction,
  expanded details with separate local timestamps, opacity adjustment, offline
  cached imagery plus status, reconnect/update, and Home/resume pausing playback.
- A native tile 429 occurred during interaction testing: playback paused, the
  15:50 frame remained displayed, and the UI reported unavailable tiles instead
  of dry weather. The native limit/failure path was exercised rather than a fake
  radar image. Added a retry countdown and suppressed the handled dev LogBox so
  it cannot cover the playback controls. No unsupported source zoom appeared in
  the inspected native radar request logs.
- Local evidence: `artifacts/rainviewer-smoke.json`, `rainviewer-metadata.json`,
  `rainviewer-tile.png`, `m2-map.png`, `m2-offline.png`, `m2-rate-limit.xml`,
  `m2-play-resume.xml`, `m2-opacity.xml`, and `m2-build.log`.
- Remaining device coverage: physical phone, TalkBack/larger fonts, prolonged
  memory/performance run, specifically injected 404/transparent/malformed tile
  bodies, and forced stale-provider clock scenarios. Staleness is verified by
  focused boundary tests; historical-frame age is displayed in the emulator.
  Coverage-mask integration is deferred in favor of the allowed persistent caveat.
  Full render readiness can wait on basemap tiles; failure/timeout retains the
  last frame and requires another selection. M6 standalone APK remains pending.
- Stop for M2 user review before committing. M1 commit remains `b25a8ff`.

### M2 approval — 2026-09-22

- User confirmed: "Looks good. MIlestone complete." M2 is approved for commit.
- The requested M1–M2 radar slice is complete. Remaining device checks above
  remain outstanding; approval does not mark them as tested. M3–M6 are pending.

### M3 — 2026-09-22 — complete and approved

- Added submitted English Open-Meteo/GeoNames search, existing coordinate selection,
  and up to 20 named local favorites with removal and serialized persistence.
  Manual selection remains available without GPS permission and while offline.
- Added a secondary light forecast sheet following the map-first design. Opening
  either sheet pauses radar playback; the native map stays mounted. Forecast uses
  the map center captured on opening and is explicitly labeled model forecast.
- Displays the next 24 hourly endpoints: temperature, precipitation probability
  and amount, and wind; units and the location timezone are explicit. Download
  time is separate from forecast time. Parser preserves missing values and rejects
  invalid units, dates, arrays, ranges and timezones. No inferred radar predictions.
- Cache rounds coordinates to 0.01°, retains up to 12 locations, and refreshes
  after 30 foreground minutes with the sheet open. Timeout, backoff, cancellation,
  offline, missing-cache, expired-hours, partial and stale states are implemented.
  Provider details and live evidence are documented in PROVIDERS.md.
- Passed `npm.cmd run typecheck`, `npm.cmd run lint`, `npm.cmd test` (11 tests),
  `npm.cmd run smoke:forecast`, and `npx.cmd expo run:android --no-bundler`.
  Build succeeded in 16 seconds; development APK installed on Pixel_10 / API 36 /
  x86_64. No dependencies added; existing package versions and lockfile unchanged.
- Live provider smoke confirmed real English Gdynia search results and 72 hourly
  forecast entries in Europe/Warsaw with validated units and future timestamps.
- Emulator checks: submitted Gdynia search and selected real result; native camera
  moved to the result; forecast rendered actual hourly values and attribution;
  hardware Back closed sheets; favorite saved and survived force-stop/relaunch;
  offline favorite selection worked; cached forecast retained its download time;
  panning to an uncached location offline showed an explicit no-saved-data state.
  Network restored and app returned with camera/radar intact.
- Emulator testing caught a false transient stale badge when fetch completion was
  newer than the freshness clock. Fetch success now updates that clock atomically.
  Unit tests cover freshness boundaries, future cache times, DST repeated hours,
  null-versus-zero, invalid provider data and geocoding errors/empty results.
- Evidence in ignored `artifacts/`: `m3-build.log`, `m3-result.xml`,
  `m3-forecast.png`, `m3-persist.xml`, `m3-offline.xml`, `m3-uncached.xml` and
  `open-meteo-smoke.json`. Screenshots are development-client views, not release proof.
- Still untested on device: physical phone, TalkBack/large fonts, full 30-minute
  refresh wait, injected malformed/partial/429 responses and forced stale cache.
  Boundary/schema cases have focused tests; no claim that those device checks passed.
  M6 standalone APK remains pending. Pause here for M3 approval before committing.

### M3 approval — 2026-09-22

- User confirmed: "Looks good. MIlestone complete. Work on next milestone."
  M3 is approved for commit; proceed with M4 and pause before its commit.
- Outstanding device checks remain unverified.

### M4 — 2026-09-22 — complete and approved

- M3 approved and committed as `281b553`. User authorized proceeding with M4.
  User also explicitly approved English UI with clearly labeled original Polish
  IMGW warning text and required source credits. AGENTS.md/DESIGN.md record this.
- Inspected actual IMGW JSON: string severity/probability, offset-less validity and
  publication dates, original event/text/comment/office, and county TERYT codes.
  Verified the live warning's times, wording and county against the matching
  official PDF bulletin in IMGW's public September archive. Adapter interprets
  dates in Europe/Warsaw; API timezone is not explicitly declared in its docs.
- Added real warning adapter, five-minute foreground refresh, timeout/backoff and
  cancellation, one-feed cache, 15-minute stale status and original fetch time.
  Empty success, malformed/partial feed, offline, failed refresh and expired
  validity are distinct. Failure never implies no active warnings.
- Bundled the official GUS 2026 catalogue of 380 counties using actual TERYT codes.
  Offline search and persisted manual county/All Poland selection are independent
  of the map camera and GPS. No guessed boundaries, polygons or reverse geocoding.
  Provider terms, attribution, source evidence and catalogue regeneration documented.
- Added light Warnings pill, area-labeled map banner, list and full-detail sheet.
  Severity 1–3 uses semantic amber/orange/red tokens plus text. Full original
  source text remains selectable; controls and statuses remain English. Hardware
  Back closes details before the list. Map remains mounted; opening pauses radar.
- Passed: `npm.cmd run typecheck`, `npm.cmd run lint`, `npm.cmd test` (18 tests),
  `npm.cmd run smoke:warnings`, `npx.cmd expo-doctor` (21/21),
  `npx.cmd expo run:android --no-bundler` (6-second
  incremental build/install). No new app packages/native configuration; lockfile
  unchanged. Development APK still requires Metro; M6 standalone release is pending.
- Tests cover validity boundaries, Warsaw DST summer/winter, nonexistent/repeated
  local times, deduplication/revisions, contradictory source records, invalid and
  partial data, null probability, matching county codes, stale/failed/offline
  no-warning prevention and official catalogue integrity. No markup-only tests.
- Pixel_10 / Android 16 API 36 / x86_64: selected tatrzański county from the actual
  live warning; verified level 1, 80%, full Polish text, validity and publication
  times. Area and feed survived force-stop/relaunch with Wi-Fi/data disabled.
  Offline banner said Saved warnings, not a current all-clear. Network recovery
  refreshed the successful-check time. Search for `2262` selected Gdynia and
  showed no active warnings in the latest valid feed. Panning left that area fixed.
- Expiry verified on the emulator without fabricated weather: disabled network,
  advanced emulator clock to 20 seconds before the real warning's 22:00 UTC end,
  and observed Saved warnings: 1 before expiry, then Current warning status
  unavailable afterward (offline). Clock, automatic-time setting and network were
  restored in a finally block. Radar camera remained intact. Source data was not
  changed; injected time was test-only and no test override ships in the app.
- Local evidence: `artifacts/imgw-smoke.json`, `imgw-warning-reference.pdf`,
  `m4-build.log`, `m4-active.xml`, `m4-details.png`, `m4-persist.xml`,
  `m4-before-expiry.xml`, `m4-expired.xml`, `m4-empty.xml` and `m4-pan.xml`.
- Remaining device checks: physical phone, TalkBack/large fonts, injected HTTP
  429/500/malformed/partial responses, an actual provider withdrawal/revision,
  prolonged polling/memory behavior, and an autumn DST transition on device.
  Corresponding pure parser/status boundaries are tested where applicable.
  Pause for M4 user review before committing; M5 has not started.

### Release command requested — 2026-09-22

- Added `npm.cmd run release` using pinned EAS CLI 24.7.0 and an Android-only
  `release` profile producing an internally distributed, signed APK without a
  development client. Documented Expo login, project linking and signing setup.
- This prepares the requested cloud build command; no EAS build was submitted,
  no release APK was verified, and M6 remains pending. M4 still awaits approval.

### M4 approval — 2026-09-23

- User approved M4 and requested a commit and M5 implementation. The Expo release
  script is included in the approved commit. An Expo project ID and explicit
  foreground location permissions had also been added to app.json locally; these
  are preserved in the commit. No release build or credentials are claimed.

### M5 — 2026-09-23 — implemented, awaiting approval

- Added semantic dark colors across the map controls, radar panel, location,
  forecast and warning sheets. The visual direction follows the middle dark
  concept in `ui mockup.png`. English UI remains in place, with the previously
  approved original Polish IMGW warning text and source statements.
- Added OpenFreeMap's real dark vector style. The map keeps one native MapLibre
  view; changing styles retains the camera and radar state. A radar staging
  layer stays below each style's opaque `background` layer. This also avoids
  a MapLibre 11.4 Android crash when changing `beforeId` while a style reloads.
  The radar palette is unchanged; the legend now shows source colors without
  applying the user's layer opacity to its swatches. Visible attribution
  changes with the selected basemap. Provider terms and an actual vector tile
  check are recorded in `PROVIDERS.md`.
- Theme settings offer Automatic, Light and Dark. Automatic uses device-local
  civil time: light 07:00 inclusive to 19:00 exclusive by default. The two
  configurable hours can cross midnight; equal endpoints are disallowed.
  Preferences persist. The app recalculates at schedule boundaries, at least
  every 30 foreground seconds for timezone/clock changes, and on resume.
  There is no background timer or permission. A short map opacity transition
  respects the Android reduced-motion setting.
- Passed `npm.cmd run typecheck`, `npm.cmd run lint`, `npm.cmd test` (22 tests),
  `npx.cmd expo install --check`, `npx.cmd expo-doctor` (21/21) and
  `npx.cmd expo run:android --no-bundler` (debug APK, Pixel_10 Android 16/API 36).
  Theme tests cover exact 07:00/19:00 boundaries, overnight schedules, manual
  overrides, invalid saved settings and Warsaw spring/autumn DST hours.
- On the emulator, switched light → dark → light → dark → Auto with actual
  basemap tiles and credits visible. The camera center remained 54.476°,
  18.544°; radar playback continued across a style switch. Force-stopping
  and reopening restored the manual Dark choice; selecting Auto returned to
  Light at the emulator's local 16:40. Android Back closed the theme sheet.
  Screenshots under ignored `artifacts/m5-*.png` record these checks.
- Not yet checked on a physical device: real clock/timezone change or a live
  DST crossing, reduced-motion transition, TalkBack/large fonts, poor-network
  style reload, and long-running playback/memory. The debug APK still needs
  Metro; standalone release verification is M6. M5 is uncommitted pending user
  approval.

### M6 — 2026-09-23 — release built; physical checks pending

- User approved M5; committed it as `8a01155`. Added an idempotent Expo config
  plugin for local Android release signing and `npm.cmd run release:local`.
  The script generates or reuses a 3072-bit RSA signing key under
  `%LOCALAPPDATA%\WeatherRadar\signing`, outside the repository. It refuses
  to replace an incomplete key/credentials pair. The ignored generated Android
  project and `artifacts/weather-radar-release.apk` contain the build output.
  `README.md` gives exact install/build commands and private backup instructions.
- `app:assembleRelease` bundled JavaScript and produced an installable APK for
  arm64-v8a, armeabi-v7a, x86 and x86_64. `apksigner verify` confirmed v2
  signing by `CN=Weather Radar Personal`; `aapt dump badging` confirmed package
  `pl.konta.weatherradar`, version 0.1.0. No background-location permission.
  Legacy external-storage permissions were blocked before the final build.
- Installed the signed release on Pixel_10 Android 16/API 36 after uninstalling
  the differently signed debug client. Metro was stopped. The app launched
  directly with native tiles, radar history and visible credits; no developer
  server was used. Fresh launch, warning error state, 1.3× fonts, offline cached
  map/radar, network recovery, foreground/background resume, and pan/zoom were
  exercised. Playback paused on background. The camera persisted. Screenshots
  under ignored `artifacts/m6-*.png` record these checks. A short memory sample
  showed TOTAL PSS 122 MB before pan/zoom, 147 MB after loading more map tiles,
  and 112 MB after later idle/background; this is not a long soak test.
- The final APK was reinstalled with `adb install -r` under the same signing
  identity and launched with Metro absent; the dark vector map and full
  `© OpenStreetMap contributors` credit rendered. Final APK size: 116,674,717
  bytes. SHA-256: `99A0258A60A56FF93A28588965F2A2D81C10EEE58F6BFDA4233A8F51D65ED8DF`.
  Its manifest has coarse/fine location and network permissions, without
  background location or legacy external-storage permissions.
- Passed `npm.cmd run typecheck`, `npm.cmd run lint`, `npm.cmd test` (22 tests),
  and `npx.cmd expo-doctor` (21/21). Live smoke checks passed for actual OSM
  raster and RainViewer metadata/tile bytes and Open-Meteo forecast. The
  official IMGW warning endpoint returned HTTP 404 with an empty body during
  this check, despite still appearing in official API documentation. Its
  meaning is undocumented, so the app correctly shows warning status as
  unconfirmed rather than treating the response as no active warnings.
- Attribution was inspected in the rendered light/dark map and source sheets;
  current provider terms and no-bulk-download behavior are in `PROVIDERS.md`.
  Source/configuration and tracked-file scans found no bundled private token,
  keystore or credentials. The signing key/password remain in the local profile.
- No physical Android phone is connected. Physical install, GPS denial,
  TalkBack, large fonts, poor-network playback, actual timezone/DST switching,
  long-running memory/battery behavior, and recovery from a future valid IMGW
  feed remain unverified there. The first checklist item remains open.
  The user approved this release milestone for commit on 2026-09-23; physical
  device checks remain open and are not claimed as passed.
