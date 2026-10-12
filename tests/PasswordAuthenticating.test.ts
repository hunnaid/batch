import { afterAll, beforeAll, expect, test } from "bun:test";
import { MongoClient } from "mongodb";
import {
  InvalidCredentials,
  InvalidRegistration,
  PasswordAuthenticatingConcept,
  UsernameTaken,
} from "../src/concepts/PasswordAuthenticating.ts";

const url = process.env.MONGODB_URL;

if (!url) {
  throw new Error("MONGODB_URL is required to run these tests.");
}

// Use a separate database for this test run.
const client = new MongoClient(url, {
  serverSelectionTimeoutMS: 3000,
});

const db = client.db(
  `batch_test_auth_${crypto.randomUUID().replaceAll("-", "")}`
);

const accounts = new PasswordAuthenticatingConcept(db);
let connected = false;

beforeAll(async () => {
  await client.connect();
  connected = true;
});

// Delete only this run's database, and always close the connection.
afterAll(async () => {
  try {
    if (connected) {
      await db.dropDatabase();
    }
  } finally {
    await client.close();
  }
});

test("valid credentials return the registered user", async () => {
  const credentials = {
    username: "hunnaid",
    password: "test-password",
  };

  const registered = await accounts.register(credentials);
  const authenticated = await accounts.authenticate(credentials);

  expect(registered.user.length).toBeGreaterThan(0);
  expect(authenticated).toEqual(registered);
});

test("different users receive different identifiers", async () => {
  const first = await accounts.register({
    username: "first",
    password: "test-password",
  });

  const second = await accounts.register({
    username: "second",
    password: "test-password",
  });

  expect(first.user).not.toBe(second.user);
});

test("duplicate registration preserves the original credentials", async () => {
  const original = await accounts.register({
    username: "duplicate",
    password: "original-password",
  });

  await expect(
    accounts.register({
      username: "duplicate",
      password: "replacement-password",
    })
  ).rejects.toBeInstanceOf(UsernameTaken);

  expect(
    await accounts.authenticate({
      username: "duplicate",
      password: "original-password",
    })
  ).toEqual(original);

  await expect(
    accounts.authenticate({
      username: "duplicate",
      password: "replacement-password",
    })
  ).rejects.toBeInstanceOf(InvalidCredentials);
});

test("rejects an incorrect password", async () => {
  await accounts.register({
    username: "wrong-password-test",
    password: "correct-password",
  });

  await expect(
    accounts.authenticate({
      username: "wrong-password-test",
      password: "incorrect-password",
    })
  ).rejects.toBeInstanceOf(InvalidCredentials);
});

test("rejects an unknown username", async () => {
  await expect(
    accounts.authenticate({
      username: "never-registered",
      password: "test-password",
    })
  ).rejects.toBeInstanceOf(InvalidCredentials);
});

test("preserves spaces in the password", async () => {
  const registered = await accounts.register({
    username: "spaces-test",
    password: " password with spaces ",
  });

  expect(
    await accounts.authenticate({
      username: "spaces-test",
      password: " password with spaces ",
    })
  ).toEqual(registered);

  await expect(
    accounts.authenticate({
      username: "spaces-test",
      password: "password with spaces",
    })
  ).rejects.toBeInstanceOf(InvalidCredentials);
});

/**
 * Inspect storage to verify that the password itself is not retained.
 */
test("stores a verifiable hash instead of the password", async () => {
  const password = "storage-test-password";

  await accounts.register({
    username: "hash-test",
    password,
  });

  const stored = await db
    .collection<{ username: string; passwordHash: string }>(
      "passwordAuthenticating.users"
    )
    .findOne({ username: "hash-test" });

  if (!stored) {
    throw new Error("The registered user was not stored.");
  }

  expect(stored).not.toHaveProperty("password");
  expect(stored.passwordHash).not.toBe(password);
  expect(
    await Bun.password.verify(password, stored.passwordHash)
  ).toBe(true);
});

// Each case changes one field of otherwise valid registration input.
const invalidCases = [
  { label: "empty username", username: "", password: "valid-password" },
  { label: "blank username", username: "   ", password: "valid-password" },
  { label: "empty password", username: "empty-password", password: "" },
  { label: "blank password", username: "blank-password", password: "   " },
];

for (const { label, username, password } of invalidCases) {
  test(`rejects ${label}`, async () => {
    await expect(
      accounts.register({ username, password })
    ).rejects.toBeInstanceOf(InvalidRegistration);
  });
}
