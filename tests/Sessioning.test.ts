import { afterAll, beforeAll, expect, test } from "bun:test";
import { MongoClient } from "mongodb";
import {
  InvalidSession,
  SessioningConcept,
} from "../src/concepts/Sessioning.ts";

/** Keep session tests separate from application data. */
const url = process.env.MONGODB_URL;

if (!url) {
  throw new Error("MONGODB_URL is required to run these tests.");
}

const client = new MongoClient(url, {
  serverSelectionTimeoutMS: 3000,
});

const db = client.db(
  `batch_test_sessioning_${crypto.randomUUID().replaceAll("-", "")}`
);

const sessions = new SessioningConcept(db);
let connected = false;

beforeAll(async () => {
  await client.connect();
  connected = true;
});

// Remove only this run's temporary database and close the connection.
afterAll(async () => {
  try {
    if (connected) {
      await db.dropDatabase();
    }
  } finally {
    await client.close();
  }
});

test("a new session resolves to its user", async () => {
  const { session } = await sessions.start({ user: "user-1" });

  expect(session.length).toBeGreaterThan(0);
  expect(await sessions.resolve({ session })).toEqual({
    user: "user-1",
  });
});

test("a session expires seven days after creation", async () => {
  const lifetime = 7 * 24 * 60 * 60 * 1000;
  const before = Date.now();
  const { expiresAt } = await sessions.start({ user: "user-1" });
  const after = Date.now();

  expect(expiresAt).toBeInstanceOf(Date);
  expect(expiresAt.getTime()).toBeGreaterThanOrEqual(before + lifetime);
  expect(expiresAt.getTime()).toBeLessThanOrEqual(after + lifetime);
});

test("different logins receive distinct session tokens", async () => {
  const first = await sessions.start({ user: "user-1" });
  const second = await sessions.start({ user: "user-1" });

  expect(first.session).not.toBe(second.session);

  expect(
    await sessions.resolve({ session: first.session })
  ).toEqual({ user: "user-1" });

  expect(
    await sessions.resolve({ session: second.session })
  ).toEqual({ user: "user-1" });
});

test("sessions retain the correct user identity", async () => {
  const first = await sessions.start({ user: "user-1" });
  const second = await sessions.start({ user: "user-2" });

  expect(
    await sessions.resolve({ session: first.session })
  ).toEqual({ user: "user-1" });

  expect(
    await sessions.resolve({ session: second.session })
  ).toEqual({ user: "user-2" });
});

test("an unknown session is refused", async () => {
  await expect(
    sessions.resolve({ session: crypto.randomUUID() })
  ).rejects.toBeInstanceOf(InvalidSession);
});

test("an expired session is refused even when still stored", async () => {
  const { session } = await sessions.start({ user: "user-1" });

  // Set up expiration directly instead of waiting seven days.
  // This collection handle is used only to arrange the test fixture.
  const storedSessions = db.collection<{
    _id: string;
    user: string;
    expiresAt: Date;
  }>("sessioning.sessions");

  const update = await storedSessions.updateOne(
    { _id: session },
    { $set: { expiresAt: new Date(Date.now() - 1000) } }
  );

  expect(update.matchedCount).toBe(1);

  await expect(
    sessions.resolve({ session })
  ).rejects.toBeInstanceOf(InvalidSession);
});

test("ending a session prevents further use", async () => {
  const { session } = await sessions.start({ user: "user-1" });

  expect(await sessions.end({ session })).toEqual({});

  await expect(
    sessions.resolve({ session })
  ).rejects.toBeInstanceOf(InvalidSession);
});

test("ending one session preserves another session for the same user", async () => {
  const first = await sessions.start({ user: "user-1" });
  const second = await sessions.start({ user: "user-1" });

  await sessions.end({ session: first.session });

  await expect(
    sessions.resolve({ session: first.session })
  ).rejects.toBeInstanceOf(InvalidSession);

  expect(
    await sessions.resolve({ session: second.session })
  ).toEqual({ user: "user-1" });
});

test("ending an already ended or unknown session succeeds", async () => {
  const { session } = await sessions.start({ user: "user-1" });

  await sessions.end({ session });

  expect(await sessions.end({ session })).toEqual({});
  expect(
    await sessions.end({ session: crypto.randomUUID() })
  ).toEqual({});
});
