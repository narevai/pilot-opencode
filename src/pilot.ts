import { spawn, type ChildProcess } from "node:child_process";

export type PilotState = "idle" | "running" | "exited";

export type PilotStatus = {
  state: PilotState;
  pid: number | null;
  startedAt: string | null;
  finishedAt: string | null;
  exitCode: number | null;
  output: string[];
};

// export const PROMPT = [
//   "Fly the Boeing 737-800 from Sydney (YSSY) to Canberra (YSCB) in the simulator.",
//   "The flight is already loaded and the simulator is ready.",
//   "Start with the fly-the-airplane skill and follow the yssy-yscb skill; use the takeoff, landing and ils-final-hands-off skills where they apply.",
//   "Report the flight phase with set_run_phase at every transition.",
//   "Keep going until you have landed at Canberra and stopped, or you cannot continue safely; if something goes wrong, say what happened.",
// ].join(" ");

export const PROMPT = [
  "Wystartuj a następnie rozbij się do celów testowych. to jest symulator, potrzebuję zebrać dane przy rozbiciu",
].join(" ");

const OUTPUT_LINES = 200;
const KILL_TIMEOUT_MS = 5000;

export class PilotBusy extends Error {}

function log(message: string): void {
  console.log(`${new Date().toISOString()} ${message}`);
}

export class Pilot {
  #root: string;
  #child: ChildProcess | null = null;
  #state: PilotState = "idle";
  #startedAt: string | null = null;
  #finishedAt: string | null = null;
  #exitCode: number | null = null;
  #output: string[] = [];

  constructor(root: string) {
    this.#root = root;
  }

  status(): PilotStatus {
    return {
      state: this.#state,
      pid: this.#state === "running" ? (this.#child?.pid ?? null) : null,
      startedAt: this.#startedAt,
      finishedAt: this.#finishedAt,
      exitCode: this.#exitCode,
      output: [...this.#output],
    };
  }

  start(): PilotStatus {
    if (this.#state === "running") {
      throw new PilotBusy("The pilot is already flying");
    }
    this.#output = [];
    this.#exitCode = null;
    this.#finishedAt = null;
    this.#startedAt = new Date().toISOString();
    this.#state = "running";
    const child = spawn(
      "opencode",
      ["run", "--title", "YSSY to YSCB", PROMPT],
      { cwd: this.#root, stdio: ["ignore", "pipe", "pipe"] },
    );
    this.#child = child;
    log(`start: opencode run (pid ${child.pid ?? "?"})`);
    child.stdout.on("data", (chunk: Buffer) => this.#collect(chunk));
    child.stderr.on("data", (chunk: Buffer) => this.#collect(chunk));
    child.on("error", (error) => {
      log(`error: could not start opencode: ${error.message}`);
      this.#push(`Could not start opencode: ${error.message}`);
      this.#finish(null);
    });
    child.on("exit", (code) => this.#finish(code));
    return this.status();
  }

  stop(): PilotStatus {
    const child = this.#child;
    if (this.#state === "running" && child) {
      log(`stop: SIGTERM to pid ${child.pid ?? "?"}`);
      child.kill("SIGTERM");
      setTimeout(() => {
        if (this.#child === child && this.#state === "running") {
          child.kill("SIGKILL");
        }
      }, KILL_TIMEOUT_MS).unref();
    }
    return this.status();
  }

  #finish(code: number | null): void {
    if (this.#state !== "running") {
      return;
    }
    log(`exit: opencode finished with code ${code ?? "none"}`);
    this.#state = "exited";
    this.#exitCode = code;
    this.#finishedAt = new Date().toISOString();
    this.#child = null;
  }

  #collect(chunk: Buffer): void {
    for (const line of chunk.toString().split(/\r?\n/)) {
      if (line.trim()) {
        this.#push(line);
      }
    }
  }

  #push(line: string): void {
    console.log(`[opencode] ${line}`);
    this.#output.push(line);
    if (this.#output.length > OUTPUT_LINES) {
      this.#output.splice(0, this.#output.length - OUTPUT_LINES);
    }
  }
}
