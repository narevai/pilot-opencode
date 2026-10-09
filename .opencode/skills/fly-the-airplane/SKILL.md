---
name: fly-the-airplane
description: Fly the simulator aircraft through the flightsim-pilot (v2) OpenCode MCP server. Use when starting, taxiing, taking off, flying, approaching, or landing.
---

# Fly the airplane

Work a closed loop. Do not skip the read after a control change.

Call the MCP server configured in `opencode.json`. `flightsim-pilot` is the cockpit (MCP v2). OpenCode names its tools `<server>_<tool>`, for example `flightsim-pilot_read_group`; this skill uses the bare tool names. Read each tool schema before calling it.

## How the pilot server is organised

- **Readings** are named values: `list_readings`, `read_reading`, `read_group`. Ids look like `flight-instruments.airspeed` or `mcp-and-autopilot.cmd-a`. Groups: `v-speeds`, `takeoff-data`, `fmc-cdu`, `flight-instruments`, `altimeter`, `weather`, `radios-and-ils`, `runway-and-approach`, `engines-and-thrust`, `brakes-flaps-and-gear`, `flight-controls`, `mcp-and-autopilot`, `lights-and-transponder`, `electrical`, `apu-and-fuel`, `hydraulics-and-air`, `anti-ice-and-wipers`, `engine-start`, `lights-and-signs`, `efis-captain`, `efis-first-officer`, `irs`, `display-panels`, `radio-panel-and-audio`, `tests-and-service`, `fire-and-emergency`.
- **Cockpit actions** are one tool per group (`cockpit_<group>`, with dashes turned into underscores, for example `cockpit_engine_start`, `cockpit_electrical`, `cockpit_efis_captain`). Each takes `action` (an enum listed in the tool description with its kind, unit and range or positions) and, depending on the kind, `value` or `text`:
  - `press`: no value. `toggle`: flips the switch.
  - `setpoint` and knobs: `value` in the listed unit. The server turns the knob until it matches, so one call is enough.
  - `select`: `value` is a position listed in the tool description (for example `flaps` 5, `gear` 2 = down, `transponder-mode` 5 = TA/RA, `autobrake` 3 = setting 2). One call moves the switch to that position and reports whether it got there.
  - `text` (`cdu-type` in `cockpit_fmc_cdu`): `text` is the characters to type, in one call.
- **States**: `get_function_states` returns on/off for every action that has an indicator (lights, switches, flap detents, MCP modes).
- **Toggles flip.** A `toggle` action (landing-lights, beacon, taxi-light, joystick-override) reads its own state and flips it. Cockpit buttons such as `flight-director-toggle`, `a-t-arm-toggle`, `parking-brake-toggle`, `cmd-a`, and `cmd-b` flip every time you press them: read the state first with `get_function_states`, press once, read again.
- **Read the result.** A `cockpit_*` call returns `ok`, `verified`, `before`, `after` and `detail`. `verified: true` means the server observed the change (`detail` says what moved, for example `off → on`). `verified: false` with `no change` or `no state feedback` means the command was sent but the change was not seen: read the related reading before assuming it worked.
- **Spring-loaded switches** return to centre when released, so they cannot hold a position (the fuel flow switch `used`, the air valve manual `open`, the test switches in `tests-and-service`). Pressing them is a momentary action; check the effect, not the switch.
- **Some switches need a moment.** The server holds the command for you; a slow switch (APU, GPU, generators) can take a couple of seconds to report.
- Raw access (`read_dataref`, `write_dataref`, `run_command`, `search_datarefs`) is a last resort and may be switched off, in which case those tools are not listed. Almost every value you need has a reading: call `list_groups`, `list_readings` and `read_group` before you search for a dataref. Never write altitude, position, or engagement datarefs to imitate flying.
- **You do not control the simulation.** There is no pause, resume or speed tool. If the readings stay frozen (for example the airspeed, altitude and `flight-instruments` values never change between reads), say so and stop instead of looking for a workaround.
- **Stick and pedal input:** `flight-controls` has `pitch-input` and `rudder-input`, the real position of the controls (-1 to 1). `pitch-control` and `rudder-control` are the override setpoints you command; read `*-input` after commanding a setpoint to see what the airplane actually receives.
- **Extra readings:** `flight-instruments.elevation-msl` (feet above sea level), `brakes-flaps-and-gear.gear-handle-down`, `mcp-and-autopilot.autopilot-engaged`, and `takeoff-data.takeoff-flaps` (the takeoff flaps entered in the FMC).
- **Runway and approach:** `read_group` on `runway-and-approach` gives the FMC reference airport and runway (`reference-airport`, `reference-runway-course`, `reference-runway-length` in metres, start and end latitude and longitude), `ils-pointers-shown`, and the HGS flags `on-runway-hgs` and `near-runway-hgs`. For ILS deviation use `radios-and-ils` (`nav-1-localizer`, `nav-1-glideslope`, `nav-1-dme`).
- **CDU/FMC:** you can read the display (`read_group` on `fmc-cdu`: `line-0-large` ... `line-6-large`, `small`, `label`, `scratchpad`, `execute-light`) and move between pages with `cockpit_fmc_cdu` (`legs`, `rte`, `init-ref`, `n1-lim`, `dep-arr`, `prev-page`, `next-page`, line select keys `lsk-1l` ... `lsk-6r`, `exec`, `clr`, `del`). To enter data, type it with `cdu-type` (letters, digits, space, `.`, `-`, `/`), then press the line select key next to the field and `exec`. Read the scratchpad and the page after each step. The scenario loads a saved flight whose FMC is usually already set up.
- **Weather and altimeter:** `weather` has temperature, dew point, wind, visibility, QNH (hPa and inHg), cloud base and precipitation at the aircraft. `altimeter` has the current setting and STD; set it with `cockpit_altimeter` `set-altimeter`. Clearance (ATC) is not available from any tool: ask the user.
- **Radios and ILS:** `radios-and-ils` has Nav and Com frequencies, courses, the Nav identifiers, localizer and glideslope deviation, and DME. Tune with `cockpit_radios_and_ils` (`set-nav-1-standby-frequency`, `nav-1-swap`, `set-nav-1-course`).
- **Takeoff data:** `read_group` on `takeoff-data` gives gross weight, fuel, the FMC CG and the actual CG, takeoff trim (set and calculated) and V1/VR/V2 (set and calculated).

