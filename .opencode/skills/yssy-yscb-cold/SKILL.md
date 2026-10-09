---
name: yssy-yscb-cold
description: Start the Zibo 737-800X from cold and dark on the Sydney runway, set up the empty FMC for YSSY to YSCB, start the engines, and then fly the route. Use when the scenario says cold and dark or the cockpit is dark and the FMC has no route.
---

# Sydney to Canberra, cold and dark

This is the start-up part of the Sydney to Canberra flight. The airplane is parked on the runway at YSSY with fuel loaded, the cockpit is cold and dark, the FMC has no route, and there is no ground power. Use the `fly-the-airplane` skill for how the tools work. When the engines are running and the airplane is ready, fly the rest with the `yssy-yscb` skill (takeoff, climb, cruise, descent, ILS, landing). Ignore its statement that the FMC is preloaded: here you set it up yourself.

## Rules for this start

- You cannot load fuel, ground power, or a route from outside. If a needed thing is missing (no fuel, a switch that never responds), say so and call `report_issue`.
- Do one thing at a time. After each action read the result (`verified`, `before`, `after`, `detail`) and the reading that proves it before moving on.
- Keep the flight phase at `preflight` until you begin the takeoff roll.
- The checklist for this run starts at the preliminary preflight. Read the section (`read_checklist`), do the item, confirm it with a reading, then `mark_checklist`. Never mark an item you did not verify.

## 1. Look before touching

`get_status`, then `read_group` for `electrical`, `apu-and-fuel`, `engines-and-thrust`, `brakes-flaps-and-gear`, `takeoff-data`, and `weather`. Confirm: parking brake set, fuel on board (`takeoff-data.fuel-total` above zero), engines off, and nothing powered. Do not continue if there is no fuel.

## 2. Power

1. `cockpit_electrical`: `battery` 1, `standby-power` 1 (auto). Read `electrical` for the battery bus and DC bus readings.
2. `cockpit_apu_and_fuel`: left forward and left aft fuel pumps on (`left-forward-fuel-pump`, `left-aft-fuel-pump`), then `apu` 1 and `apu-start`.
3. Wait for the APU to run up (about a minute). Read `apu-and-fuel` and the AC and DC bus readings; do not use the APU generators before the APU runs.
4. `cockpit_electrical`: `apu-generator-1` 1 and `apu-generator-2` 1. Confirm the AC transfer bus readings.

## 3. Systems before engine start

1. `cockpit_irs`: set both IRS mode selectors to align and then nav (read the IRS readings; alignment takes minutes, so start it early and keep working).
2. `cockpit_hydraulics_and_air`: APU bleed on, isolation valve auto, both packs auto, yaw damper on, hydraulic pumps on. Read the duct pressure and pack readings.
3. `cockpit_lights_and_signs` and `cockpit_lights_and_transponder`: set the lights and signs the checklist asks for (seat belt sign, emergency exit lights armed, navigation and anti-collision lights as required).
4. `cockpit_efis_captain` and `cockpit_efis_first_officer`: baro unit, minimums, map range as the checklist and the weather require. Set the altimeter with `cockpit_altimeter`.

## 4. Set up the FMC

The CDU is empty. Read it first (`read_group` on `fmc-cdu`), then use `cockpit_fmc_cdu`: page keys, line select keys, `exec`, and `cdu-type` for text (letters, digits, space, `.`, `-`, `/`).

1. Position: `init-ref`, then the position and performance pages as the CDU prompts.
2. Route: `rte` page. Origin YSSY, destination YSCB, flight number as you like. Departure from runway 16R with the SID GROOK1 and the WOL transition, then WOL and LEECE on H65, and the STAR LECE1W to runway 35 (the route is described in the `yssy-yscb` skill). Use `dep-arr` for the SID and STAR.
3. After every entry read the scratchpad and the page. Press `exec` only when the light is on and the legs are right. Open `legs` and check the line order against the route above.
4. Performance and takeoff data: the CDU needs weights, reserves, cruise altitude, and takeoff flaps and speeds. Take the values from the airplane (`takeoff-data`) and the manual (`list_documents`, `read_document`), not from memory. When done, `takeoff-data` must show non-zero V1, VR, V2 and trim.

If the CDU does not accept an entry, read what it says, correct it, and try again. If you cannot complete the setup, say exactly what is missing and stop.

## 5. Engine start

Follow the manual chapter for the engine start (`list_documents`, kind `manual`) and the checklist section. In short:

1. Engine start source and bleed ready, parking brake set, fuel levers in cutoff (`cockpit_engine_start`: `fuel-lever-1`, `fuel-lever-2`).
2. `engine-2-start` to GRD, watch N2 rise, then move `fuel-lever-2` to idle at the right N2 and let the start finish; then the same for engine 1.
3. After each engine: oil pressure, N1, N2 and EGT stable (read `engines-and-thrust`), start switch back to off or CONT as the checklist says, generators on (`cockpit_electrical` `generator-1` 1, `generator-2` 1) and APU generators off if the manual says so.

Do not hurry: if a reading does not move, wait a few seconds and read again before repeating an action.

## 6. Before takeoff

Run the before-taxi and before-takeoff items from the checklist: flaps (`cockpit_brakes_flaps_and_gear` `flaps`), trim for takeoff, autobrake RTO (`autobrake` 0), speedbrake armed (`speedbrake` 1), transponder TA/RA (`cockpit_lights_and_transponder` `transponder-mode` 5), lights, and the MCP settings from the `yssy-yscb` skill. Release the parking brake only when the airplane is ready to roll. Then continue with the takeoff and the rest of the flight in `yssy-yscb`.
