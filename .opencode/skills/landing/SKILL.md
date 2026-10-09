---
name: landing
description: Land the Zibo 737-800X with a proper dual-autopilot ILS autoland. Use when setting up before intercepting the ILS, capturing LOC and G/S, engaging the second autopilot, checking that autoland is really armed, flying flare and rollout, or deciding between autoland, a single-autopilot ILS and a go-around.
---

# Landing — ILS autoland

Tools: autopilot buttons are `cockpit_mcp_and_autopilot`, radios are `cockpit_radios_and_ils`, gear/flaps/autobrake/speedbrake are `cockpit_brakes_flaps_and_gear`, go-around is `to-ga-left` in `cockpit_engines_and_thrust`. Readings come from `read_reading` / `read_group`. OpenCode prefixes tool names with the server name. What not to press once on final is in `ils-final-hands-off`; this skill is the setup and the sequence. Set the flight phase with `set_run_phase`: `approach` when you start the ILS, `landing` on final, `arrived` once stopped.

## Autoland is not an ILS with one autopilot

A coupled ILS with a single autopilot (CMD A only) tracks LOC and G/S down to minima but does not flare or roll out. You land it manually, so tell the user that the landing needs manual input. Do not call it an autoland. A proper autoland needs both autopilots engaged and the autoland armed (checks below).

## Before intercepting the ILS

Set up and read back each item:

1. **Nav 1 and Nav 2** on the same ILS frequency: `set-nav-1-standby-frequency` / `set-nav-2-standby-frequency`, then `nav-1-swap` / `nav-2-swap`. Frequency, identifier and course come from the chart (`list_documents` / `read_document`), never from memory. Verify `radios-and-ils.nav-1-ident` and `nav-2-ident` match the chart.
2. **Course 1 and Course 2** on the published inbound ILS course: `set-nav-1-course` and `set-nav-2-course`; read `nav-1-course` and `nav-2-course`.
3. **MCP altitude**: normally the missed-approach altitude once established on the glideslope, according to the procedure you fly (`set-altitude`). Do not set it above you earlier than the procedure allows, and see `ils-final-hands-off` for when it is safe.
4. **A/T ARM** on and **flight directors** on. `a-t-arm-toggle` and `flight-director-toggle` flip each press: read `get_function_states` first.
5. **Configured and slowing** for the approach: flaps to schedule, then landing speed set once (`set-speed`).

You may still be flying LNAV/VNAV, HDG SEL or LVL CHG. The ILS takes over when you arm and capture APP.

## Intercept and capture

1. Get onto an intercept heading, preferably 30° or less from the localizer course.
2. Press **`app`** once. Read the FMA: `fma-roll-armed` `VOR/LOC` and `fma-pitch-armed` `G/S`. Do not press CMD B yet.
3. **Localizer captures**: `fma-roll` becomes `VOR/LOC` and the airplane turns onto the centreline; G/S stays armed.
4. **Glideslope captures**, normally from below: `fma-pitch` becomes `G/S` and the descent begins. You now have a coupled ILS, but not yet an autoland.

Do not intercept the glideslope from above and do not press APP repeatedly; if the capture does not happen, go around rather than experiment.

## Second autopilot

With CMD A flying the coupled approach, press **`cmd-b` once** (if B is flying, engage A instead). Both must be engaged **before 800 ft radio altitude**; below that the second autopilot is locked out. In practice do it right after G/S capture and well above 1,500 ft. Read `cmd-a` and `cmd-b` (both on). Never press either again (see `ils-final-hands-off`).

## Checks at about 1,500 ft radio altitude

Read `flight-instruments.height-agl` and the group `mcp-and-autopilot`. This is the autoland verification point; the second autopilot's pitch channel becomes active and the dual-channel checks run:

- `fma-roll` `VOR/LOC` and `fma-pitch` `G/S` (captured).
- `fma-pitch-armed` **`FLARE`** and `fma-roll-armed` **`ROLLOUT`**.
- `cmd-a` and `cmd-b` both on.

