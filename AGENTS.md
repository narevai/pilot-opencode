# pilot-opencode

This repo holds OpenCode skills and MCP configuration for flying the flight simulator. The only application code is the small HTTP pilot service in `src/` (`pnpm start`); the generic runner is `src/pilot.ts` and each agent is one file in `src/harnesses/`.

- MCP servers are configured in `opencode.json`: `flightsim-pilot` (cockpit, MCP v2). OpenCode names its tools `<server>_<tool>`. There is no governor server: do not try to start, end, or restart the simulation or load flights; ask the user.
- Pilot tools: readings by id (`read_group`, `read_reading`) and one `cockpit_*` tool per cockpit group with an `action` enum. They report acceptance only: always read the result. Use the raw `read_dataref` / `write_dataref` / `run_command` only when no reading or action exists.
- Skills are in `.opencode/skills/`. Use `fly-the-airplane` first for any flying task; it points to the other skills.
- Work as a closed loop: after every control change, read the instruments that show whether it worked. Never write altitude, position, or engagement datarefs to imitate flying.
- You cannot restart or reload the simulation. After a flying mistake, report it to the user.
- Format and lint with `pnpm fmt` and `pnpm lint`.
