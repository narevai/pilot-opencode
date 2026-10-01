---
name: fly-the-airplane
description: Fly the simulator aircraft through the flightsim-pilot (v2) OpenCode MCP server. Use when starting, taxiing, taking off, flying, approaching, or landing.
---

# Fly the airplane

Work a closed loop. Do not skip the read after a control change.

Call the MCP server configured in `opencode.json`. `flightsim-pilot` is the cockpit (MCP v2). OpenCode names its tools `<server>_<tool>`, for example `flightsim-pilot_read_group`; this skill uses the bare tool names. Read each tool schema before calling it.

## How the pilot server is organised

- **Readings** are named values: `list_readings`, `read_reading`, `read_group`. Ids look like `flight-instruments.airspeed` or `mcp-and-autopilot.cmd-a`. Groups: `v-speeds`, `takeoff-data`, `fmc-cdu`, `flight-instruments`, `altimeter`, `weather`, `radios-and-ils`, `engines-and-thrust`, `brakes-flaps-and-gear`, `flight-controls`, `mcp-and-autopilot`, `lights-and-transponder`.
- **Cockpit actions** are one tool per group: `cockpit_engines_and_thrust`, `cockpit_brakes_flaps_and_gear`, `cockpit_flight_controls`, `cockpit_mcp_and_autopilot`, `cockpit_lights_and_transponder`. Each takes `action` (an enum listed in the tool description with its kind, unit and range) and `value` for setpoints only.
- **States**: `get_function_states` returns on/off for every action that has an indicator (lights, switches, flap detents, MCP modes).
- **Toggles flip.** A `toggle` action (landing-lights, beacon, taxi-light, gear-down, joystick-override, pause) reads its own state and flips it. Cockpit buttons such as `flight-director-toggle`, `a-t-arm-toggle`, `parking-brake-toggle`, `cmd-a`, and `cmd-b` flip every time you press them: read the state first with `get_function_states`, press once, read again.
- **Acceptance is not success.** `cockpit_*` returns `ok` when the command was accepted. It does not verify the airplane. There is no operation history: the read after the action is the only proof.
- Raw access (`read_dataref`, `write_dataref`, `run_command`, `search_datarefs`) is only for values with no reading and no action. Look in `list_readings` first. Never write altitude, position, or engagement datarefs to imitate flying.
- **CDU/FMC:** you can read the display (`read_group` on `fmc-cdu`: `line-0-large` ... `line-6-large`, `small`, `label`, `scratchpad`, `execute-light`) and move between pages with `cockpit_fmc_cdu` (`legs`, `rte`, `init-ref`, `n1-lim`, `dep-arr`, `prev-page`, `next-page`, line select keys `lsk-1l` ... `lsk-6r`, `exec`, `clr`, `del`). There are no letter or digit keys: you can inspect the FMC but not type into it. The scenario loads a saved flight whose FMC is already set up.
- **Weather and altimeter:** `weather` has temperature, dew point, wind, visibility, QNH (hPa and inHg), cloud base and precipitation at the aircraft. `altimeter` has the current setting and STD; set it with `cockpit_altimeter` `set-altimeter`. Clearance (ATC) is not available from any tool: ask the user.
- **Radios and ILS:** `radios-and-ils` has Nav and Com frequencies, courses, the Nav identifiers, localizer and glideslope deviation, and DME. Tune with `cockpit_radios_and_ils` (`set-nav-1-standby-frequency`, `nav-1-swap`, `set-nav-1-course`).
- **Takeoff data:** `read_group` on `takeoff-data` gives gross weight, fuel, takeoff trim (set and calculated) and V1/VR/V2 (set and calculated).

## 1. Establish the world

1. `get_status` (connection state and aircraft), then `list_groups` / `read_group`. For the manual, `list_documents` with category `aircraft` and kind `manual`, then `read_document` or `list_document_chapters` / `read_document_chapter`.
3. `list_checklist_categories`, `activate_checklist`, and `read_checklist` for the relevant section. If `read_checklist` returns `user_id: null`, the pilot server knows no active run: you can read definitions but cannot record progress.

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
