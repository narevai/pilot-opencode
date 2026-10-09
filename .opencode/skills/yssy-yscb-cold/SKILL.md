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

The CDU is empty. Read it first (`read_group` on `fmc-cdu`), then use `cockpit_fmc_cdu`: page keys, line select keys, `exec`, and `cdu-type` for text (letters, digits, space, `.`, `-`, `/`). This sequence was checked on the airplane.

- `CLR` deletes **one character** and an error message (`INVALID ENTRY`, `NOT IN DATA BASE`) hides the text you typed but does not remove it. Press `clr` until `scratchpad` is empty before you type again.
- Check the CDU after every entry. `exec` only when the light is on.
- Line select keys: the key next to a row is `lsk-<row><l|r>` (row 1 at the top, 6 at the bottom, `l` left, `r` right). On list pages (SIDs, STARs, approaches, transitions) read the page first and press the key on the row of the name you want. Use `next-page` and `prev-page` when the name is not on the page.
- `<INDEX` (`lsk-6l`) on a DEP/ARR page leads to the INIT/REF INDEX, not to the DEP/ARR index; press `dep-arr` to get back to the DEP/ARR index.

1. **Open the FMC.** On MENU press `lsk-1l` (<FMC), then `lsk-6r` (POS INIT).
2. **Reference airport.** Type `YSSY`, press `lsk-2l`.
3. **IRS.** In `cockpit_irs` set `irs-left-mode` and `irs-right-mode` to nav. Back on POS INIT type your present position in the format hemisphere, degrees, minutes with one decimal, for example `S3355.8E15110.3`, and press `lsk-4r` (SET IRS POS). Take the position from the airplane readings; alignment takes minutes.
4. **Route.** Press `lsk-6r` (ROUTE). Type `YSSY`, `lsk-1l` (ORIGIN), type `YSCB`, `lsk-1r` (DEST), type `16R` (not `RW16R`), `lsk-3l` (RUNWAY).
5. **Departure.** `dep-arr`, `lsk-1l` (DEP YSSY). The page lists SIDs on the left (ABBEY3, ANKUB1, AVMOV1, FISHA1, GROOK2, …) and runways on the right (16R is already selected). Press the key on the **GROOK2** row (the database has GROOK2, not GROOK1; it was `lsk-5l`). The page then shows its transitions (KADOM, STUIE, WOL): press the key on the **WOL** row (`lsk-4l`). The selected entries are marked `<SEL>`.
6. **Arrival.** `dep-arr`, `lsk-2r` (ARR YSCB). The page lists STARs on the left and approaches on the right over several pages (`next-page`). On the page that has `ILSY 35` and `ILSZ 35`, press the right key on the **ILSZ 35** row (it was `lsk-2r`); it then offers the transitions D049M and MENZI, which you can leave unselected. On the page with the STARs press the left key on the **LECE1W** row (it was `lsk-3l`). Both must show `<SEL>`. No `exec` is needed until the route is activated.
7. **Activate.** `rte`, `lsk-6r` (ACTIVATE), `exec`.
8. **Close the discontinuity.** On `legs` the legs run to WOL, then `ROUTE DISCONTINUITY`, then LECE. Press the line select key next to LECE (it is copied to the scratchpad), then the key next to the `*****` line above it, and `exec`. The legs must then read: ... WOL, LECE, AKLIM, EKASA, SLICK, FOXLO, MOMBI, DAMKO, RW35.
9. **Performance.** Open `init-ref`, then `lsk-6l` (INDEX), then `lsk-3l` (PERF). **The FMC works in thousands of pounds, not kilograms** (the fuel on the page, `11.4`, is 5171 kg). Convert from the airplane readings: ZFW = (`takeoff-data.gross-weight` − `takeoff-data.fuel-total`) × 2.2046 / 1000, for example 57 159 kg → `126.0`. Enter ZFW (`lsk-3l`); the gross weight on the page must then match the reading × 2.2046 / 1000 (137.4). Also reserves (`2.0`, `lsk-4l`), cost index (`30`, `lsk-5l`) and cruise altitude (`FL220`, `lsk-1r`), then `exec` if the light is on. Entering kilograms gives INVALID ENTRY.
10. **Takeoff data.** `init-ref`, `lsk-6l` (INDEX), `lsk-4l` (TAKEOFF). Type the takeoff flaps (`5`, `lsk-1l`) and the CG in % MAC (`lsk-3l`, for example `23.3`; take it from the load sheet, or from `takeoff-data.actual-cg` if you have none). The page then shows suggested V1, VR and V2 and the calculated trim: press `lsk-1r`, `lsk-2r` and `lsk-3r` to accept them. Check `takeoff-data`: `fmc-cg` must agree with `actual-cg`, `v1-set`, `vr-set` and `v2-set` must be non-zero and match the page, and `trim-calculated` is the stabilizer trim to set for takeoff (about 4.8 at this weight). Set the flap lever to the takeoff flaps (`flaps` 5) and the trim with `set-stabilizer-trim` (the value of `trim-calculated`); `flaps-match-fmc` and `trim-matches-fmc` then become true. They are checks, not entries: before you set them they read false.