## 1. Establish the world

1. `get_status` (connection state and aircraft), then `list_groups` / `read_group`. For the manual, `list_documents` with category `aircraft` and kind `manual`, then `read_document` or `list_document_chapters` / `read_document_chapter`.
3. `list_checklist_categories`, `activate_checklist`, and `read_checklist` for the relevant section. If `read_checklist` returns `user_id: null`, the pilot server knows no active run: you can read definitions but cannot record progress.

## Cold and dark, in order

Use the groups in this order when the cockpit is cold and dark. After each step read the result and the related reading before moving on.

1. `electrical`: `battery` 1, `standby-power` 1 (auto). Nothing else on the electrical panel responds without the battery.
2. `apu-and-fuel`: fuel pumps on for the tanks with fuel, then `apu` 1 and `apu-start`. The APU takes about a minute; wait for it before using the APU generators. If there is no fuel, the APU will not start: report it, you cannot load fuel.
3. `electrical`: `apu-generator-1` 1 and `apu-generator-2` 1 (or ground power if it is connected). Read the bus readings.
4. `hydraulics-and-air`: bleed, packs, isolation valve, yaw damper.
5. `irs` and `efis-captain` / `efis-first-officer` as the checklist requires.
6. `engine-start`: start source, fuel levers and `engine-1-start` / `engine-2-start`.

Guarded and irreversible functions are in `fire-and-emergency`. Do not use them unless a checklist for that failure calls for them.

## 2. Before touching the airplane

1. Read the `cockpit_*` tool description for the group you are about to use (it lists the actions and ranges) and `get_function_states` for its current state.
2. Read the readings that will tell you whether the action worked (`read_group` or `read_reading`).
3. If a checklist item is open, `mark_checklist` only after the airplane state matches.

## 3. Fly

1. One action at a time with the `cockpit_*` tool.
2. Recheck the primary flight instruments and the group you changed.
3. If the airplane does not match what you expected, re-read the group and `get_function_states`. There is no action history to consult.
4. Keep scan: attitude, airspeed, altitude, heading, engine, then navigation.

## 4. If you are lost

- Charts and airport procedures are `flightsim-pilot` documents. `list_documents` with kind `chart` or `sop` and the airport ICAO, then `read_document`.
- Position is `flight-instruments.latitude` / `longitude`; ground speed is `flight-instruments.ground-speed`.
- There is no tool to start, restart, or reload the simulation. If the session is wedged or the flight is lost, tell the user.

## Known simulator quirks (learned in flight)

- **`pitch-control` is a held, sensitive setpoint.** On the Zibo 737 one large value (0.6) over-rotated to ~35° within seconds and bled the speed to ~98 kt; the naive correction (-0.25) then drove a -16° dive into the ground. Use small steps (~0.2), read `flight-instruments.pitch` immediately, and hand over to `cmd-a` once above ~400 ft AGL (with LNAV/VNAV armed). A fresh run can retain the previous attempt's control/FMA state, so read and zero `flight-controls.pitch-control` in preflight.
- **VNAV may not start the descent.** With `NAV DATA OUT OF DATE` on the CDU, VNAV PTH can hold cruise even after a lower MCP altitude. Watch the PROG `TO T/D`; if the aircraft does not descend, take `lvl-chg` (annunciates `MCP SPD`) or `v-s` deliberately and manage drag with `speedbrake` value 2.
- **A radio course may not set.** `set-nav-1-course` / `set-nav-2-course` can be accepted while the reading stays 0; verify the read-back and do not assume APP will track the published course. `nav-1-dme` did not track distance here — prefer the FMC PROG `DTG` and `latitude`/`longitude` for position.
- **Autoland may not flare.** Even with both CMD lights on, `fma-pitch-armed`/`fma-roll-armed` can stay empty and `fma-pitch` remain `G/S` through 50 ft. If FLARE is not armed by ~350 ft AGL, expect a firm touchdown or go around.
- **Rollout:** the autopilot disconnects on touchdown (both CMD lights off). Take the rudder immediately. The first `reverse-thrust` may not engage (N1 stayed ~60% and the speed rose); if so set `throttle` 0 and use `brakes`, and reverse only when `reverser-*` actually spools. Without pedal input the aircraft drifts off a narrow runway centreline.
- **Transient errors:** `get_function_states` and some `read_group` calls intermittently answer `Simulator is unavailable`; retry the same call.
- **PDF charts may be unreadable** (`read_document` on a chart returns a PDF resource some models cannot read): fall back to the numbers in the relevant skill and confirm with the user.

## Checklist

When the run has a scenario checklist (`read_checklist` returns it), mark each item with `mark_checklist` after you have verified it; see `yssy-yscb` for the details. Do not mark items you did not do.

## Related skills

`takeoff-straight-ahead` for the runway roll, `yssy-yscb` for the Sydney to Canberra route, `landing` for the ILS autoland setup and sequence, and `ils-final-hands-off` for what not to press once LOC and G/S are captured.
