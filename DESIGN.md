# Design — light radar first

## Dark map and compact dock refinement (2026-09-23)

The bundled dark OpenFreeMap vector style uses slate land, blue water, brighter
roads and legible place labels. Radar layer colors and placement are unchanged.
The map headline uses saved selected-place metadata, including the default
location's metadata, or the name returned for an on-demand GPS fix. It falls
back to coordinates when the camera moves away or no name is available.

The dock has 16 dp side margins. Its first row contains play/pause, a flexible
history timeline and an expand chevron. The chevron opens reflectivity,
coverage, opacity, frame information and secondary controls. A short status
line keeps stale, failed, offline, partial and unverified coverage states
visible while collapsed. The five bottom actions use one Ionicons outline
family and a subtle cyan selected background; Locate remains momentary. At
larger system text sizes, the action row wraps into two lines so labels stay
readable and touch targets remain generous. The user removed the map and radar
credit strip, leaving the map visible immediately above the dock. Only one
modal sheet is rendered at a time; Android Back closes it.

Radar history prepares all available frames for the visible map viewport before
playback starts. The collapsed dock shows preparation progress once, then
playback changes between ready frames without a per-frame loading indicator.
Changing the viewport invalidates that preparation and starts it again.
Three compact controls above the dock provide zoom in, zoom out and GPS
recenter. The recenter control uses the same on-demand location flow as the
dock's Locate action; both respect foreground permission and safe areas.

## Unified control bar (2026-09-23)

This earlier layout was superseded by the dark map and compact dock refinement
above.

The playback row uses a small, unboxed meter icon in place of the Latest
text action. Its 48 dp touch target stays accessible while the visible symbol
matches the size and muted color of neighboring controls. It is the only
expand/collapse control in the playback row: tapping it reveals the compact
15–50 dBZ reflectivity scale and radar details. The Latest frame action
remains in those details.

The new user reference places playback and the five primary actions in one
rounded bottom surface: Layers, Forecast, Warnings, Locate and Settings. The
map fills the screen behind this surface, including its side margins and lower
safe area, so the panel floats over geography without a solid backing strip.
The bottom controls still sit inside the Android safe area. The map top shows
the selected place and displayed radar time. Active warnings get
a small indicator on the Warnings action; county selection and full details
remain in its sheet. The radar timeline and meter control share the upper row
of the surface. Expanded radar information retains opacity, the dBZ
legend, frame/fetch times and coverage explanation. The collapsed surface keeps
a short coverage caveat. Manual location selection and zoom actions are in
Settings; map gestures remain available. Map and radar credits are now visible
above the dock under the newer user instruction.

## UI tuning first pass (2026-09-23)

The light map uses OpenFreeMap Positron vector tiles. Radar is layered above
base geography and below labels; the rain palette and reflectivity meaning are
unchanged. Layers, Forecast and Settings share the top row; the coordinate bar
has been removed. Settings shows the current map center, opens manual location
search/selection, and holds the existing theme schedule. The Layers sheet
controls Rain and Lightning and opens lightning details. A warning
county/status badge is always available, including before
county selection. The collapsed radar panel shows the displayed frame time,
freshness, play, timeline, Latest, a slim dBZ legend and the coverage caveat.
Its accessible expansion button reveals opacity and complete context. Zoom
buttons share a vertical control. The map has no credit overlay after the
user's follow-up request; source credits in warning and lightning details
remain. On compact viewports, locate and zoom form a horizontal group near
the lower map edge; map loading notices narrow to leave that control group
unobstructed.
The existing map instance remains mounted through these interactions.

## User-provided visual reference
Use [ui mockup.png](<ui mockup.png>) when designing and reviewing the app. The user
added this reference on 2026-09-22. The leftmost **01 / LIGHT** concept is the
primary reference for M1–M2: a dominant map, compact rounded location bar,
pill-shaped layer controls, circular locate/zoom buttons along the right edge,
and a white bottom panel with rounded top corners, a small grab handle, clear
radar heading, intensity legend, blue play button and horizontal timeline.
Follow its spacing, proportions and visual hierarchy, adapting to Android safe
areas, larger fonts and accessible touch targets.

