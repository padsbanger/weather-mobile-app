# Android Weather Radar — agent instructions

## Goal and agreed decisions
Build a personal-use Android application in a new repository. Use React Native and TypeScript. The primary experience is design option 1: a light, map-first rain radar with a bottom playback panel. The app UI, accessibility labels, messages, code and development documentation must be English. Never add Polish app copy (user decision, 2026-09-22; supersedes the original Polish UI requirement).

Android only. No iOS, web app, accounts, ads, subscriptions, or backend in the MVP. Working title: Weather Radar; this is not a final branding decision.

Dark mode is a later milestone. Its default will switch by device-local time, with manual overrides. Do not implement it in the first milestone, but use semantic theme tokens from the start.

Read DESIGN.md, MILESTONES.md and SETUP.md before implementing. Work in milestone order. Preserve these files during scaffolding and record verified progress in MILESTONES.md. Resolve routine implementation decisions independently. Never mark device checks as passed unless actually performed.

Use the user-provided `ui mockup.png` as the visual design reference, specifically its leftmost `01 / LIGHT` concept for M1–M2. DESIGN.md records how to apply it. All app copy remains English even where the reference uses Polish.

M4 language exception approved by the user on 2026-09-22: keep controls and status
messages English, but show clearly labeled original Polish IMGW warning text
and the provider's required source credit. Preserve the official wording.

## Technical direction
- Expo with a custom Android development build, React Native, strict TypeScript.
- MapLibre React Native for native map rendering. It does not work in Expo Go.
- Choose mutually compatible stable Expo, React Native and MapLibre releases using their current official docs. Commit one package-manager lockfile; do not guess version combinations or mix major-version component APIs.
- Use Expo foreground location and a small persistent preferences store. Add dependencies only for a concrete need.
- Isolate provider adapters, normalized models, map rendering and playback state. Suggested feature folders: map, radar, forecast, warnings, settings; shared folders: providers, theme, storage.
- Keep a single screen initially. Forecast, warning details and settings can use sheets or simple secondary screens.

## Data and provider rules
### Radar: RainViewer
Metadata: https://api.rainviewer.com/public/weather-maps.json
Read the current schema and use the returned host and frame paths, never invented timestamps or copied sample paths. The documented baseline is two hours of past frames at ten-minute intervals and source zoom up to 7. Allow native overscaling beyond that source zoom; do not request unsupported tile levels or imply higher radar resolution.

Recheck current provider terms and working responses at implementation. Attribute RainViewer visibly. Keep forecast separate from observed radar; do not promise nowcast frames unless the actual response and current terms support them.

Fetch metadata at launch and approximately every five minutes while foregrounded, with retry backoff and cancellation. Reuse the native tile cache. Bound weather-frame preloading to the visible viewport and a small number of adjacent frames; respect provider policy. Never bulk-download a region or all zoom levels.

Validate metadata; sort and deduplicate frames. Display the selected frame time, and distinguish it from the last successful fetch. A fetch timestamp is not an observation timestamp. Flag old frames (initial configurable threshold: 20 minutes). Explain radar gaps: transparent pixels alone cannot prove no rain. Integrate the provider coverage mask or display a clear coverage caveat until available.

### Base map: separate from weather data
MapLibre is a renderer, not a hosted map provider. Select and document a personal-use-compatible map service during M1, including attribution, caching, identification and any token requirement. Do not treat demo tiles as a production service. OSM standard raster tiles are an option only if their current usage policy is met; in particular no basemap prefetch or offline bulk download. If required headers cannot be supplied by the native stack, choose a suitable alternative. Keep provider configuration replaceable. A later dark map requires a compatible dark style/provider; do not recolor precipitation when changing theme.

### Forecast: Open-Meteo
Use forecast data for the selected location. Expose hourly precipitation probability/amount, temperature and wind. Cache by rounded location and refresh on a reasonable schedule (initially 30 minutes). Label it as forecast. Validate units, timezone, null values and dates. Respect current free noncommercial limits and attribution.

### Warnings: IMGW
Use the documented endpoint https://danepubliczne.imgw.pl/api/data/warningsmeteo and inspect its real schema before implementing. Show area, severity, validity and text from the response. Do not derive polygon boundaries from area names. Start with manual administrative-area selection if reliable location-to-area mapping is unavailable. Show warnings in-app; push/background alerts are out of scope.

### Lightning: unresolved, deferred
No approved raw lightning provider has been selected. Do not scrape private endpoints, bypass access restrictions, or ship simulated strikes as live data. Keep lightning absent from MVP UI. A future provider adapter can accept coordinates and UTC occurrence times once access, coverage, cost, retention and attribution are confirmed. Public Blitzortung maps do not establish raw API permission.

## Interaction and correctness
- Default to Gdynia or the last saved location. Request location only when the user taps locate. Continue working when denied; support manual search or selection.
- Preserve map camera while toggling layers, selecting frames and opening sheets.
- Playback uses available frames, preloads cautiously and waits/skips gracefully on tile failure. Cancel stale work after rapid scrubbing or camera changes. Avoid remounting the whole map per frame.
- Show loading, empty, stale, partial and offline states independently. Keep the last usable frame with a stale badge after network failure. Never equate an API error with no rain/no warnings.
- Pause playback and polling when backgrounded. Refresh freshness and preferences on resume. No background GPS.
- Do not expose secret keys in EXPO_PUBLIC variables: anything bundled into the app is recoverable. Public client tokens must use provider-supported restrictions.
- Accessible labels, adequate contrast, at least 48 dp interactive targets, Android safe areas and hardware-back behavior.

## Verification and delivery
Run type checking, linting and focused tests for frame sorting, timestamps, playback transitions, stale detection and provider parsing. Add theme boundary tests only when M5 is implemented. Do not build extensive tests that merely duplicate UI markup.

Verify on Android emulator and preferably a real device: panning/zooming during playback, permission denial, no network, missing frames, background/resume, and warning expiration. Record anything not tested. A real provider smoke check must confirm metadata AND actual tiles, not only HTTP 200 on an endpoint.

Provide reproducible development commands and a locally installable release APK that launches without Metro at M6. Keep signing secrets outside git. Never claim the app is ready just because a mock screenshot looks correct. No paid service signup or store publishing is part of this task.

## Official references
- https://maplibre.org/maplibre-react-native/docs/setup/expo/
- https://docs.expo.dev/get-started/create-a-project/
- https://www.rainviewer.com/api.html
- https://www.rainviewer.com/api/weather-maps-api.html
- https://open-meteo.com/en/docs
- https://open-meteo.com/en/pricing
- https://danepubliczne.imgw.pl/apiinfo
- https://operations.osmfoundation.org/policies/tiles/
