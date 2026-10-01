---
name: yssy-yscb
description: Fly the Zibo 737-800X in the X-Plane 12 simulator from Sydney YSSY to Canberra YSCB with LNAV, VNAV, autothrottle, and autopilot. Use when departing Sydney for Canberra, checking the preloaded FMC setup, or flying the arrival, ILS, autoland, or a published go-around.
---

# Sydney to Canberra

Act through the OpenCode MCP server `flightsim-pilot` (cockpit, MCP v2). OpenCode names its tools `<server>_<tool>`; this skill uses the bare names. Read each tool schema before calling it. Cockpit changes go through the `cockpit_*` tools (`action` and, for setpoints, `value`) and only report acceptance: read the airplane afterwards. Charts and the aircraft manual are `list_documents` / `read_document` on `flightsim-pilot`.

Fly the Zibo 737-800X in X-Plane 12 from **Sydney YSSY to Canberra YSCB**, using LNAV, VNAV, autothrottle and autopilot wherever appropriate. This instruction applies only to the simulator.

**What this server can and cannot do with the FMC**

You can read the CDU display and move around it: `read_group` on `fmc-cdu`, and `cockpit_fmc_cdu` for the page keys (`legs`, `rte`, `init-ref`, `dep-arr`, `prev-page`, `next-page`), the line select keys (`lsk-1l` to `lsk-6r`), `exec`, `clr`, and `del`. There are no letter or digit keys, so you cannot type a route or performance data. The scenario loads a saved flight whose FMC holds the YSSY–YSCB route (departure runway 16R, SID GROOK1 with the WOL transition, then WOL and LEECE on H65, STAR LECE1W to runway 35; the repo file `data/YSSYYSCB01.fms` in irl-gym describes it). Verify it by opening the LEGS page and reading the lines; if the route, the arrival, or the performance data is wrong, tell the user, because you cannot correct it. Clearance (ATC) cannot be verified by any tool: it comes from the user. Weather is readable from `weather` (temperature, dew point, wind, visibility, QNH, cloud base) but there is no ATC: clearances come only from the user.

**Before flight**

Inspect the aircraft with `get_status`, and `read_group` for each group. Obtain the current Sydney departure and Canberra arrival charts: `list_documents` with kind `chart` and the airport ICAO, then `read_document`.

Verify the weight-dependent data: read `takeoff-data` (`gross-weight`, `fuel-total`, `trim-set`, `trim-calculated`, `v1-set`, `vr-set`, `v2-set`) and `v-speeds.v1`, `vr`, `v2`; they must be non-zero and calculated for this weight. Then `mcp-and-autopilot.selected-altitude` must make sense, and after arming LNAV and VNAV the FMA (`fma-roll-armed`, `fma-pitch-armed`) must show them armed. Do not reuse fuel quantity, cruise altitude, or takeoff speeds from a previous flight without checking them with the user.

Choose a Canberra ILS runway compatible with the weather, the available procedures, and the aircraft autoland capability. Obtain its frequency, identifier, magnetic course, intercept altitude, minima, and missed approach procedure from the chart. Do not invent these values.

**Control and monitoring rules**

Use named actions only. After every mode selection, confirm the resulting FMA readings (`fma-autothrottle`, `fma-roll`, `fma-roll-armed`, `fma-pitch`, `fma-pitch-armed`), aircraft response, and selected targets. Button lights alone do not establish which guidance is active.

Toggle buttons (`flight-director-toggle`, `a-t-arm-toggle`, `cmd-a`, `cmd-b`, `parking-brake-toggle`) flip every press: read the state first with `get_function_states`.

Continuously monitor `airspeed`, `altitude`, `height-agl`, `heading`, vertical speed, autopilot lights, and `fma-autothrottle`. Read telemetry; never write altitude, position, or engagement datarefs to imitate flying.

**Departure and climb**

Set both flight directors ON and autothrottle ARM (toggles; read first). Set the MCP speed to the V2 you read (`set-speed`), heading to the departure runway heading (`set-heading`), and altitude to the cleared initial altitude (`set-altitude`). Without ATC, use an initial altitude consistent with the published departure restrictions and terrain. Do not automatically reuse the previous 5,000-foot setting.

Arm `lnav` when the departure geometry permits, and arm `vnav`. Confirm their armed indications. Use `to-ga-left` for takeoff and control runway tracking and rotation manually (see the `takeoff-straight-ahead` skill for the roll).

