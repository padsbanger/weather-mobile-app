# Start a new Android weather app repository

## What you do
1. Create and clone a new empty repository with your chosen name.
2. Copy AGENTS.md, DESIGN.md, MILESTONES.md and this SETUP.md into its root.
3. Open that directory in your coding-agent environment and use the prompt below.
4. For local Android builds, install Node.js LTS and Android Studio with an SDK and emulator. Let the agent confirm the JDK/SDK versions required by the chosen Expo release. A physical Android phone can use USB debugging instead of an emulator.

There are no weather API keys required for the planned RainViewer/Open-Meteo/public IMGW integration. The base-map provider must still be selected and its requirements checked. Do not buy a subscription just to scaffold the project.

On Windows, keeping Node, Java, the Android SDK and build tools in one environment simplifies setup. If choosing WSL, explicitly configure emulator/device connectivity and SDK paths instead of assuming Windows adb is available inside Linux.

## Prompt to paste into your coding agent

```text
Read AGENTS.md, DESIGN.md, MILESTONES.md and SETUP.md. Build this new personal-use Android weather radar app using React Native, TypeScript, Expo development builds and MapLibre.

Implement M1 and M2 end to end first: a real light-mode native map, live RainViewer radar, playback timeline, opacity, GPS on request, attribution and honest loading/stale/offline states. Choose a permitted base-map provider and document its requirements. Verify actual metadata and tiles. The UI language is English; never add Polish app copy.

Preserve these instruction files when scaffolding. If the scaffold tool cannot initialize this nonempty directory, scaffold in a temporary sibling and copy the generated app files selectively, excluding its .git and preserving our documentation. Do not delete or replace existing instructions.

Check current official package compatibility and use a lockfile. No Expo Go, iOS implementation, backend, accounts or fabricated live lightning. Dark mode is explicitly M5; prepare theme tokens now but keep the initial product light.

Run the available checks, build Android where tooling permits, update milestone status honestly, and provide the exact commands for me to run and any specific device checks still needed. Do not stop after planning or scaffolding; finish the M1–M2 radar slice unless there is a concrete blocker.
```

## Expected development workflow
The implementing agent should verify these commands against its selected versions and record any changes in README:

```bash
# During scaffolding, in a suitable empty directory:
npx create-expo-app@latest

# In the generated project:
npx expo install @maplibre/maplibre-react-native expo-dev-client expo-location
npx expo run:android

# Subsequent JavaScript/TypeScript development:
npx expo start --dev-client
```

Add the MapLibre config plugin as described in its official guide. Rebuild after changes to native dependencies/configuration. Expo Go cannot load MapLibre's native module. The development build uses Metro; a standalone release APK is a separate deliverable in M6.

## Sources and uncertainty
Checked for this starter pack on 2026-09-22; revalidate during implementation:
- Expo project creation: https://docs.expo.dev/get-started/create-a-project/
- MapLibre Expo integration: https://maplibre.org/maplibre-react-native/docs/setup/expo/
- RainViewer terms and metadata: https://www.rainviewer.com/api.html and https://www.rainviewer.com/api/weather-maps-api.html
- Open-Meteo: https://open-meteo.com/en/docs and https://open-meteo.com/en/pricing
- IMGW: https://danepubliczne.imgw.pl/apiinfo
- OSM tile policy: https://operations.osmfoundation.org/policies/tiles/

This package contains specifications only. No application, native build or device test has been executed. The chosen 07:00–19:00 future theme schedule is a configurable default, not a claim about local sunrise/sunset. Lightning access remains unresolved.
