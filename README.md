# pilot-opencode

Skills, MCP configuration and prompt for an agent flying the simulator through one MCP server: **flightsim-pilot** (irl-gym `/mcp`).

irl-gym starts a Cube sandbox for every run, clones this repo into it and runs the harness from the repo root. There is no service in this repo.

## Layout

```
harness.json   command (placeholders {model} {title} {prompt}) and required env
prompt.md      task prompt template
opencode.json  MCP configuration (URL from IRL_GYM_MCP_URL)
AGENTS.md      standing instructions for the agent
.opencode/skills/<skill>/SKILL.md
```

One repo per agent. Run the harness with the repo root as the working directory. The dev container is for local use only; the sandbox needs just the files above.

## Routes

irl-gym fills the placeholders from the scenario: `{departure}`, `{destination}`, `{departure_name}`, `{destination_name}` and `{route_skill}`. The title is `<departure> to <destination>` and the route skill is `<departure>-<destination>` in lower case (`yssy-yscb`). A new route is a new skill with that name plus a scenario in irl-gym.

## Skills

| Skill | Use |
| --- | --- |
| `fly-the-airplane` | Closed-loop control through the MCP server |
| `takeoff-straight-ahead` | 737-800 runway roll and straight climb |
| `ils-final-hands-off` | Keep an ILS/autoland stable after LOC and G/S capture |
| `landing` | Dual-autopilot ILS autoland: setup, checks, flare and rollout, go-around |
| `yssy-yscb` | Zibo 737-800X from Sydney YSSY to Canberra YSCB |

## Try it locally

Open the repo in the Dev Container (it sets `IRL_GYM_MCP_URL`), or export it yourself.

```
IRL_GYM_MCP_URL=http://irl-gym-kamil-local.broadbill-pickerel.ts.net:8000/mcp \
  opencode run --model <provider/model> "$(cat prompt.md)"
```

The pilot server does not expose the CDU/FMC, the radios or wheel brakes, and there is no simulation control: starting, restarting or pausing the simulation is up to irl-gym.
