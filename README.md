# pilot-opencode

OpenCode skills for flying the simulator through one MCP server: **flightsim-pilot** (cockpit).

Port of `pilot-cursor` to OpenCode, with the cockpit side moved to the pilot MCP server of irl-gym (`/mcp`). There is no governor server: starting, restarting, or changing the simulation is up to the user.

## Skills

Skills live in `.opencode/skills/<name>/SKILL.md` and OpenCode loads them on demand.

| Skill | Use |
| --- | --- |
| `fly-the-airplane` | Closed-loop control through the MCP servers |
| `takeoff-straight-ahead` | 737-800 runway roll and straight climb |
| `ils-final-hands-off` | Keep an ILS/autoland stable after LOC and G/S capture |
| `landing` | Dual-autopilot ILS autoland: setup, checks, flare and rollout, go-around |
| `yssy-yscb` | Zibo 737-800X from Sydney YSSY to Canberra YSCB |

## MCP servers

Configured in `opencode.json`. OpenCode names its tools `<server>_<tool>` (for example `flightsim-pilot_read_group`); the skills use the bare tool names.

| Server | Role | Default URL |
| --- | --- | --- |
| `flightsim-pilot` | Cockpit readings and actions (one `cockpit_*` tool per group), documents, checklists | `http://irl-gym-kamil-local.broadbill-pickerel.ts.net:8000/mcp` |

Check the connection with `opencode mcp list`.

The pilot server is irl-gym's MCP (`make dev` in the irl-gym devcontainer, which also runs `tailscale serve` on port 8000). It does not expose the CDU/FMC, the radios or wheel brakes. Checklist progress is stored in the pilot server's own database.

The same server name in `~/.config/opencode/opencode.json` is overridden by this project's `opencode.json`.

## Dev Container

Open the repo in a Dev Container (**Reopen in Container**). The image is Node.js 24 with pnpm, oxlint and oxfmt, and `opencode-ai` is installed after creation. Run `opencode` in the repo root.

The sim MCP host lives on Tailscale (`irl-gym-kamil-local.broadbill-pickerel.ts.net`). The container maps that hostname to the current Tailscale IP. If MCP calls start failing, update `extraHosts` in `.devcontainer/devcontainer.json`.
