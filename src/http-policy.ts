import { httpPolicy } from "@mit-sdg/sync-engine-http/policy";

/**
 * Configure local API routes, public errors, and browser session cookies.
 * Use this same policy when generating the browser's API contract.
 */
export const policy = httpPolicy({
    publicOrigin: "http://localhost:8080",
    basePath: "/api",
    requestOrigins: {
        allowed: [
            "http://localhost:8080",
            "http://localhost:5173",
        ],
    },

    publicErrors: {
        INVALID_REGISTRATION: "INVALID_REQUEST",
        USERNAME_TAKEN: "CONFLICT",
        INVALID_CREDENTIALS: "UNAUTHORIZED",
        INVALID_SESSION: "UNAUTHORIZED",
        INVALID_COLLECTION_NAME: "INVALID_REQUEST",
        ACCESS_DENIED: "FORBIDDEN",
        INVALID_RECIPE: "INVALID_REQUEST",
        COLLECTION_NOT_FOUND: "NOT_FOUND",
        ITEM_ALREADY_COLLECTED: "CONFLICT",
        INVALID_COOKING_ENTRY: "INVALID_REQUEST",
        RECIPE_NOT_IN_COLLECTION: "NOT_FOUND",
        ENTRY_NOT_IN_RECIPE: "NOT_FOUND",
        COOKING_ENTRY_NOT_FOUND: "NOT_FOUND",
        COOKING_ENTRY_NOT_OWNED: "FORBIDDEN",
        INVALID_COOKING_ENTRY_EDIT: "INVALID_REQUEST",
        RECIPIENT_NOT_FOUND: "NOT_FOUND",
        GRANT_RESOURCE_NOT_FOUND: "NOT_FOUND",
        GRANT_NOT_OWNER: "FORBIDDEN",
        CANNOT_GRANT_OWNER: "CONFLICT",
        MEMBER_ALREADY_ADDED: "CONFLICT",
        REVOKE_RESOURCE_NOT_FOUND: "NOT_FOUND",
        REVOKE_NOT_OWNER: "FORBIDDEN",
        CANNOT_REVOKE_OWNER: "CONFLICT",
        MEMBER_NOT_ADDED: "CONFLICT",
        INVALID_COLLECTION_RENAME: "INVALID_REQUEST",
        RENAME_COLLECTION_NOT_FOUND: "NOT_FOUND",
        DELETE_COLLECTION_NOT_FOUND: "NOT_FOUND",
        OWNER_ACCESS_REQUIRED: "FORBIDDEN",
        CANNOT_UNINITIALIZE_RESOURCE: "FORBIDDEN",
    },

    cookies: {
        session: {
        name: "batch-session",
        input: "session",
        issue: [
            {
                path: "/sessions/start",
                value: "session",
                expires: "expiresAt",
            },
        ],
        clear: ["/sessions/end"],
        },
    },
});