On the real PFD **SINGLE CH** disappears and **LAND 3** (or FLARE armed) appears. The MCP server has **no reading for that annunciation**, so you cannot see it: rely on the FMA readings and the CMD lights. Do not continue expecting an autoland if FLARE is not armed or one CMD is off. **FLARE must be armed by 350 ft radio altitude**; if it is not, treat it as an autoland failure and go around.

## 1,000 to 500 ft

Do not touch the MCP modes: no `lnav`, `vnav`, `hdg-sel`, `v-s`, `lvl-chg`. Leave the autopilot in `VOR/LOC` + `G/S`. Finish configuring normally:

- Gear down (`gear` with value 2) and landing flaps (`flaps` with value 30 or 40).
- Speed at VREF plus the appropriate correction (one `set-speed`).
- `speedbrake` with value 1 (arm).
- Autobrake selected (`autobrake` with value 2, 3 or 4 for settings 1, 2 or 3); read `autobrake-position`.
- Autothrottle still engaged (`fma-autothrottle`).

## Flare and thrust retard (hands off)

Do nothing with the controls. You must **not** try to flare or pull the throttles yourself.

1. About **50 ft**: the AFDS flares automatically. `fma-pitch` changes from `G/S` to `FLARE` and the flight director bars retract. Do not disconnect the autopilot.
2. About **27 ft**: the autothrottle retards the thrust levers toward idle during the flare.
3. **Touchdown.** The autopilot stays engaged for the immediate landing and `fma-roll` `ROLLOUT` tracks the centreline.

Monitor only: `airspeed`, `vertical-speed` (negative), `height-agl`, FMA, `nav-1-localizer` and `nav-1-glideslope` dots. If FLARE and ROLLOUT do not appear when they should, treat it as a failed autoland.

## After touchdown

Autoland keeps the airplane on the centreline but is not a taxi system. You own the stopping sequence:

1. **Speedbrakes**: verify they deployed (`brakes-flaps-and-gear.speedbrake-lever` close to fully up; the armed lever deploys on touchdown).
2. **Reverse thrust**: `cockpit_engines_and_thrust` action `reverse-thrust` holds maximum reverse for 5 seconds, then releases to idle. Repeat while `flight-instruments.ground-speed` is above about 60 kt and watch `engines-and-thrust.reverser-left` and `reverser-right`; stop reversing at about 60 kt. Do not call it in the air.
3. **Autobrake** slows the airplane (`autobrake-position` shows the setting). Do not use `brakes` straight away, because manual braking can disarm it. Use `brakes` (3 s regular) or `brakes-max` in `cockpit_brakes_flaps_and_gear` only if the airplane is not decelerating enough.
4. **Disconnect the autopilot** with `ap-disconnect` in `cockpit_mcp_and_autopilot` once the airplane is slow and straight on the centreline. Do not use it on approach; to give up an approach use `to-ga-left`.
5. Read `ground-speed`, `fma-roll` and the CMD lights between steps.

## Vacate the runway

Steer on the ground with the rudder control: turn `flight-controls.joystick-override` on first (toggle: read the state), then `set-rudder-control` / `rudder-control` with a small ratio (the sign moves the nose left or right: check `heading` after the first input and correct), and return it to 0 to go straight. Control speed with `throttle` and `brakes` (`ground-speed` should be slow, about 10 to 20 kt, before any turn). Follow the chart for the exit, keep to the centreline until you turn, and stop with the parking brake (`parking-brake-toggle`, read the state first) clear of the runway. Then report where you are and set the phase to `arrived`.

## Go around

Go around with `to-ga-left` and follow the published missed approach if any of these happens:

- a CMD drops, LOC or G/S is lost, or the FMA disagrees with the lights;
- FLARE is not armed by 350 ft radio altitude (or ROLLOUT is not armed) and you cannot land manually with confidence;
- the approach is unstable, or the required visual references are absent at minima for the approach you are flying.
