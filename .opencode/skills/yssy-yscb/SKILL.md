---
name: yssy-yscb
description: Fly the Zibo 737-800X in the X-Plane 12 simulator from Sydney YSSY to Canberra YSCB with LNAV, VNAV, autothrottle, and autopilot. Use when departing Sydney for Canberra, checking the preloaded FMC setup, or flying the arrival, ILS, autoland, or a published go-around.
---

# Sydney to Canberra

Act through the OpenCode MCP server `flightsim-pilot` (cockpit, MCP v2). OpenCode names its tools `<server>_<tool>`; this skill uses the bare names. Read each tool schema before calling it. Cockpit changes go through the `cockpit_*` tools (`action` and, for setpoints, `value`) and only report acceptance: read the airplane afterwards. Charts and the aircraft manual are `list_documents` / `read_document` on `flightsim-pilot`.

Fly the Zibo 737-800X in X-Plane 12 from **Sydney YSSY to Canberra YSCB**, using LNAV, VNAV, autothrottle and autopilot wherever appropriate. This instruction applies only to the simulator.

**What this server can and cannot do with the FMC**

You can read the CDU display and move around it: `read_group` on `fmc-cdu`, and `cockpit_fmc_cdu` for the page keys (`legs`, `rte`, `init-ref`, `dep-arr`, `prev-page`, `next-page`), the line select keys (`lsk-1l` to `lsk-6r`), `exec`, `clr`, and `del`. You can also type into the scratchpad with `cdu-type`, but this scenario does not need it. The scenario loads a saved flight whose FMC holds the YSSY–YSCB route (departure runway 16R, SID GROOK1 with the WOL transition, then WOL and LEECE on H65, STAR LECE1W to runway 35; the repo file `data/YSSYYSCB01.fms` in irl-gym describes it). Verify it by opening the LEGS page and reading the lines; if the route, the arrival, or the performance data is wrong, correct it through the CDU (`cdu-type`, line select keys, `exec`) or tell the user if you cannot. Clearance (ATC) cannot be verified by any tool: it comes from the user. Weather is readable from `weather` (temperature, dew point, wind, visibility, QNH, cloud base) but there is no ATC: clearances come only from the user.

**Flight phase (progress tiles on the stream)**

The active run has a flight phase shown on the overlay as progress tiles. Read it with `get_run` and change it with `set_run_phase` (`phase`), once, at the moment the flight enters the next phase. Phases in order: `preflight` (a new run starts here), `takeoff`, `climb`, `cruise`, `descent`, `approach`, `landing`, `arrived`. Do not skip ahead and do not set a phase for something that has not happened yet.

- `takeoff`: when you start the takeoff roll (`to-ga-left`).
- `climb`: at positive climb, gear up.
- `cruise`: when level at the cruise altitude.
- `descent`: when you start the descent from cruise (top of descent).
- `approach`: when you start the arrival procedure inbound to the ILS (intercepting the localizer or established on the approach).
- `landing`: on final, after LOC and G/S capture and landing configuration, until touchdown.
- `arrived`: after the aircraft has landed and stopped on the runway or vacated it.

If `get_run` returns no run, tell the user; you cannot start one.

**Checklist (the flight is scored on it)**

The run has a checklist for this flight: takeoff, climb and cruise, descent, approach, ILS landing and after landing. The checklist you see with `read_checklist` and `list_checklist_categories` is already that one. The user reads how much of it you marked, so work from it:

- At the start of each phase read its section: `read_checklist` with `category` (`takeoff`, `climb_cruise`, `descent`, `approach`, `landing`, `after_landing`). The first scoped read returns `user_id`, `run_id` and `execution_id`; reuse them.
- Mark an item with `mark_checklist` (`section`, `item`) as soon as you have done it and confirmed it with a reading or the FMA. If you did it before reading the section, read the section and mark it now. Never mark an item you did not do and never mark a whole section in one go. If an item cannot be done, leave it unmarked and say so.
- Before each `set_run_phase`, read the section of the phase you are leaving and mark everything you did and confirmed.
- Marks record your acknowledgement, not the simulator state, so keep reading the airplane as usual.

**Before flight**

Inspect the aircraft with `get_status`, and `read_group` for each group. Obtain the current Sydney departure and Canberra arrival charts: `list_documents` with kind `chart` and the airport ICAO, then `read_document`.

