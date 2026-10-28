import { expect, test } from "bun:test";
import { fileURLToPath } from "node:url";
import { policy } from "../src/http-policy.ts";

test("the production server starts with its registered gateway and protects imports", async () => {
  const child = Bun.spawn([process.execPath, "src/main.ts"], {
    cwd: fileURLToPath(new URL("../", import.meta.url)),
    env: { ...process.env, HOST: "127.0.0.1", PORT: "0" },
    stdout: "pipe",
    stderr: "pipe",
  });
  // Bound startup independently of the test timeout so a failed child is cleaned up.
  const deadline = setTimeout(() => child.kill(), 8000);
  try {
    const reader = child.stdout.getReader();
    let output = "";
    let address: RegExpMatchArray | null = null;
    while (!(address = output.match(/Batch server listening on (127\.0\.0\.1:\d+)/))) {
      const chunk = await reader.read();
      if (chunk.done) throw new Error("The production server exited before listening.");
      output += new TextDecoder().decode(chunk.value);
    }
    const base = `http://${address[1]}`;
    const health = await fetch(`${base}/health`);
    expect(health.status).toBe(200);
    expect(await health.json()).toEqual({ status: "ok" });

    for (const path of ["/recipes/import-personal", "/recipes/import", "/recipes/import-text-personal", "/recipes/import-text"]) {
      const anonymousImport = await fetch(`${base}/api${path}`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Origin: policy.publicOrigin! },
        body: JSON.stringify({ url: "https://recipes.example.com/cake", text: "Recipe page", collection: "missing" }),
      });
      expect(anonymousImport.status).toBe(401);
      expect(await anonymousImport.json()).toEqual({ error: "UNAUTHORIZED" });
    }
  } finally {
    clearTimeout(deadline);
    child.kill();
    await child.exited;
  }
}, 12_000);