At or above **400 feet height AGL**, once stable, trimmed and following flight director guidance, engage `cmd-a`. Verify CMD engagement and the expected lateral and vertical modes. Retract gear after positive climb (`gear-down` toggles the lever) and retract flaps according to the scheduled speeds. Verify climb thrust.

Manage the MCP altitude throughout the climb to permit the cleared climb while retaining required restrictions. If the aircraft levels at the MCP altitude, selecting a higher altitude may require the appropriate VNAV resumption action. Confirm the resulting mode before continuing.

**Cruise and descent**

Maintain LNAV and VNAV. Check the active route progress through `latitude` / `longitude` against the chart, fuel remaining, and the arrival weather (`read_group` on `weather`).

Before top of descent, confirm the arrival and approach, then select the permitted lower altitude on the MCP. VNAV descent cannot begin normally while the MCP remains at cruise altitude. Monitor path and speed; manage drag when necessary.

Do not repeatedly press `altitude-intervention` or `speed-intervention`: check the installed aircraft's behavior and which restrictions they would remove. If VNAV is unavailable, deliberately use an appropriate vertical mode with a verified altitude target and speed (`lvl-chg` or `v-s`), then recover VNAV when suitable.

Set the altimeter at the transition level: `cockpit_altimeter` action `std` selects standard pressure (read `altimeter.std-selected`), and at the transition altitude on descent `set-altimeter` with the QNH in inHg (read `weather.qnh-in-hg`; check `altimeter.setting` afterwards). The setting is made by clicking the knob, so it takes a moment.

**ILS final approach and autoland**

Tune and identify the ILS with `cockpit_radios_and_ils`: `set-nav-1-standby-frequency` (MHz), then `nav-1-swap`, and `set-nav-1-course` to the inbound course; do the same for Nav 2. Verify with `radios-and-ils.nav-1-frequency`, `nav-1-ident` (the identifier must match the chart), `nav-1-course`, and later `nav-1-localizer` and `nav-1-glideslope` (deviation in dots), `nav-1-dme` and `nav-1-glideslope-flag`. Arrange an intercept consistent with the chart, approaching the glideslope from below.

Select `app` when properly positioned. Verify LOC and G/S armed (`fma-roll-armed`, `fma-pitch-armed`), then verify their actual capture (`fma-roll` `VOR/LOC`, `fma-pitch` `G/S`). Configure gear, landing flaps, and the calculated approach speed in time for a stabilized final. From the moment LOC and G/S are captured, follow the `ils-final-hands-off` skill.

For autoland, engage the second autopilot (`cmd-b`) before 1,500 feet height AGL and verify both CMD lights and the flare readiness indications of the installed Zibo version. After glideslope capture and an established descent, set the published missed approach altitude on the MCP. Monitor the approach through touchdown; do not assume autoland is available merely because `app` is selected.

Use reverse thrust and braking as appropriate after touchdown. The pilot server has no reverse-thrust or wheel-brake actions: tell the user that the landing rollout needs manual input. Monitor directional control; do not assume automatic taxiing.

**If using an RNAV approach instead**

Follow the aircraft's supported procedure: LNAV/VNAV final guidance normally shows **LNAV and VNAV PTH**; supported IAN guidance instead uses `app` with **FAC and G/P**. Identify which system this aircraft supports before attempting it. Set minima and manage the missed approach altitude according to that procedure. An RNAV vertical path does not establish autoland capability. Plan a manual landing unless the installed system explicitly supports otherwise.

**Failures and go-around**

If approach guidance fails, the approach becomes unstable, or required visual references are absent at applicable minima, execute the published go-around. Use `to-ga-left`, verify thrust and the FMA, and control the aircraft immediately if the autopilot disconnects. Follow the published missed approach lateral path, altitude, and configuration schedule.

Never continue descending simply because a command was accepted. Establish confirmed guidance or take control.

Relevant actions (`cockpit_mcp_and_autopilot` unless noted): `lnav`, `vnav`, `cmd-a`, `cmd-b`, `app`, `hdg-sel`, `lvl-chg`, `set-speed`, `set-heading`, `set-altitude`, and `to-ga-left` (`cockpit_engines_and_thrust`).

Issue each mode action once, observe its effect, and decide the next action from the resulting aircraft state.
