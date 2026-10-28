import {
    endpoint,
    receive,
    respond,
} from "@mit-sdg/sync-engine/boundary";
import { concepts } from "../concepts.ts";
import { sessionInput, stringInput } from "../input-validation.ts";

const { PasswordAuthenticating, Sessioning } = concepts;

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
        validators: { input: stringInput("username", "password") },
    }
);

/**
 * Start a session only after the supplied credentials authenticate.
 * The HTTP adapter delivers the token through a cookie.
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
        validators: { input: stringInput("username", "password") },
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
        validators: { input: sessionInput() },
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
        validators: { input: sessionInput() },
    }
);

export const composition = {
    Register,
    Login,
    CurrentUser,
    Logout,
};
