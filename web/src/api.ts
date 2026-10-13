import { createHttpClient } from "@mit-sdg/sync-engine-http/client";
import type { BatchWireHttp } from "../../generated/wire";

/**
 * Call the generated HTTP API through the frontend's proxy.
 * The browser supplies the session cookie automatically.
 */
export const api = createHttpClient<BatchWireHttp>({
    baseUrl: "/api",
    credentials: "same-origin",
});

/** Let form handlers report a returned API error using their catch block. */
export class ApiError extends Error {
    constructor(public readonly code: string) {
        super(code);
        this.name = "ApiError";
    }
}
