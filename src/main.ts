import { createGateway } from "@mit-sdg/sync-engine/boundary";
import { createHttpHandler } from "@mit-sdg/sync-engine-http/handler";

import { assembleApplication } from "./assembly.ts";
import { client } from "./db.ts";
import { policy } from "./http-policy.ts";

import { resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

// Confirm the database is reachable before accepting requests.
await client.connect();

const application = assembleApplication();
const gateway = createGateway({ application });

const handler = createHttpHandler({
  application,
  gateway,
  policy,
});

/** Locate the built frontend relative to this source file. */
const frontendDirectory = fileURLToPath(
  new URL("../web/dist/", import.meta.url)
);

/** Serve built frontend files without allowing access outside web/dist. */
async function serveFrontend(request: Request): Promise<Response> {
  if (request.method !== "GET" && request.method !== "HEAD") {
    return new Response("Method not allowed", {
      status: 405,
      headers: { Allow: "GET, HEAD" },
    });
  }

  let pathname: string;

  try {
    pathname = decodeURIComponent(new URL(request.url).pathname);
  } catch {
    return new Response("Invalid URL", { status: 400 });
  }

  if (pathname.includes("\0") || pathname.includes("\\")) {
    return new Response("Invalid path", { status: 400 });
  }

  const relativePath =
    pathname === "/" ? "index.html" : pathname.slice(1);

  const filePath = resolve(frontendDirectory, relativePath);
  const root = resolve(frontendDirectory);

  // A request must never escape the directory containing public files.
  if (!filePath.startsWith(root + sep)) {
    return new Response("Not found", { status: 404 });
  }

  const file = Bun.file(filePath);

  if (!(await file.exists())) {
    return new Response("Not found", { status: 404 });
  }

  return new Response(request.method === "HEAD" ? null : file, {
    headers: {
      "Content-Type": file.type,
      "Cache-Control": "no-cache",
    },
  });
}

/** Use platform settings when supplied, retaining local development defaults. */
const hostname = process.env.HOST ?? "127.0.0.1";
const port = Number(process.env.PORT ?? "8080");

/** Serve health checks, API requests, and the built Vue frontend. */
const server = Bun.serve({
  hostname,
  port,

  async fetch(request) {
    const { pathname } = new URL(request.url);

    // Basic health check: the server started after connecting to MongoDB.
    if (pathname === "/health") {
      return Response.json({ status: "ok" });
    }

    // Keep API requests within the existing HTTP adapter.
    if (pathname === "/api" || pathname.startsWith("/api/")) {
      return handler(request);
    }

    return serveFrontend(request);
  },
});

console.log(`Batch server listening on ${hostname}:${server.port}`);

/** Stop accepting work and finish active requests before closing MongoDB. */
let stopping = false;

async function shutdown() {
  if (stopping) return;
  stopping = true;

  gateway.beginDrain();
  await server.stop();
  await gateway.whenIdle();
  await client.close();
}

process.on("SIGINT", () => {
  void shutdown();
});

process.on("SIGTERM", () => {
  void shutdown();
});
