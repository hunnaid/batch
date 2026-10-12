import {
    MongoServerError,
    type Collection,
    type Db,
} from "mongodb";

/**
 * A registered user's identity and credentials.
 * Store a password hash instead of the original password.
 */
type UserDocument = {
    _id: string;
    username: string;
    passwordHash: string;
};

/** Registration requires a nonblank username and password. */
export class InvalidRegistration extends Error {}

/** Each username can belong to only one user. */
export class UsernameTaken extends Error {}

/** Authentication failed because the credentials did not match. */
export class InvalidCredentials extends Error {}

/**
 * Registers users and verifies their credentials.
 * Collection access and session management are handled separately.
 */
export class PasswordAuthenticatingConcept {
    private readonly users: Collection<UserDocument>;

    /**
     * Select this concept's storage without performing a database operation.
     * @param db - The database used to store registered users.
     */
    constructor(db: Db) {
        this.users = db.collection<UserDocument>(
        "passwordAuthenticating.users"
        );
    }

    /**
     * Registers a user with a unique username and a hashed password.
     *
     * @param input - The username and password supplied during registration.
     * @returns The new user's identifier.
     * @throws InvalidRegistration if either field is blank.
     * @throws UsernameTaken if the username is already registered.
     */
    async register(
        { username, password }: { username: string; password: string }
    ): Promise<{ user: string }> {
        if (username.trim().length === 0 || password.trim().length === 0) {
            throw new InvalidRegistration(
            "Username and password cannot be blank."
            );
        }

        // Enforce uniqueness in MongoDB, including simultaneous registrations.
        await this.users.createIndex({ username: 1 }, { unique: true });

        const user = crypto.randomUUID();

        // Hash the original password without trimming or otherwise changing it.
        const passwordHash = await Bun.password.hash(password, {
            algorithm: "argon2id",
        });

        try {
            await this.users.insertOne({
            _id: user,
            username,
            passwordHash,
            });
        } catch (error) {
            // MongoDB uses code 11000 for a duplicate unique-index value.
            if (
            error instanceof MongoServerError &&
            error.code === 11000 &&
            error.keyPattern?.username === 1
            ) {
            throw new UsernameTaken("That username is already registered.");
            }

            // Database outages and unrelated failures must retain their real cause.
            throw error;
        }

        return { user };
    }

    /**
     * Verifies credentials and returns the registered user's identifier.
     * Does not create a session or change stored user data.
     *
     * @param input - The username and password supplied during login.
     * @returns The authenticated user's identifier.
     * @throws InvalidCredentials if the username or password does not match.
     */
    async authenticate(
        { username, password }: { username: string; password: string }
    ): Promise<{ user: string }> {
        const user = await this.users.findOne({ username });

        if (!user) {
            throw new InvalidCredentials("Invalid username or password.");
        }

        const matches = await Bun.password.verify(
            password,
            user.passwordHash
        );

        if (!matches) {
            throw new InvalidCredentials("Invalid username or password.");
        }

        return { user: user._id };
    }
}
