import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";

/** Run the Vue frontend and forward API requests to the backend. */
export default defineConfig({
    root: fileURLToPath(new URL(".", import.meta.url)),
    plugins: [vue()],

    server: {
        host: "localhost",
        port: 5173,
        strictPort: true,
        proxy: {
            "/api": {
                target: "http://127.0.0.1:8080",
            },
        },
    },
});
