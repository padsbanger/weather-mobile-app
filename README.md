# Weather Radar for Android

A personal-use, English-language Android app with a native MapLibre map, past RainViewer rain radar, hourly Open-Meteo forecast, IMGW weather warnings, and automatic light/dark themes. Original IMGW warning text and required source statements remain in Polish. There is no account, backend, lightning layer, or Expo Go support.

## Install the standalone APK

The signed local release is `artifacts/weather-radar-release.apk` after running the build command below. Install it with:

```powershell
adb install -r artifacts/weather-radar-release.apk
```

The installed release contains its JavaScript bundle and starts without Metro or the development computer. If a development build is already installed under the same package name, Android will reject the different signing key. Uninstalling that development build removes its saved app data:

```powershell
adb uninstall pl.konta.weatherradar
adb install artifacts/weather-radar-release.apk
```

## Build from source on Windows

Use Node.js 24 LTS, JDK 17, and Android SDK platform/build-tools 36. Set `JAVA_HOME` and `ANDROID_HOME` for your installation. From this project directory:

```powershell
npm.cmd ci
npm.cmd run typecheck
npm.cmd run lint
npm.cmd test
npx.cmd expo-doctor
npm.cmd run release:local
```

`release:local` generates the ignored native Android project, bundles JavaScript, signs a release APK, and copies it to `artifacts/weather-radar-release.apk`. On first use it creates an Android signing key and credentials under `%LOCALAPPDATA%\WeatherRadar\signing`. **Back up that whole folder privately.** Losing it prevents updates over an existing installation with the same package name. Neither the key nor its password belongs in git. The build reuses the same key on later runs and refuses to silently replace a partial signing backup. The [Expo local production guide](https://docs.expo.dev/guides/local-app-production/) describes the underlying signing process.

For an optional Expo EAS cloud APK build, sign in with `npx.cmd --yes eas-cli@24.7.0 login`, then run `npm.cmd run release`. That path uses Expo-managed remote credentials and may produce an APK with a **different signing identity** from `release:local`; pick one identity for updates. No cloud build or Play Store submission is needed for the local release.

For JavaScript development, start an emulator or USB-debugging phone and run:

```powershell
npm.cmd run android
```

This installs a custom development build and starts Metro. Later, with the build already installed, use `npm.cmd start`. MapLibre cannot run in Expo Go. If Metro is reachable only over IPv4 localhost, run `adb reverse tcp:8081 tcp:8081` and start with `$env:NODE_OPTIONS='--dns-result-order=ipv4first'; npx.cmd expo start --dev-client --localhost`.
Switching back from the locally signed release to a development build also
requires uninstalling `pl.konta.weatherradar` first, which clears saved data.

## Use and limitations

The map starts at Gdynia or the last saved camera. The location button requests one foreground GPS fix only when tapped; search, favorites, and coordinates work without location permission. Rain shows available **past** radar frames with a timeline, playback, opacity, source timestamp, staleness and coverage notices. Blank radar pixels are not proof of dry weather. Radar source zoom stops at 7; enlarging it adds no detail. There are no promised future frames.

Forecast is model output for the selected map center: next 24 hourly precipitation chances/amounts, temperature, and wind. It is distinct from observed radar. Warnings use a manually chosen Polish county or All Poland; the choice does not follow GPS. The app shows the full original bulletin, severity, validity and source credit. No push or background alerts are provided. Theme settings offer Auto (device-local light 07:00–19:00 by default), Light and Dark, with configurable hours.

Network failures retain previously saved radar metadata, forecasts and warnings with qualified stale/offline states. Native map tiles are cached only as the providers allow; offline coverage is incomplete, and there is no region download. Backgrounding pauses network polling and playback. The app requires internet for fresh weather, search and uncached maps. All providers are best-effort public services with no uptime promise. Provider policies and verification are in [PROVIDERS.md](PROVIDERS.md); milestone/device test coverage is in [MILESTONES.md](MILESTONES.md).

Run single-viewport live checks as needed: `npm.cmd run smoke:map`, `npm.cmd run smoke:radar`, `npm.cmd run smoke:forecast`, and `npm.cmd run smoke:warnings`. They write ignored evidence under `artifacts/` and do not bulk-download tiles. No API secrets are bundled. The map and weather providers receive normal request data, including viewed map areas or forecast coordinates; see provider notes for details.

On a physical phone, check that GPS denial leaves manual search usable; pan
and zoom during radar playback; turn data off and back on; background/resume;
switch themes across a local-time boundary; and inspect the sheets with large
font and TalkBack. A current IMGW warning check needs a valid provider response:
the documented endpoint returned HTTP 404 on 2026-09-23, which this app reports
as unconfirmed rather than "no warnings".
