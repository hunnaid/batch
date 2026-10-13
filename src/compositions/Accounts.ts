import {
    endpoint,
    receive,
    respond,
} from "@mit-sdg/sync-engine/boundary";
import { concepts } from "../concepts.ts";

const { PasswordAuthenticating, Sessioning } = concepts;

/**
 * Verify credential field types at the API boundary.
 * PasswordAuthenticating handles blank values and credential matching.
 */
function credentialsInput(value: unknown): { ok: boolean } {
    if (
        typeof value !== "object" ||
        value === null ||
        Array.isArray(value)
    ) {
        return { ok: false };
    }

    const input = value as Record<string, unknown>;

    return {
        ok:
        typeof input.username === "string" &&
        typeof input.password === "string",
    };
}

/**
 * Accept a session token or the null supplied when no cookie is present.
 * Sessioning decides whether the session is valid.
 */
function sessionInput(value: unknown): { ok: boolean } {
    if (
        typeof value !== "object" ||
        value === null ||
        Array.isArray(value)
    ) {
        return { ok: false };
    }

    const input = value as Record<string, unknown>;

    return {
        ok: typeof input.session === "string" || input.session === null,
    };
}

/**
 * Register an account.
 * Registration does not automatically sign the user in.
 */
const Register = endpoint(
    "/accounts/register",
    ({ username, password, user }) =>
        receive({ username, password })
        .then(
            PasswordAuthenticating.register({ username, password })
            .responds({ user })
        )
        .then(respond({ user })),
    {
        validators: { input: credentialsInput },
    }
);

/**
 * Start a session only after the supplied credentials authenticate.
 * The HTTP adapter will later deliver the token through a cookie.
 */
const Login = endpoint(
    "/sessions/start",
    ({ username, password, user, session, expiresAt }) =>
        receive({ username, password })
        .then(
            PasswordAuthenticating.authenticate({ username, password })
            .responds({ user })
        )
        .then(
            Sessioning.start({ user })
            .responds({ session, expiresAt })
        )
        .then(respond({ user, session, expiresAt })),
    {
        validators: { input: credentialsInput },
    }
);

/**
 * Identify the currently signed-in user from their session token.
 */
const CurrentUser = endpoint(
    "/sessions/current",
    ({ session, user }) =>
        receive({ session })
        .then(Sessioning.resolve({ session }).responds({ user }))
        .then(respond({ user })),
    {
        validators: { input: sessionInput },
    }
);

/**
 * Invalidate the current session.
 * The HTTP adapter will also clear the browser's session cookie.
 */
const Logout = endpoint(
    "/sessions/end",
    ({ session }) =>
        receive({ session })
        .then(Sessioning.end({ session }))
        .then(respond({})),
    {
        validators: { input: sessionInput },
    }
);

export const composition = {
    Register,
    Login,
    CurrentUser,
    Logout,
};
