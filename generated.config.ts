import { assembleApplication } from "./src/assembly.ts";

export default {
  assemble: assembleApplication,
  title: "Application",
  design: {
    version: 1,
    documents: [
      new URL("./design/types.md", import.meta.url),
      new URL("./design/compositions/Collections.md", import.meta.url),
    ],
  },
};