Verify the weight-dependent data: read `takeoff-data` (`gross-weight`, `fuel-total`, `trim-calculated`, `v1-set`, `vr-set`, `v2-set`) and `v-speeds.v1`, `vr`, `v2`; they must be non-zero and calculated for this weight. Then `mcp-and-autopilot.selected-altitude` must make sense, and after arming LNAV and VNAV the FMA (`fma-roll-armed`, `fma-pitch-armed`) must show them armed. Do not reuse fuel quantity, cruise altitude, or takeoff speeds from a previous flight without checking them with the user.

Choose a Canberra ILS runway compatible with the weather, the available procedures, and the aircraft autoland capability. Obtain its frequency, identifier, magnetic course, intercept altitude, minima, and missed approach procedure from the chart. Do not invent these values.

Trim: use `cockpit_flight_controls` action `set-stabilizer-trim` once with the target in units (for example `takeoff-data.trim-calculated`); the server trims up or down itself and corrects until the reading matches, so never click trim in a loop. Verify with `flight-controls.stabilizer-trim`. Do not write trim datarefs with `write_dataref`. Nav radios: tune with `set-nav-1-standby-frequency` then `nav-1-swap`, never by writing the radio datarefs; `radios-and-ils` also has the Nav 2 DME reading.

**Control and monitoring rules**

Use named actions only. After every mode selection, confirm the resulting FMA readings (`fma-autothrottle`, `fma-roll`, `fma-roll-armed`, `fma-pitch`, `fma-pitch-armed`), aircraft response, and selected targets. Button lights alone do not establish which guidance is active.

Toggle buttons (`flight-director-toggle`, `a-t-arm-toggle`, `cmd-a`, `cmd-b`, `parking-brake-toggle`) flip every press: read the state first with `get_function_states`.

Continuously monitor `airspeed`, `altitude`, `height-agl`, `heading`, vertical speed, autopilot lights, and `fma-autothrottle`. Read telemetry; never write altitude, position, or engagement datarefs to imitate flying.

**Departure and climb**

Set both flight directors ON and autothrottle ARM (toggles; read first). Set the MCP speed to the V2 you read (`set-speed`), heading to the departure runway heading (`set-heading`), and altitude to the cleared initial altitude (`set-altitude`). Without ATC, use an initial altitude consistent with the published departure restrictions and terrain. Do not automatically reuse the previous 5,000-foot setting.

Arm `lnav` when the departure geometry permits, and arm `vnav`. Confirm their armed indications. Use `to-ga-left` for takeoff and control runway tracking and rotation manually (see the `takeoff-straight-ahead` skill for the roll).

At or above **400 feet height AGL**, once stable, trimmed and following flight director guidance, engage `cmd-a`. Verify CMD engagement and the expected lateral and vertical modes. Retract gear after positive climb (`gear` with value 0) and retract flaps according to the scheduled speeds. Verify climb thrust.

Manage the MCP altitude throughout the climb to permit the cleared climb while retaining required restrictions. If the aircraft levels at the MCP altitude, selecting a higher altitude may require the appropriate VNAV resumption action. Confirm the resulting mode before continuing.

**Cruise and descent**

Maintain LNAV and VNAV. Check the active route progress through `latitude` / `longitude` against the chart, fuel remaining, and the arrival weather (`read_group` on `weather`).

Before top of descent, confirm the arrival and approach, then select the permitted lower altitude on the MCP. VNAV descent cannot begin normally while the MCP remains at cruise altitude. Monitor path and speed; manage drag when necessary.

Do not repeatedly press `altitude-intervention` or `speed-intervention`: check the installed aircraft's behavior and which restrictions they would remove. If VNAV is unavailable, deliberately use an appropriate vertical mode with a verified altitude target and speed (`lvl-chg` or `v-s`), then recover VNAV when suitable.

Set the altimeter at the transition level: `cockpit_altimeter` action `std` selects standard pressure (read `altimeter.std-selected`), and at the transition altitude on descent `set-altimeter` with the QNH in inHg (read `weather.qnh-in-hg`; check `altimeter.setting` afterwards). The setting is made by clicking the knob, so it takes a moment.

**ILS final approach and autoland**

**Canberra ILS Z RWY 35** (chart `SCBII01`, 19 Mar 2026; still confirm against the current chart from `read_document`):

