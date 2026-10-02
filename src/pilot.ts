import { spawn, type ChildProcess } from "node:child_process";
import type { Harness, Launch, Task } from "./harness.ts";
import { PROMPT, TITLE } from "./prompt.ts";

export type PilotState = "idle" | "running" | "exited";

export type PilotStatus = {
  readonly state: PilotState;
  readonly harness: string | null;
  readonly pid: number | null;
  readonly startedAt: string | null;
  readonly finishedAt: string | null;
  readonly exitCode: number | null;
  readonly output: readonly string[];
};

export type Stream = "stdout" | "stderr";

export type Chunk = {
  readonly seq: number;
  readonly stream: Stream;
  readonly data: string;
};

export type Listener = {
  readonly start: () => void;
  readonly chunk: (chunk: Chunk) => void;
  readonly end: () => void;
};

const OUTPUT_LINES: number = 200;
const CHUNK_LIMIT: number = 5000;
const KILL_TIMEOUT_MS: number = 5000;
const EXIT_GRACE_MS: number = 2000;

export class PilotBusy extends Error {}

function log(message: string): void {
  console.log(`${new Date().toISOString()} ${message}`);
}

export class Pilot {
  readonly #root: string;
  #harness: Harness | null = null;
  #child: ChildProcess | null = null;
  #state: PilotState = "idle";
  #startedAt: string | null = null;
  #finishedAt: string | null = null;
  #exitCode: number | null = null;
  #output: string[] = [];
  #chunks: Chunk[] = [];
  #sequence: number = 0;
  #partial: Record<Stream, string> = { stdout: "", stderr: "" };
  readonly #listeners: Set<Listener> = new Set();

  constructor(root: string) {
    this.#root = root;
  }

  status(): PilotStatus {
    return {
      state: this.#state,
      harness: this.#harness?.name ?? null,
      pid: this.#state === "running" ? (this.#child?.pid ?? null) : null,
      startedAt: this.#startedAt,
      finishedAt: this.#finishedAt,
      exitCode: this.#exitCode,
      output: [...this.#output],
    };
  }

  start(harness: Harness, runId?: string): PilotStatus {
    if (this.#state === "running") {
      throw new PilotBusy("The pilot is already flying");
    }
    this.#harness = harness;
    this.#output = [];
    this.#chunks = [];
    this.#partial = { stdout: "", stderr: "" };
    this.#exitCode = null;
    this.#finishedAt = null;
    this.#startedAt = new Date().toISOString();
    this.#state = "running";
    for (const listener of this.#listeners) {
      listener.start();
    }
    const task: Task = { prompt: PROMPT, title: TITLE };
    const launch: Launch = harness.launch(task);
    const child: ChildProcess = spawn(launch.command, [...launch.args], {
      cwd: this.#root,
      env: { ...process.env, FORCE_COLOR: "1" },
      stdio: ["ignore", "pipe", "pipe"],
    });
    child.stdout?.setEncoding("utf8");
    child.stderr?.setEncoding("utf8");
    this.#child = child;
    log(`start: ${harness.name} (pid ${child.pid ?? "?"}, run ${runId ?? "none"})`);
    child.stdout?.on("data", (data: string): void => this.#collect("stdout", data));
    child.stderr?.on("data", (data: string): void => this.#collect("stderr", data));
    child.on("error", (error: Error): void => {
      log(`error: could not start ${harness.name}: ${error.message}`);
      this.#emit("stderr", `Could not start ${harness.name}: ${error.message}\r\n`);
      this.#finish(null);
    });
    child.on("exit", (code: number | null): void => this.#finish(code));
    return this.status();
  }

  async stop(): Promise<PilotStatus> {
    const child: ChildProcess | null = this.#child;
    if (this.#state !== "running" || child === null) {
      return this.status();
    }
    log(`stop: SIGTERM to pid ${child.pid ?? "?"}`);
    const exited: Promise<void> = new Promise<void>((resolve: () => void): void => {
      child.once("exit", resolve);
    });
    child.kill("SIGTERM");
    const killer: NodeJS.Timeout = setTimeout((): void => {
      if (this.#child === child && this.#state === "running") {
        log(`stop: SIGKILL to pid ${child.pid ?? "?"}`);
        child.kill("SIGKILL");
      }
    }, KILL_TIMEOUT_MS);
    const gaveUp: Promise<void> = new Promise<void>((resolve: () => void): void => {
      setTimeout(resolve, KILL_TIMEOUT_MS + EXIT_GRACE_MS).unref();
    });
    await Promise.race([exited, gaveUp]);
    clearTimeout(killer);
    return this.status();
  }

  #finish(code: number | null): void {
    if (this.#state !== "running") {
      return;
    }
    log(`exit: ${this.#harness?.name ?? "pilot"} finished with code ${code ?? "none"}`);
    this.#state = "exited";
    this.#exitCode = code;
    this.#finishedAt = new Date().toISOString();
    this.#child = null;
    for (const stream of ["stdout", "stderr"] as const) {
      this.#push(this.#partial[stream]);
      this.#partial[stream] = "";
    }
    for (const listener of this.#listeners) {
      listener.end();
    }
  }

  chunksAfter(seq: number): Chunk[] {
    return this.#chunks.filter((chunk: Chunk): boolean => chunk.seq > seq);
  }

  subscribe(listener: Listener): () => void {
    this.#listeners.add(listener);
    return (): void => {
      this.#listeners.delete(listener);
    };
  }

  #collect(stream: Stream, data: string): void {
    this.#emit(stream, data);
    const lines: string[] = (this.#partial[stream] + data).split(/\r?\n/);
    this.#partial[stream] = lines.pop() ?? "";
    for (const line of lines) {
      this.#push(line);
    }
  }

  #emit(stream: Stream, data: string): void {
    const chunk: Chunk = { seq: ++this.#sequence, stream, data };
    this.#chunks.push(chunk);
    if (this.#chunks.length > CHUNK_LIMIT) {
      this.#chunks.splice(0, this.#chunks.length - CHUNK_LIMIT);
    }
    for (const listener of this.#listeners) {
      listener.chunk(chunk);
    }
  }

  #push(line: string): void {
    if (line.trim() === "") {
      return;
    }
    console.log(`[${this.#harness?.name ?? "pilot"}] ${line}`);
    this.#output.push(line);
    if (this.#output.length > OUTPUT_LINES) {
      this.#output.splice(0, this.#output.length - OUTPUT_LINES);
    }
  }
}
