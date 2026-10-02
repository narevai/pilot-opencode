export const PROMPT = [
  "Fly the Boeing 737-800 from Sydney (YSSY) to Canberra (YSCB) in the simulator.",
  "The flight is already loaded and the simulator is ready.",
  "Start with the fly-the-airplane skill and follow the yssy-yscb skill; use the takeoff, landing and ils-final-hands-off skills where they apply.",
  "Report the flight phase with set_run_phase at every transition.",
  "Keep going until you have landed at Canberra and stopped, or you cannot continue safely; if something goes wrong, say what happened.",
].join(" ");

export const TITLE: string = "YSSY to YSCB";
