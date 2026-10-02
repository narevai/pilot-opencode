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

## Start request

`POST /start` takes a JSON body; `harness` is required and `run_id` is only logged:

```json
{"harness": "opencode", "run_id": "…"}
```

The prompt and title are hardcoded in `src/prompt.ts`; the request does not carry them. One pilot runs at a time: a second `POST /start` while one is flying answers 409. `GET /status` reports the running `harness`. The same contract (`POST /start`, `GET /status`, `POST /stop`, `GET /health`) is what irl-gym expects.

## Output stream

`GET /stream` is a Server-Sent Events stream of the pilot's raw output (colors included). It sends `chunk` events (`id` is a sequence number, `data` is `{"stream": "stdout" | "stderr", "data": "…"}`), `reset` when a new run starts and `end` when the process exits. A client that reconnects with `Last-Event-ID` (or `?after=`) resumes where it stopped, and a new client first gets everything printed so far in the current run.

## Harnesses

The service is generic: `src/pilot.ts` runs one child process and `src/server.ts` exposes it over HTTP. Everything specific to an agent lives in one file under `src/harnesses/`. See [`src/harnesses/README.md`](src/harnesses/README.md) for the contract and how to add a new one.
