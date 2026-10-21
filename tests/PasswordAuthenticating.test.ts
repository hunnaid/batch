import { expect, test } from "bun:test";
import { testDatabase } from "./helpers/database.ts";
import {
  InvalidCredentials,
  InvalidRegistration,
  PasswordAuthenticatingConcept,
  UsernameTaken,
} from "../src/concepts/PasswordAuthenticating.ts";

const db = testDatabase("auth");

const accounts = new PasswordAuthenticatingConcept(db);

test("registration and exact username lookup keep users and credentials distinct", async () => {
  expect(await accounts._byUsername({ username: "Alice" })).toEqual([]);
  const alice = await accounts.register({ username: "Alice", password: "alice-password" });
  const bob = await accounts.register({ username: "Bob", password: "bob-password" });
  expect(alice.user).not.toBe(bob.user);
  expect(await accounts.authenticate({ username: "Alice", password: "alice-password" })).toEqual(alice);
  expect(await accounts.authenticate({ username: "Bob", password: "bob-password" })).toEqual(bob);
  expect(await accounts._byUsername({ username: "Alice" })).toEqual([alice]);
  for (const username of ["alice", " Alice ", "missing"]) {
    expect(await accounts._byUsername({ username })).toEqual([]);
  }
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

for (const username of ["Alice", "missing"]) {
  test(`refused authentication for ${username} preserves accounts`, async () => {
    await accounts.register({ username: "Alice", password: "correct-password" });
    const stored = db.collection("passwordAuthenticating.users");
    const before = await stored.find().toArray();
    await expect(accounts.authenticate({ username, password: "incorrect-password" }))
      .rejects.toBeInstanceOf(InvalidCredentials);
    expect(await stored.find().toArray()).toEqual(before);
  });
}

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
  test(`rejects ${label} without inserting an account`, async () => {
    await expect(
      accounts.register({ username, password })
    ).rejects.toBeInstanceOf(InvalidRegistration);
    expect(await db.collection("passwordAuthenticating.users").countDocuments()).toBe(0);
  });
}

test("simultaneous registrations of one username yield one account and one domain refusal", async () => {
  const credentials = { username: "same-user", password: "test-password" };
  const results = await Promise.allSettled([
    accounts.register(credentials), accounts.register(credentials),
  ]);
  const successes = results.filter((result) => result.status === "fulfilled");
  const failures = results.filter((result) => result.status === "rejected");
  expect(successes).toHaveLength(1);
  expect(failures).toHaveLength(1);
  expect(failures[0]!.reason).toBeInstanceOf(UsernameTaken);
  expect(await accounts.authenticate(credentials)).toEqual(successes[0]!.value);
  expect(await db.collection("passwordAuthenticating.users").countDocuments()).toBe(1);
});
