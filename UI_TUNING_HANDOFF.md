# Map-first UI tuning handoff

Date: 2026-09-23

## Purpose and scope

The user wants the map and its weather information to dominate the app, with more compact controls. This document captures the proposed improvements for implementation by another model. No UI changes have been made as part of this handoff.

Implement the first pass below as one coherent UI update. Treat the additional features as follow-up proposals, not mandatory scope for the first pass. Resolve routine layout decisions independently and preserve existing working behavior.

Read `AGENTS.md`, `DESIGN.md`, `MILESTONES.md`, `SETUP.md`, and `PROVIDERS.md` before editing. Inspect the actual code and git status rather than assuming the repository still matches this snapshot. Use `ui mockup.png`, especially the leftmost light concept, as the visual reference.

The milestone log records dark mode, forecast, warnings, and DMI lightning implementation beyond the original MVP instructions. Preserve implemented functionality; do not remove it because older planning text calls it deferred. This handoff does not approve pending milestones or authorize a commit.

## Current UI observations

Reviewed `src/features/map/MapScreen.tsx`, `src/features/radar/RadarPanel.tsx`, `src/providers/basemap.ts`, and the saved emulator screenshot `artifacts/m7-map.png`.

- The location bar and five large pills occupy several rows over the map.
- Rain, Forecast, Theme, Warnings, and Lightning share the same visual priority despite serving different purposes.
- The light OSM raster basemap contains many competing colors and labels. Labels are baked into the raster, so they cannot independently render above rain.
- The radar panel repeats its heading, status, frame time, loading text, legend explanation, and coverage caveat. It also reserves a line when no staging message is needed.
- The Latest action is hidden in expanded radar details.
- Separate floating zoom buttons and a full-width attribution strip add visual weight.

## First pass: recommended implementation

### 1. Quieter map with readable labels

- Evaluate OpenFreeMap Positron for the light map. OpenFreeMap is already used for the dark map.
- Aim for pale neutral land, subdued roads, restrained boundaries, and water distinguishable from weak radar echoes. Preserve important town names and coastlines.
- Put precipitation above base geography but below relevant city labels. Keep lightning and selected-location markers legible without overwhelming labels.
- Preserve the authentic radar palette and its matching reflectivity legend. Do not recolor rain to match the theme or imply additional radar detail at high zoom.
- Inspect the real vector style and its layer IDs before choosing insertion points. Handle style reloads and source restoration without remounting the map.
- Preserve the existing radar staging arrangement and native tile-budget protections. The milestone log documents an Android crash involving changes to staging `beforeId` during style reloads; avoid reintroducing it.
- Check current provider terms and required credits, and verify actual style resources and tiles. Update `PROVIDERS.md` if the light provider changes.

Official references checked when proposing this direction:

- https://github.com/hyperknot/openfreemap-styles — describes Positron as a clean style with POIs removed and some highway labels deferred to higher zooms.
- https://openfreemap.org/quick_start/ — mobile/native integration and style guidance.

### 2. Consolidated top controls

- Use one compact location/search bar with an adjacent settings icon.
- Place only **Layers** and **Forecast** beneath it in the normal layout.
- Layers opens a compact sheet containing Rain and, where implemented, Lightning toggles and their relevant controls. Make enabled states obvious.
- Move Theme into Settings, preserving Automatic, Light, Dark, and schedule customization.
- Keep Warnings accessible through a compact area/status badge. Ensure area selection is discoverable even before a county is selected.
- Show the selected warning county explicitly; it remains independent of map position and GPS.
- Expand the warning badge into a concise severity-colored banner for active warnings. Keep stale/unavailable status visible without a large permanent error card. Details retain the full provider text and validity period.
- Use consistent icons instead of ad hoc text glyphs where practical, with English accessibility labels.
- Reduce padding and gaps rather than shrinking touch targets below 48 dp. At large font sizes, allow an accessible alternate layout instead of clipping content.

### 3. Compact radar playback panel

Collapsed by default, with these essentials:

- Displayed frame time and age, with a compact freshness/error indicator.
- Play/pause, the available-frame timeline, range endpoints, and a directly accessible **Latest** action.
- A slim provider-correct legend retaining the dBZ unit and enough labels to interpret it.
- A short visible coverage caveat, such as “Blank areas may mean missing coverage.”
- An obvious expand/collapse control for additional information.

Expanded content contains opacity, full legend explanation, source limitations, last successful fetch, complete date/time information, and detailed status messages.

Use “Latest,” not “Live” or “Now”: the newest available radar composite is still from the past. Keep displayed imagery time distinct from a requested frame still loading and from metadata fetch time. While loading, retain the previous imagery and accurately label its time.

