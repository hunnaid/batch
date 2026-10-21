import { afterEach, expect, setSystemTime, test } from "bun:test";
import { testDatabase } from "./helpers/database.ts";
import { InvalidSession, SessioningConcept } from "../src/concepts/Sessioning.ts";

const db = testDatabase("sessioning");
const sessions = new SessioningConcept(db);
const lifetime = 7 * 24 * 60 * 60 * 1000;
const now = new Date("2026-01-01T00:00:00.000Z");
afterEach(() => setSystemTime());

test("sessions expire at exactly seven days and resolving does not extend their lifetime", async () => {
  setSystemTime(now);
  const { session, expiresAt } = await sessions.start({ user: "alice" });
  expect(expiresAt).toEqual(new Date(now.getTime() + lifetime));
  expect(await sessions.resolve({ session })).toEqual({ user: "alice" });

  setSystemTime(expiresAt.getTime() - 1);
  expect(await sessions.resolve({ session })).toEqual({ user: "alice" });
  // A second user's newer session must remain valid at the first's boundary.
  const newer = await sessions.start({ user: "bob" });
  const stored = db.collection("sessioning.sessions");
  const before = await stored.find().sort({ _id: 1 }).toArray();
  for (const time of [expiresAt.getTime(), expiresAt.getTime() + 1]) {
    setSystemTime(time);
    await expect(sessions.resolve({ session })).rejects.toBeInstanceOf(InvalidSession);
    expect(await sessions.resolve({ session: newer.session })).toEqual({ user: "bob" });
    expect(await stored.find().sort({ _id: 1 }).toArray()).toEqual(before);
  }
});

test("ending a session is idempotent and preserves other logins and users", async () => {
  const first = await sessions.start({ user: "alice" });
  const second = await sessions.start({ user: "alice" });
  const other = await sessions.start({ user: "bob" });
  expect(new Set([first.session, second.session, other.session]).size).toBe(3);
  for (const session of [first.session, first.session, "never-existed"]) {
    expect(await sessions.end({ session })).toEqual({});
    await expect(sessions.resolve({ session })).rejects.toBeInstanceOf(InvalidSession);
    expect(await sessions.resolve({ session: second.session })).toEqual({ user: "alice" });
    expect(await sessions.resolve({ session: other.session })).toEqual({ user: "bob" });
  }
});
