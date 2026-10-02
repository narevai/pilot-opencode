import { createServer, type IncomingMessage, type Server, type ServerResponse } from "node:http";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import type { Harness } from "./harness.ts";
import { findHarness, harnessNames } from "./harnesses/index.ts";
import { Pilot, PilotBusy, type Chunk, type PilotStatus } from "./pilot.ts";

const ROOT: string = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const HOST: string = process.env.PILOT_HOST ?? "127.0.0.1";
const PORT: number = Number(process.env.PILOT_PORT ?? 8090);
const TOKEN: string = process.env.PILOT_TOKEN ?? "";
const MAX_BODY_BYTES: number = 262_144;
const HEARTBEAT_MS: number = 15_000;

const OK: number = 200;
const ACCEPTED: number = 202;
const BAD_REQUEST: number = 400;
const UNAUTHORIZED: number = 401;
const NOT_FOUND: number = 404;
const CONFLICT: number = 409;
const INTERNAL: number = 500;

type JsonObject = Readonly<Record<string, unknown>>;

class BadRequest extends Error {}

const pilot: Pilot = new Pilot(ROOT);

function send(response: ServerResponse, status: number, body: JsonObject | PilotStatus): void {
  response.writeHead(status, { "Content-Type": "application/json" });
  response.end(JSON.stringify(body));
}

function authorized(request: IncomingMessage): boolean {
  return TOKEN === "" || request.headers.authorization === `Bearer ${TOKEN}`;
}

async function readBody(request: IncomingMessage): Promise<string> {
  const chunks: Buffer[] = [];
  let size: number = 0;
  for await (const chunk of request as AsyncIterable<Buffer>) {
    size += chunk.length;
    if (size > MAX_BODY_BYTES) {
      throw new BadRequest("Request body is too large");
    }
    chunks.push(chunk);
  }
  return Buffer.concat(chunks).toString();
}

function text(value: unknown, name: string): string | undefined {
  if (value === undefined || value === null) {
    return undefined;
  }
  if (typeof value !== "string") {
    throw new BadRequest(`${name} must be a string`);
  }
  return value;
}

type StartRequest = {
  readonly harness: Harness;
  readonly runId: string | undefined;
};

function harnessOf(name: string | undefined): Harness {
  if (name === undefined) {
    throw new BadRequest("harness is required");
  }
  const harness: Harness | undefined = findHarness(name);
  if (harness === undefined) {
    throw new BadRequest(`Unknown harness "${name}". Available: ${harnessNames().join(", ")}`);
  }
  return harness;
}

async function startRequest(request: IncomingMessage): Promise<StartRequest> {
  const raw: string = (await readBody(request)).trim();
  if (raw === "") {
    throw new BadRequest("Request body is required");
  }
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    throw new BadRequest("Request body is not valid JSON");
  }
  if (typeof data !== "object" || data === null || Array.isArray(data)) {
    throw new BadRequest("Request body must be a JSON object");
  }
  const fields: JsonObject = data as JsonObject;
  return {
    harness: harnessOf(text(fields.harness, "harness")),
    runId: text(fields.run_id, "run_id"),
  };
}

async function start(request: IncomingMessage, response: ServerResponse): Promise<void> {
  const { harness, runId }: StartRequest = await startRequest(request);
  try {
    send(response, ACCEPTED, pilot.start(harness, runId));
  } catch (error: unknown) {
    if (!(error instanceof PilotBusy)) {
      throw error;
    }
    send(response, CONFLICT, { error: error.message, ...pilot.status() });
  }
}

function frame(chunk: Chunk): string {
  const body: string = JSON.stringify({ stream: chunk.stream, data: chunk.data });
  return `id: ${chunk.seq}\nevent: chunk\ndata: ${body}\n\n`;
}

function cursorOf(request: IncomingMessage): number {
  const url: URL = new URL(request.url ?? "/", "http://pilot");
  const header: string | undefined = request.headers["last-event-id"] as string | undefined;
  const value: number = Number(header ?? url.searchParams.get("after") ?? 0);
  return Number.isInteger(value) && value >= 0 ? value : 0;
}

function stream(request: IncomingMessage, response: ServerResponse): void {
  response.writeHead(OK, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    "X-Accel-Buffering": "no",
  });
  let last: number = cursorOf(request);
  const heartbeat: NodeJS.Timeout = setInterval((): void => {
    response.write(": heartbeat\n\n");
  }, HEARTBEAT_MS);
  const unsubscribe: () => void = pilot.subscribe({
    start: (): void => {
      last = 0;
      response.write("event: reset\ndata: {}\n\n");
    },
    chunk: (chunk: Chunk): void => {
      if (chunk.seq > last) {
        last = chunk.seq;
        response.write(frame(chunk));
      }
    },
    end: (): void => {
      response.write("event: end\ndata: {}\n\n");
    },
  });
  request.on("close", (): void => {
    clearInterval(heartbeat);
    unsubscribe();
  });
  if (pilot.startsAfter(last)) {
    last = 0;
    response.write("event: reset\ndata: {}\n\n");
  }
  for (const chunk of pilot.chunksAfter(last)) {
    last = chunk.seq;
    response.write(frame(chunk));
  }
}

async function handle(
  route: string,
  request: IncomingMessage,
  response: ServerResponse,
): Promise<void> {
  switch (route) {
    case "GET /status":
      send(response, OK, pilot.status());
      return;
    case "GET /stream":
      stream(request, response);
      return;
    case "POST /start":
      await start(request, response);
      return;
    case "POST /stop":
      send(response, OK, await pilot.stop());
      return;
    default:
      send(response, NOT_FOUND, { error: "Not found" });
  }
}

async function serve(request: IncomingMessage, response: ServerResponse): Promise<void> {
  const route: string = `${request.method} ${request.url?.split("?")[0]}`;
  response.on("finish", (): void => {
    console.log(`${new Date().toISOString()} ${route} -> ${response.statusCode}`);
  });
  if (route === "GET /health") {
    send(response, OK, { status: "ok" });
    return;
  }
  if (!authorized(request)) {
    send(response, UNAUTHORIZED, { error: "Unauthorized" });
    return;
  }
  try {
    await handle(route, request, response);
  } catch (error: unknown) {
    if (error instanceof BadRequest) {
      send(response, BAD_REQUEST, { error: error.message });
      return;
    }
    console.error(error);
    send(response, INTERNAL, { error: "Internal error" });
  }
}

const server: Server = createServer(serve);

server.listen(PORT, HOST, (): void => {
  console.log(`pilot service listening on http://${HOST}:${PORT}`);
});