If the CDU does not accept an entry, read what it says, correct it, and try again. If you cannot complete the setup, say exactly what is missing and stop.

## 5. Engine start

Measured on this airplane, in this order. Read the engine readings after each step (`read_group` on `engines-and-thrust`).

1. APU running and its generators on, `bleed-air-apu` on (`cockpit_hydraulics_and_air`), isolation valve auto, parking brake set, fuel levers in cutoff.
2. **Turn both packs off** (`left-pack` 0, `right-pack` 0) before the start. With the packs on, the duct pressure stayed near 20 psi and N2 stalled at about 17 percent; with them off it rose above 25 psi and the start went through.
3. `engine-1-start` to GRD (`cockpit_engine_start`, value 0). Watch `n2-left` rise (about 25 percent takes 10 to 40 seconds, depending on the duct pressure). At 25 percent N2 or more move `fuel-lever-1` to idle (value 1). EGT peaks near 900 °C and then falls; N2 settles near 60 percent and N1 near 19 percent. Then return `engine-1-start` to off (value 1).
4. Repeat for engine 2 (`engine-2-start`, `fuel-lever-2`).
5. After both engines run: `generator-1` 1 and `generator-2` 1, then `apu-generator-1` 0 and `apu-generator-2` 0, `bleed-air-apu` 0, packs back to auto (value 1). Read the bus readings.

Do not hurry: if a reading does not move, wait a few seconds and read again before repeating an action. If N2 stops rising below 25 percent, read the duct pressure first.

## 5a. Master Caution and the six pack

A lit Master Caution on a cold cockpit is normal: it lights while systems power up and are not yet configured (fuel pumps, packs, hydraulics, APU). Clear it in this order.

1. After the power, air and engine steps read the six pack with `read_group` on `fire-and-emergency` (`six-pack-fuel`, `six-pack-flight-controls`, `six-pack-electrical`, `six-pack-air-conditioning`, `six-pack-ice` and the others, plus `master-caution`).
2. Fix the cause of each lit lamp (for example pumps off for fuel, packs off for air conditioning). A six pack lamp goes out only when its condition is gone.
3. Press `master-caution-captain` once (`cockpit_fire_and_emergency`) and read `master-caution` again. If it comes back, a condition is still present: read the six pack again.
4. The six pack buttons (`six-pack-captain`, `six-pack-first-officer`) only reset the alarm state; they do not hide a condition that persists.
5. Before taxi no six pack lamp may be lit without an explanation. If one stays lit and you cannot explain it, call `report_issue` with the lamp and what you tried.

## 6. Before takeoff

Run the before-taxi and before-takeoff items from the checklist: flaps (`cockpit_brakes_flaps_and_gear` `flaps`), trim for takeoff, autobrake RTO (`autobrake` 0), speedbrake armed (`speedbrake` 1), transponder TA/RA (`cockpit_lights_and_transponder` `transponder-mode` 5), lights, and the MCP settings from the `yssy-yscb` skill. Set the flap lever to the takeoff flaps and the stabilizer trim to `trim-calculated` before the roll (`flaps-match-fmc` and `trim-matches-fmc` must be true). Arm the autothrottle once (`a-t-arm-toggle`) and read `autothrottle-armed`; pressing it again switches it off. On the ground `lnav` and `vnav` do not arm: select them after takeoff. Release the parking brake only when the airplane is ready to roll. Then continue with the takeoff and the rest of the flight in `yssy-yscb`.
