# Milestones

M1 is complete and approved by the user. M2 is next; M3–M6 remain pending. Pause after each milestone and commit only after user approval.

## M1 — Android foundation and base map
- [x] Scaffold compatible Expo/React Native/TypeScript and MapLibre development build.
- [x] Preserve project instructions; configure scripts, lockfile and semantic light theme.
- [x] Select and document a permitted base-map provider; validate actual map loading.
- [x] Implement light map shell, attribution, Gdynia default, locate and zoom.
- [x] Foreground permission denial and last camera persistence work.
Exit: Android build opens a usable, pannable native map; no paid dependency silently introduced.

## M2 — Radar MVP
- [ ] Validate live RainViewer metadata and real tiles; record source limitations.
- [ ] Render precipitation over the map with opacity and provider-correct legend.
- [ ] Add available-frame timeline, play/pause and selected time.
- [ ] Add bounded weather preloading, caching, cancellation and app lifecycle behavior.
- [ ] Handle source zoom, coverage, staleness, missing tiles and offline states.
- [ ] Focused parser/playback tests and Android interaction checks.
Exit: live rain history is usable during pan/zoom; errors never appear as dry weather. Light mode only.

## M3 — Location and forecast
- [ ] Manual location search/selection with persisted favorites; document geocoding source.
- [ ] Open-Meteo hourly forecast for selected location in a secondary sheet.
- [ ] Explicit timezone, units, source credit, caching and stale/error behavior.
Exit: observed radar and model forecast are clearly distinguished.

## M4 — IMGW warnings
- [ ] Inspect actual response schema and normalize active warnings.
- [ ] Select administrative area manually unless a reliable mapping is available.
- [ ] Show severity, area, valid times and full source text.
- [ ] Handle expired warnings, no active warnings and provider failures distinctly.
Exit: useful in-app warnings without background-location or push infrastructure.

## M5 — Dark mode by local time
- [ ] Add complete dark UI and compatible dark basemap.
- [ ] Auto schedule (default 07:00/19:00), manual overrides and persistence.
- [ ] Recompute after app resume and time/timezone changes.
- [ ] Preserve camera and radar state through style reloads.
- [ ] Test boundaries, overnight schedules, daylight-saving behavior and overrides.
Exit: automatic switching works without background permissions; radar stays readable.

## M6 — Personal-use release
- [ ] Physical Android checks, network recovery, large fonts, lifecycle and memory review.
- [ ] Validate attributions, provider usage and absence of bundled secrets.
- [ ] Build an installable release APK that runs without Metro; document signing backup.
- [ ] Write concise README with exact setup/build commands and known limitations.
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
