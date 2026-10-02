# Harnesses

A harness is the one thing that differs between agents: how to launch it. `src/pilot.ts` runs the child process, collects its output and stops it; a harness only says which command to run for the hardcoded prompt and title (`src/prompt.ts`).

## Contract

```ts
type Harness = {
  readonly name: string;
  launch(task: Task): Launch;
};

type Task = { readonly prompt: string; readonly title: string };
type Launch = { readonly command: string; readonly args: readonly string[] };
```

- `name` is the value of `harness` in `POST /start` and is shown in `GET /status` and in the logs.
- `launch` is pure: it returns the command and arguments and does not start anything. The process runs in the repo root with stdout and stderr captured.

## Adding a harness

1. Create `src/harnesses/<name>.ts`:

   ```ts
   import type { Harness, Launch, Task } from "../harness.ts";

   export const cursor: Harness = {
     name: "cursor",
     launch(task: Task): Launch {
       return {
         command: "cursor-agent",
         args: ["--print", task.prompt],
       };
     },
   };
   ```

2. Register it in `src/harnesses/index.ts`:

   ```ts
   import { cursor } from "./cursor.ts";

   const HARNESSES: Readonly<Record<string, Harness>> = {
     [opencode.name]: opencode,
     [cursor.name]: cursor,
   };
   ```

3. Make sure the agent's CLI is installed and logged in where the service runs.
4. In irl-gym, add the same name to the `Harness` enum (`src/sim/control/jobs.py`), for example `CURSOR = "cursor"`. It then appears in the dashboard's harness select and is sent as `harness` in the start request.

An unknown or missing `harness` in the request is answered with 400 and the list of registered names. Only one harness runs at a time: a second `POST /start` while one is flying answers 409.