Translate all reference UI copy into English, including Rain, Warnings, Rain
radar and intensity labels. Keep observation time separate from fetch time.
Use actual provider frames, available timestamps and a provider-correct legend;
the mockup's weather, gradient and timestamps are illustrative. A location dot
must represent an obtained location, not a decorative or fabricated GPS fix.
Expose controls only when their features are implemented: warnings remain M4,
the middle dark concept remains M5, and lightning stays deferred. The rightmost
weather dashboard does not replace the selected map-first layout.

## Primary screen
Portrait Android screen dominated by the map (target roughly 75–80% of usable height with the playback panel collapsed at normal font size). Pale neutral land, subdued water, understated roads, legible city labels. Render authentic provider weather imagery; the previous concept image was illustrative, not geographic or meteorological ground truth.

All app copy and accessibility labels are English, never Polish.

M4 source-content exception approved on 2026-09-22: show IMGW warnings verbatim
under "Original warning · Polish", including event name, comments, issuing office
and mandatory original source credit. Controls, status and date formatting remain
English. Official geographic names are preserved. The selected warning county is
explicit and independent of the map camera or GPS; no inferred warning polygons.

At the top: Layers, Forecast and Settings. Settings contains manual map location selection. A compact warning badge shows the manually selected county and its status, and opens county selection even before one is chosen. At the right: locate and grouped zoom buttons.

At the bottom: a compact surface panel with Rain radar, displayed frame time, freshness indicator, provider-matched reflectivity legend, play/pause, Latest and a time scrubber. Show the actual available range rather than assuming every frame exists. An accessible expansion button reveals opacity and radar details. Forecast is secondary, not a large dashboard displacing the map.

## Visual system
Suggested light tokens: background #F5F7FA, surface #FFFFFF, primary text #172438, secondary text #526175, accent #1677EE, border #DEE5ED. Use semantic names rather than hardcoded colors in components. Use platform sans-serif typography, 8 dp spacing increments, 16 dp panel padding, 16–24 dp corner radii and subtle elevation. Text must survive larger Android font settings.

Match rain colors and legend to the selected provider scheme. Do not invent mm/h labels if the chosen product represents reflectivity. Pair color with text for warning severity. Do not infer storm direction or time of arrival from decorative arrows.

## Core states
- First launch: default Gdynia camera, location permission requested only on tap.
- Loading: neutral map controls and clear radar loading state.
- Stale/offline: retain cached imagery and show its original time plus a visible status.
- Coverage gap: explain that missing radar coverage is different from dry weather.
- Warning: compact amber/orange/red banner based on the source severity, opening complete details and valid times.
- Partial provider failure: the map and other working layers remain usable.

## Later: automatic dark mode (M5)
User requirement: switch based on the user's time. Implement the device's local clock/timezone, without GPS or network dependency.

Proposed defaults (implementation decisions, configurable): light from 07:00 inclusive to 19:00 exclusive; dark otherwise. Offer Auto (time), Light and Dark; optionally System. Persist the selection and configurable start/end hours. This is a clock schedule, not a sunset calculation.

Recompute on launch, foreground resume, timezone/time changes and the next boundary while foregrounded. No background service or exact alarm is needed solely for theme. If system clock changes are not observable directly, recheck periodically while active. Handle overnight schedules and daylight-saving changes using local civil time.

Change both UI and basemap style. Preserve camera, location, selected radar time, opacity, layers and playback state across map style reloads. Restore weather sources after style readiness. Keep precipitation colors semantically consistent in both modes. Use a short transition and honor reduced motion.

Acceptance examples: Auto at 06:59 is dark; at 07:00 light; at 18:59 light; at 19:00 dark. A manual Light override remains light at 22:00. A timezone change takes effect without restarting the app.
