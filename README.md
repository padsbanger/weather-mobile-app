# Weather Radar — Android

Personal-use, English-language native map and rain history application. M1 is
approved; M2 and M3 are approved and committed. M4 adds IMGW warnings for review.
No Expo Go,
account, backend or API token is needed. This development app requires Metro;
a standalone release APK is the separate M6 deliverable.

## Toolchain

- Node.js 24 LTS used locally (Expo 57 minimum is Node 22.13).
- Expo SDK 57.0.24, React Native 0.86.3, React 19.2.3, MapLibre RN 11.4.0.
- New Architecture; only MapLibre v11 `Map`, `Camera` and style-spec APIs.
- JDK 17, Android SDK platform/build-tools 36, NDK 27.1.12297006.
- npm and the single committed `package-lock.json`.

Versions checked against the [Expo compatibility table](https://docs.expo.dev/versions/latest/),
the current official `blank-typescript` template and
[MapLibre requirements](https://maplibre.org/maplibre-react-native/docs/setup/getting-started/).
The [MapLibre Expo plugin](https://maplibre.org/maplibre-react-native/docs/setup/expo/)
is configured. Node, Java and the Android SDK must all be accessible from the
same Windows environment. Set `ANDROID_HOME` and `JAVA_HOME` for your installation.

## Run on Windows PowerShell

Use `.cmd` to avoid PowerShell's unsigned-script restriction; do not change your
execution policy just to run npm.

```powershell
npm.cmd ci
npm.cmd run typecheck
npm.cmd run lint
npm.cmd test
npx.cmd expo-doctor
npm.cmd run smoke:map
npm.cmd run smoke:radar
npm.cmd run smoke:forecast
npm.cmd run smoke:warnings

# Start an Android Studio emulator, or connect a phone with USB debugging.
# First build, and after native dependency/config changes:
npx.cmd expo prebuild --platform android
npm.cmd run android

# Later JS-only development, with the native app already installed:
npm.cmd start
```

`npm run android` builds and installs a development APK and starts Metro.
The local debug APK is `android/app/build/outputs/apk/debug/app-debug.apk`.
It is a development artifact, not a standalone release and may contain only the
connected emulator/device architecture. Rebuild with the target device connected.

For USB/emulator localhost connectivity, use two terminals:

```powershell
# Terminal 1
$env:NODE_OPTIONS = '--dns-result-order=ipv4first'
npx.cmd expo start --dev-client --localhost

# Terminal 2
adb reverse tcp:8081 tcp:8081
npx.cmd expo run:android --no-bundler
```

The `NODE_OPTIONS` setting avoids Windows resolving Metro's `localhost` to IPv6
only while `adb reverse` connects over IPv4. If necessary, open this exact dev
client URL after the app is installed:

```powershell
adb shell am start -a android.intent.action.VIEW -d 'exp+weather-radar://expo-development-client/?url=http%3A%2F%2F127.0.0.1%3A8081'
```

The Android directory is generated and ignored. Keep durable changes in Expo
configuration or the versioned dependency patch; never store signing keys in git.
`npm ci` must run lifecycle scripts so the no-prefetch MapLibre patch is applied.

## Expo cloud release APK

```powershell
# Once per computer: sign in to your Expo account.
npx.cmd --yes eas-cli@24.7.0 login

# Build a signed Android APK on Expo's EAS Build service.
npm.cmd run release
```

On the first build, follow the prompts to create/link the Expo project and
generate or select its Android signing keystore. Keep the resulting project ID
in `app.json` and back up the signing credentials outside git. An Expo developer
account is needed for this cloud build; the installed weather app needs no account.

The pinned CLI uses the `release` profile in `eas.json`: Android only, internal
distribution, APK, and no development client. The resulting release is intended
to launch without Metro. EAS prints a build URL with the downloadable APK when
complete. This command does not submit to Google Play or publish an OTA update.
Versioning remains local in `app.json`; increment `android.versionCode` when needed.

The ignored generated `android/` directory is rebuilt by EAS from Expo config.
The npm lockfile and MapLibre patch are included; `postinstall` applies the patch
before native compilation. `artifacts/` and signing files stay excluded from upload
through `.gitignore`. No cloud build has been submitted or verified by adding this
script; standalone APK/device acceptance remains part of M6.

References: [Expo APK builds](https://docs.expo.dev/build-reference/apk/) and
[first-build setup](https://docs.expo.dev/build/setup/).

## App behavior

The app opens at Gdynia or the last camera. Pan, zoom, use the coordinate picker,
or tap ◎ to request one foreground location fix. Denial and unavailable GPS keep
the manual map usable. Location acquisition times out after 15 seconds and stops
when the app backgrounds. Camera writes are validated and serialized.

Map loading/failure and network availability are separate states. Offline viewing
can only show fragments already in the native cache. Neither an empty map nor a
tile failure is weather information. Only completed features are exposed.

The radar panel follows the leftmost light concept in `ui mockup.png`, with
English copy. Use Play to animate available past frames or drag the timeline to
select one. The displayed time stays with the actual displayed frame while a
replacement loads. Pan/zoom preserves the map and cancels obsolete preloading.
Rain toggles the layer; the information button opens opacity, timestamps and
source details. Opacity and layer visibility persist locally.

The legend uses RainViewer's Universal Blue dBZ colors, not the mockup's invented
rainbow scale. This is observed composite history, with no nowcast. The coverage
caveat explains why transparent tiles cannot prove dry weather. Selected old
frames, outdated metadata, offline access, partial data and tile errors have
distinct notices. Rate limits pause playback with a retry countdown. Backgrounding
pauses playback and requests; returning refreshes freshness and preferences.

`npm test` covers metadata validation, ordering/deduplication, timestamps, stale
boundaries, retry timing, and playback readiness/cancellation/failure transitions.
`smoke:radar` checks actual live metadata and a real supported-zoom PNG tile. It
writes local evidence to `artifacts/`; never use it for batch tile downloading.

Provider requirements, cache behavior and the native prefetch patch are described
in [PROVIDERS.md](PROVIDERS.md). Progress and actual device verification are recorded
in [MILESTONES.md](MILESTONES.md).

## Locations and forecast (M3)

Tap the location bar to search by city/postal code, enter coordinates, or select
a saved favorite. Search runs only on submission and requests English results.
To save a search result, select it, reopen the location picker and choose
"Save current location". Favorites can be named and removed; up to 20 are stored
on the device. Favorites and coordinates work offline. A place name may fall
back to coordinates after restart; the camera and favorites remain persisted.

The Forecast button opens hourly model predictions for the current map center.
The location is captured when the sheet opens; opening/closing it preserves the
map camera and radar frame. Opening either sheet pauses radar playback.
The next 24 hourly endpoints show temperature (°C), precipitation probability
(%), precipitation amount (mm, including snow water equivalent) and wind at 10 m
(km/h). Times use the returned location timezone, including offset changes.
The download timestamp is separate from forecast times and is not a model run time.

Forecast requests use coordinates rounded to 0.01°, cache up to 12 locations,
and refresh after 30 minutes while the sheet is open and the app is foregrounded.
Backgrounding/closing cancels pending requests. Failures retry with backoff;
reopening also retries stale data. Saved data retains its timestamp, missing
values remain "Unavailable", and expired time ranges are not shown as upcoming.
An offline location without saved data is explicitly reported. Forecast and
search errors do not change observed radar data.

No new packages or native configuration were needed for M3. With the M2 native
client installed, start Metro using the commands above. `npm.cmd run smoke:forecast`
verifies actual English geocoding and hourly forecast responses; artifacts are
written under `artifacts/`. M3 checks: typecheck, lint, 11 tests, Android build
and emulator interactions. Physical phone, TalkBack/large fonts and prolonged
lifecycle checks remain pending; see MILESTONES.md for the exact coverage.

## Weather warnings (M4)

Tap Warnings and choose a county or All Poland. County search works offline using
the bundled official 2026 GUS catalogue. The chosen warning area persists and is
independent of the map center or GPS. The map banner names that area; tap it for
the warning list. No warning polygons, notifications or background monitoring.

Cards show severity levels 1–3 in text and color, validity times and affected
counties. Open a card for the full original Polish event, text, comment and issuing
office, alongside English controls/status. This source-language exception was
explicitly approved. Dates use Europe/Warsaw, including daylight-saving changes;
publication, validity and successful fetch times are separate.

The feed refreshes every five minutes while the app is foregrounded. Offline or
failed requests retain saved warnings, qualified as unconfirmed. At 15 minutes
the feed is stale. Invalid partial feeds cannot imply no active warnings. Expired
warnings leave the active count at their validity boundary; they remain inspectable
until a later successful feed replaces them. A successful empty feed clears old
records. The sheet links official IMGW information and both providers' credits.

M4 requires no new native dependency; use the existing M2/M3 development client
and Metro commands above. Verification commands:

```powershell
npm.cmd run typecheck
npm.cmd run lint
npm.cmd test
npm.cmd run smoke:warnings
npx.cmd expo run:android --no-bundler
```

The Android build and emulator checks passed, including real warning details,
offline persistence, area matching, no-active-warning state and expiry across a
temporarily advanced emulator clock (then restored). Physical phone/TalkBack,
injected network/invalid-provider failures and live bulletin withdrawal remain
unverified on device. Tests cover these parsing/state boundaries; see MILESTONES.md.

## Dependency audit

The initial `npm audit` reports 11 moderate dependency-chain findings rooted in
`uuid` via Expo's `xcode` tooling. No high/critical findings were reported.
The suggested force-fix downgrades Expo to SDK 46 and is not applied. This is an
upstream toolchain item to revisit, not evidence that Android checks passed.
