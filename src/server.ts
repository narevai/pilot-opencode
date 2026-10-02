import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { Pilot, PilotBusy } from "./pilot.ts";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const HOST = process.env.PILOT_HOST ?? "127.0.0.1";
const PORT = Number(process.env.PILOT_PORT ?? 8090);
const TOKEN = process.env.PILOT_TOKEN ?? "";

const pilot = new Pilot(ROOT);

function send(response: ServerResponse, status: number, body: unknown): void {
  response.writeHead(status, { "Content-Type": "application/json" });
  response.end(JSON.stringify(body));
}

function authorized(request: IncomingMessage): boolean {
  return TOKEN === "" || request.headers.authorization === `Bearer ${TOKEN}`;
}

const server = createServer((request, response) => {
  const route = `${request.method} ${request.url?.split("?")[0]}`;
  response.on("finish", () => {
    console.log(`${new Date().toISOString()} ${route} -> ${response.statusCode}`);
  });
  if (route === "GET /health") {
    send(response, 200, { status: "ok" });
    return;
  }
  if (!authorized(request)) {
    send(response, 401, { error: "Unauthorized" });
    return;
  }
  switch (route) {
    case "GET /status":
      send(response, 200, pilot.status());
      return;
    case "POST /start":
      try {
        send(response, 202, pilot.start());
      } catch (error) {
        if (error instanceof PilotBusy) {
          send(response, 409, { error: error.message, ...pilot.status() });
          return;
        }
        throw error;
      }
      return;
    case "POST /stop":
      send(response, 200, pilot.stop());
      return;
    default:
      send(response, 404, { error: "Not found" });
  }
});

server.listen(PORT, HOST, () => {
  console.log(`pilot service listening on http://${HOST}:${PORT}`);
});