Replace routine staging sentences with a small loading indicator where possible. Remove idle placeholder lines. Do not hide tile failure, outdated data, offline, partial-history, or empty-history states to save space. Distinguish intentionally selected historical frames from an outdated newest provider frame.

If a grab handle is shown, provide a working expansion interaction; an accessible button is sufficient for the first pass. Avoid a decorative handle that implies unsupported dragging.

### 4. Compact map controls and credits

- Group zoom in/out in one narrow vertical control, retaining separate 48 dp targets.
- Keep locate separate and easy to reach with a thumb.
- Retain English accessibility labels and disabled/loading feedback.
- Make attribution visually lighter and place it near the map edge above the panel. Keep all required credits readable and visible, with accessible link targets that do not overlap other controls.
- Prevent controls, notices, credits, and the playback panel from colliding on small screens or with enlarged fonts.

### 5. Layout target

Aim for approximately 75–80% of usable screen height to remain map canvas with the panel collapsed at normal font size. Also assess how much of that canvas is unobstructed by floating UI. This is a design target, not a fixed-height rule that overrides accessibility or error visibility.

Keep the map mounted while opening sheets, changing layers, switching themes, and selecting frames. Preserve camera, selected radar frame, opacity, and preferences. Preserve existing playback pause/resume rules and hardware Back behavior.

## Follow-up feature proposals

Implement these separately after the first-pass layout is reviewed:

1. **Selected-place pin.** Keep a searched or manually selected place visible while panning. Visually distinguish it from an obtained GPS fix. Do not fabricate a location dot or imply the camera center is the user's location.
2. **Long-press actions.** Drop a pin and offer forecast for that coordinate or save as a favorite. Reuse current forecast and favorites behavior. Do not imply reverse geocoding exists when only coordinates are available.
3. **Scale bar.** Show a distance reference that updates with latitude and zoom, using a supported map implementation or verified distance calculation.
4. **Lightning time clarity.** Explicitly label the observation window independently of radar history. Do not imply that recent strikes correspond to an older radar frame. Preserve DMI coverage, freshness, and incomplete-data caveats. Surface a concise clarification in the first pass if controls otherwise create ambiguity.
5. **Map focus mode.** Collapse secondary controls while retaining frame time, playback, required credits, critical status, and a discoverable exit action.

Do not add guessed storm tracks, arrival-time predictions, warning polygons inferred from county names, simulated weather, new background activity, or paid services as part of this tuning.

## Likely implementation areas

- `src/features/map/MapScreen.tsx`: layout, control grouping, warning status, sheet entry points, attribution.
- `src/features/radar/RadarPanel.tsx`: collapsed/expanded presentation, Latest action, concise status.
- `src/features/radar/RadarLayers.tsx`: weather placement relative to vector labels and staging.
- `src/providers/basemap.ts`: light vector style and replaceable provider configuration.
- `src/theme/`: semantic tokens and existing theme settings.
- Existing lightning, forecast, warnings, and location sheets: reuse their logic rather than duplicating it.

Keep the installed Expo/React Native/MapLibre combination unless a concrete requirement forces a change. Avoid unrelated dependency upgrades and provider/playback rewrites.

## Acceptance and verification

- Default screen presents a readable map, compact top controls, and a compact collapsed playback panel.
- City labels remain legible over actual rain in both themes.
- All current features remain reachable, with clear layer enabled states.
- Touch targets remain at least 48 dp; text survives enlarged Android fonts. Safe areas, TalkBack labels, and hardware Back work.
- Camera and selected-frame state survive sheet interactions, layer changes, and theme switching as intended. No map remount per frame.
- Play, scrub, Latest, and pan/zoom during playback work with real tiles. Loading or failed requests never mislabel retained imagery.
- Offline, stale, partial, unavailable, and empty states remain truthful and discoverable. Warning failures never become an all-clear.
- Coverage caveat and required map/weather credits remain visible.
- Location permission remains on-demand, and denial leaves manual selection usable.
- Run `npm.cmd run typecheck`, `npm.cmd run lint`, and `npm.cmd test`. Add focused tests only for meaningful new state/data logic, not tests that duplicate UI markup.
- If changing basemap resources, adapt and run the relevant provider smoke checks, validating actual tiles and style dependencies rather than HTTP status alone.
- Verify the native app on an Android emulator in light and dark modes, including a small viewport, enlarged fonts, offline recovery, and background/resume. Check a physical device if available; explicitly record anything not tested.
- Capture before/after screenshots with comparable viewport, theme, and panel state. Use actual provider imagery; do not claim fabricated visuals as runtime evidence.
- Update `DESIGN.md` to reflect the implemented design and record verified progress and limitations in `MILESTONES.md`. Do not mark unperformed checks as passed.

Deliver a concise summary of changes, verification, remaining limitations, and screenshot locations. Follow the repository's approval rule before committing.
