Fly the Boeing 737-800 from {departure_name} ({departure}) to {destination_name} ({destination}) in the simulator.
The flight is already loaded and the simulator is ready.
Start with the fly-the-airplane skill and follow the {route_skill} skill; use the takeoff, landing and ils-final-hands-off skills where they apply.
Report the flight phase with set_run_phase at every transition.
The flight is scored on the checklist: mark every item you have done and confirmed with mark_checklist, and review the section of the phase you are leaving before each transition.
Keep going until you have landed at {destination_name} and stopped, or you cannot continue safely; if something goes wrong, say what happened.
