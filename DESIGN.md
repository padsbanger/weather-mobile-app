# Design — light radar first

## Primary screen
Portrait Android screen dominated by the map (roughly 70% of available height). Pale neutral land, pale blue water, understated roads, legible city labels. Render authentic provider weather imagery; the previous concept image was illustrative, not geographic or meteorological ground truth.

At the top: rounded location/search control, then compact Opady and Ostrzeżenia controls. Only expose completed features. At the right: locate and zoom buttons. Keep map and weather credits visible above the bottom sheet.

At the bottom: a compact white sheet with Radar opadów, selected frame time, freshness indicator, provider-matched intensity legend, play/pause and a time scrubber. Show the actual available range rather than assuming every frame exists. A restrained expandable row holds opacity and layer settings. Forecast is secondary, not a large dashboard displacing the map.

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
