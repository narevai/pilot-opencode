---
name: ils-final-hands-off
description: Keep a Zibo 737 ILS/autoland stable after LOC and G/S capture. Use when flying an ILS, APP mode, dual autopilot autoland, short final, or recovering from an unexpected climb on approach.
---

# ILS final — hands off the modes

After **VOR/LOC** and **G/S** are captured, the autopilot is flying the approach. Most button presses on final make it worse.

Tools: autopilot buttons are the `cockpit_mcp_and_autopilot` tool (`action` values below); readings are `read_reading` / `read_group` on the `flightsim-pilot` server. OpenCode prefixes tool names with the server name.

Learned the hard way on YSCB ILSY 35: the airplane was descending on the glideslope with dual AP armed for autoland; unnecessary `cmd-a` / `cmd-b` presses dropped a channel, broke G/S, and the aircraft climbed toward the missed-approach MCP altitude.

## What went wrong

1. **On G/S, MCP was raised to missed approach (5100).** That step is correct *only while G/S remains captured*.
2. **CMD B dropped; CMD A/B were pressed again to “fix” dual channel.** Those presses are toggles. They dropped the other AP, upset pitch modes (split FMA codes), and extinguished APP guidance.
3. **With G/S gone and MCP above the airplane, autopilot climbed** toward the missed-approach window. That looked like a mystery climb; it was mode reversion to the MCP altitude.
4. Salvage attempts (more CMD presses, late VS) produced a high/slow unstable approach near the threshold.

## Hard rules on final

Once **VOR/LOC** is active and **G/S** is armed or active:

| Do | Do not |
|---|---|
| Configure gear / flaps / speedbrake / CONT per checklist | Press `cmd-a` or `cmd-b` again |
| Set landing speed once (`set-speed`); leave it | Toggle `app`, `vor-loc`, `lvl-chg`, `vnav`, or `hdg-sel` |
| Engage **`cmd-b` once** early (before 1500 ft height AGL), confirm both CMD lights, then stop | “Re-engage” dual AP mid-final |
| After **stable G/S capture and established descent**, set MCP missed approach (`set-altitude`) | Set missed MCP if G/S is not confirmed captured |
| Monitor only: IAS, VS, height AGL, altitude, FMA, both CMD lights, localizer and glideslope dots | Fix a broken G/S with V/S scrapes close-in |

## Dual AP (autoland)

1. Capture LOC/G/S on **CMD A** alone first.
2. When established and still above ~1500 ft height AGL, press **`cmd-b` once**.
3. Read `mcp-and-autopilot.cmd-a` and `mcp-and-autopilot.cmd-b`. Both must be on (also visible in `get_function_states`).
4. **Never press either CMD button again** unless the published go-around requires it.
5. If one CMD light goes out on final: **go around**. Do not toggle to restore dual channel below the glideslope.

## Unexpected climb on approach

If vertical speed goes positive after you were descending on G/S:

1. Read `mcp-and-autopilot.selected-altitude` and the FMA readings (`fma-pitch`, `fma-pitch-armed`, `fma-roll`) immediately.
2. If MCP is **above** you and G/S is no longer active, the AP is climbing to MCP — that is expected after G/S loss, not a trim mystery.
3. **Do not** try to force a late descent onto the path inside ~3–4 NM when high.
4. Fly the **published missed approach** (`to-ga-left`, flaps/gear schedule, MCP missed altitude), then set up a clean second ILS.

## Allowed final actions only

- Checklist config: `gear` value 2, flaps to schedule (`cockpit_brakes_flaps_and_gear` `flaps`), `cockpit_engine_start` `engine-1-start` and `engine-2-start` with value 2 (CONT), `speedbrake` value 1
- One speed set (`set-speed`) to target approach speed
- One MCP missed-approach set (`set-altitude`) **after** G/S is clearly captured and VS is a steady descent
- One `cmd-b` for dual channel, then hands off
- Go-around: `to-ga-left` (in `cockpit_engines_and_thrust`) when unstable or G/S lost

## Verify after every allowed action

Read back before touching anything else:

- `fma-pitch`, `fma-pitch-armed`, `fma-roll` (text modes, e.g. `G/S`, `VOR/LOC`)
- `cmd-a` and `cmd-b` (lights; also `get_function_states`)
- `flight-instruments.vertical-speed` (must stay negative on G/S)
- `flight-instruments.airspeed`
- `flight-instruments.height-agl` and `altitude`

Distance and deviation come from `radios-and-ils`: `nav-1-dme` (nm), `nav-1-localizer` and `nav-1-glideslope` (dots), `nav-1-glideslope-flag`, and `nav-1-ident` (must match the chart). Cross-check with `latitude` / `longitude` and `ground-speed`.

If pitch FMA and the lights disagree, or APP/G/S indications disappear while still supposed to be on the slope — **go around**, do not experiment.
