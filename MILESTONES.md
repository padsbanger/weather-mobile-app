# Milestones

All milestones below are pending. This starter pack is a specification, not an implemented app. Complete M1–M2 first to prove the core radar experience.

## M1 — Android foundation and base map
- [ ] Scaffold compatible Expo/React Native/TypeScript and MapLibre development build.
- [ ] Preserve project instructions; configure scripts, lockfile and semantic light theme.
- [ ] Select and document a permitted base-map provider; validate actual map loading.
- [ ] Implement light map shell, attribution, Gdynia default, locate and zoom.
- [ ] Foreground permission denial and last camera persistence work.
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
