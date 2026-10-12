import { createGateway } from "@mit-sdg/sync-engine/boundary";
import { createHttpHandler } from "@mit-sdg/sync-engine-http/handler";

import { assembleApplication } from "./assembly.ts";
import { client } from "./db.ts";
import { policy } from "./http-policy.ts";

// Confirm the database is reachable before accepting requests.
await client.connect();

const application = assembleApplication();
const gateway = createGateway({ application });

const handler = createHttpHandler({
  application,
  gateway,
  policy,
});

/** Serve the application's POST/JSON endpoints on the local machine. */
const server = Bun.serve({
  hostname: "127.0.0.1",
  port: 8080,
  fetch: handler,
});

console.log(`Batch API is running at http://localhost:${server.port}/api`);

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
