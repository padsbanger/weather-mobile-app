# Weather Radar — Android

Personal-use, English-language native map and rain history application. M1 is
approved; M2 adds live RainViewer tiles and playback for milestone review. No Expo Go,
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

## Dependency audit

The initial `npm audit` reports 11 moderate dependency-chain findings rooted in
`uuid` via Expo's `xcode` tooling. No high/critical findings were reported.
The suggested force-fix downgrades Expo to SDK 46 and is not applied. This is an
upstream toolchain item to revisit, not evidence that Android checks passed.
