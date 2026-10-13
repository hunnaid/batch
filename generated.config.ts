import { assembleApplication } from "./src/assembly.ts";
import { httpWire } from "@mit-sdg/sync-engine-http/tooling";
import { policy } from "./src/http-policy.ts";

export default {
  assemble: assembleApplication,
  title: "Application",
  design: {
    version: 1,
    documents: [
      new URL("./design/types.md", import.meta.url),
      new URL("./design/compositions/Collections.md", import.meta.url),
      new URL("./design/compositions/Accounts.md", import.meta.url),
      new URL("./design/compositions/Recipes.md", import.meta.url),
    ],
  },
  wireName: "BatchWire",
  projections: [
    httpWire({
      policy,
      name: "BatchWireHttp",
    }),
  ],
};
