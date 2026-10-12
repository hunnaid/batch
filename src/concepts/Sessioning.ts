import type { Collection, Db } from "mongodb";

/**
 * A login session belonging to a user.
 * The identifier is a secret token, and expiresAt limits its lifetime.
 */
type SessionDocument = {
    _id: string;
    user: string;
    expiresAt: Date;
};

/** The supplied session is missing or has expired. */
export class InvalidSession extends Error {}

/**
 * Associates session tokens with authenticated users.
 * Password verification and browser cookies are handled separately.
 */
export class SessioningConcept {
    private readonly sessions: Collection<SessionDocument>;

    /**
     * Select this concept's storage without performing a database operation.
     * @param db - The database used to store login sessions.
     */
    constructor(db: Db) {
        this.sessions = db.collection<SessionDocument>("sessioning.sessions");
    }

    /**
     * Creates a session for a user who has already authenticated.
     *
     * @param input - The authenticated user's identifier.
     * @returns A secret session token and its expiration time.
     */
    async start({ user }: { user: string }): Promise<{
        session: string;
        expiresAt: Date;
    }> {
        const session = crypto.randomUUID();

        // Sessions last seven days from login; using one does not extend it.
        const expiresAt = new Date(
            Date.now() + 7 * 24 * 60 * 60 * 1000
        );

        await this.sessions.insertOne({
            _id: session,
            user,
            expiresAt,
        });

        return { session, expiresAt };
    }

    /**
     * Identifies the user associated with an unexpired session.
     *
     * @param input - The session token received from the browser.
     * @returns The authenticated user's identifier.
     * @throws InvalidSession if the token is unknown or expired.
     */
    async resolve({
        session,
    }: {
        session: string;
    }): Promise<{ user: string }> {
        const existing = await this.sessions.findOne({ _id: session });

        if (!existing || existing.expiresAt.getTime() <= Date.now()) {
            throw new InvalidSession("The session is invalid or has expired.");
        }

        return { user: existing.user };
    }

    /**
     * Ends a session so its token can no longer identify a user.
     * Ending an already missing session also succeeds.
     *
     * @param input - The session token to invalidate.
     * @returns An empty action result.
     */
    async end({ session }: { session: string }): Promise<{}> {
        await this.sessions.deleteOne({ _id: session });
        return {};
    }
}