- ILS/DME **ICB, 109.5 MHz**; final course **348° magnetic**. The DME is paired with the ILS, so `nav-1-dme` is distance to ICB. The CB VOR/DME is 116.7 and is not the ILS.
- Required: DME or GNSS for the ILS, DME for LOC only.
- Fixes by ICB DME: DAMKO 4, MOMBI 9.1 (holding, max 170 kt at 5100 ft, 210 kt at 5600 ft), KATIA 11.1, MENZI 13.1. The 3° path is 3140 ft at 4 DME, 3460 at 5, 3810 at 6.1, 4760 at 9.1, 5050 at 10 and 5400 at 11.1.
- Minima: ILS CAT I 2170 ft (301 ft above the threshold) with RVR 750 m; LOC only 2700 ft. Aerodrome elevation 1887 ft, threshold 35 elevation 1869 ft.
- Missed approach: track 348°, climb to 5100 ft or as directed.
- Radios: ATIS 116.7 / 127.45, approach 124.5, tower 118.7 (no ATC is available here).
- Tune 109.5 into Nav 1 and Nav 2 with course 348. The localizer is only receivable on the approach side: expect an empty `nav-1-ident` near the CB VOR or off the final course, and do not conclude the frequency is wrong. If the ident stays empty on the extended centreline within range, re-read the chart; do not scan frequencies by guessing.

Tune and identify the ILS with `cockpit_radios_and_ils`: `set-nav-1-standby-frequency` (MHz), then `nav-1-swap`, and `set-nav-1-course` to the inbound course; do the same for Nav 2. Verify with `radios-and-ils.nav-1-frequency`, `nav-1-ident` (the identifier must match the chart), `nav-1-course`, and later `nav-1-localizer` and `nav-1-glideslope` (deviation in dots), `nav-1-dme` and `nav-1-glideslope-flag`. Arrange an intercept consistent with the chart, approaching the glideslope from below.

Select `app` when properly positioned. Verify LOC and G/S armed (`fma-roll-armed`, `fma-pitch-armed`), then verify their actual capture (`fma-roll` `VOR/LOC`, `fma-pitch` `G/S`). Configure gear, landing flaps, and the calculated approach speed in time for a stabilized final. From the moment LOC and G/S are captured, follow the `ils-final-hands-off` skill.

For autoland, engage the second autopilot (`cmd-b`) before 1,500 feet height AGL and verify both CMD lights and the flare readiness indications of the installed Zibo version. After glideslope capture and an established descent, set the published missed approach altitude on the MCP. Monitor the approach through touchdown; do not assume autoland is available merely because `app` is selected.

After touchdown follow the `landing` skill: verify the speedbrakes, use `reverse-thrust` and, if needed, `brakes`, then `ap-disconnect` once slow and straight. Then vacate the runway as in the `landing` skill (rudder control for steering, throttle and brakes for speed). Do not assume automatic taxiing.

**If using an RNAV approach instead**

Follow the aircraft's supported procedure: LNAV/VNAV final guidance normally shows **LNAV and VNAV PTH**; supported IAN guidance instead uses `app` with **FAC and G/P**. Identify which system this aircraft supports before attempting it. Set minima and manage the missed approach altitude according to that procedure. An RNAV vertical path does not establish autoland capability. Plan a manual landing unless the installed system explicitly supports otherwise.

**Failures and go-around**

If approach guidance fails, the approach becomes unstable, or required visual references are absent at applicable minima, execute the published go-around. Use `to-ga-left`, verify thrust and the FMA, and control the aircraft immediately if the autopilot disconnects. Follow the published missed approach lateral path, altitude, and configuration schedule.

Never continue descending simply because a command was accepted. Establish confirmed guidance or take control.

Relevant actions (`cockpit_mcp_and_autopilot` unless noted): `lnav`, `vnav`, `cmd-a`, `cmd-b`, `app`, `hdg-sel`, `lvl-chg`, `set-speed`, `set-heading`, `set-altitude`, and `to-ga-left` (`cockpit_engines_and_thrust`).

Issue each mode action once, observe its effect, and decide the next action from the resulting aircraft state.

**Route-specific notes (YSSY–YSCB)**

- **The leg is short.** From FL220 you need roughly a 3.5–4° path to be at ~5000 ft by ~10 DME; LVL CHG alone is too shallow. Start the descent early, manage drag (`speedbrake` value 2), and be at ~160 kt before the FAF. Do not let speed ride to 250+.
- **Verify the ILS course before trusting APP.** On a flown attempt `set-nav-1-course` / `set-nav-2-course` would not take (reading stayed 0) and `nav-1-dme` did not track distance. Read `nav-1-course` back and confirm it is 348; if it will not set, treat the localizer intercept as suspect and monitor `nav-1-localizer` dots closely. Use the FMC PROG `DTG`, not `nav-1-dme`, for distance. A zero/wrong course biased APP and contributed to a lateral excursion after touchdown.
- Check whether VNAV actually starts the descent here; a stale CDU (`NAV DATA OUT OF DATE`) held FL220 even with a lower MCP altitude. The generic behaviour is in `fly-the-airplane`.
