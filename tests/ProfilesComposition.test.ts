import { RecipeImportingConcept } from "../src/concepts/RecipeImporting.ts";
import { ProfilingConcept } from "../src/concepts/Profiling.ts";
import { expect, test } from "bun:test";
import { testDatabase } from "./helpers/database.ts";
import { assemble } from "@mit-sdg/sync-engine/assembly";
import { applicationConceptSet } from "../src/concepts.ts";
import { PasswordAuthenticatingConcept } from "../src/concepts/PasswordAuthenticating.ts";
import { SessioningConcept } from "../src/concepts/Sessioning.ts";
import { RecipeRecordingConcept } from "../src/concepts/RecipeRecording.ts";
import { CollectingConcept } from "../src/concepts/Collecting.ts";
import { CookingLogConcept } from "../src/concepts/CookingLog.ts";
import { SavingConcept } from "../src/concepts/Saving.ts";
import { SharingConcept } from "../src/concepts/Sharing.ts";
import { composition as Accounts } from "../src/compositions/Accounts.ts";
import { composition as Collections } from "../src/compositions/Collections.ts";
import { composition as Recipes } from "../src/compositions/Recipes.ts";
import { composition as Shared } from "../src/compositions/Shared.ts";
import type { BatchWire } from "../generated/wire.ts";
import { composition as Profiles } from "../src/compositions/Profiles.ts";
import { createGateway } from "@mit-sdg/sync-engine/boundary";
import { createHttpHandler } from "@mit-sdg/sync-engine-http/handler";
import { policy } from "../src/http-policy.ts";

const db = testDatabase("profiles", () => app.whenIdle());
const sessions = new SessioningConcept(db);
const recording = new RecipeRecordingConcept(db);
const collecting = new CollectingConcept(db);
const cooking = new CookingLogConcept(db);
const saving = new SavingConcept(db);
const sharing = new SharingConcept(db);
const recipeSharing = new SharingConcept(db, "recipeSharing.resources");
const profiling = new ProfilingConcept(db);
const app = assemble({
  conceptSet: applicationConceptSet,
  instances: {
    RecipeImporting: new RecipeImportingConcept(),
    Profiling: profiling,
    PasswordAuthenticating: new PasswordAuthenticatingConcept(db),
    Sessioning: sessions,
    RecipeRecording: recording,
    Collecting: collecting,
    CookingLog: cooking,
    Saving: saving,
    Sharing: sharing,
    RecipeSharing: recipeSharing,
  },
  composition: { Accounts, Collections, Recipes, Shared, Profiles },
});

async function call<T = unknown>(path: string, input: Record<string, unknown>): Promise<T> {
  const result = await app.invoker.invoke(path, input, { timeoutMs: 2000 });
  if (!result.ok) throw new Error(JSON.stringify(result.error));
  return result.value as T;
}

async function refuses(path: string, input: Record<string, unknown>, error: string) {
  expect(await app.invoker.invoke(path, input, { timeoutMs: 2000 })).toEqual({
    ok: false, error: { kind: "domain", value: error },
  });
}

async function account(label: string) {
  const username = `${label}-${crypto.randomUUID()}`;
  const { user } = await call<{ user: string }>("/accounts/register", {
    username, password: "test-password",
  });
  const { session } = await sessions.start({ user });
  return { user, username, session };
}

const details = { displayName: "Hunnaid", bio: "I cook biryani", picture: "" };

test("existing accounts get username defaults without creating a profile or exposing credentials", async () => {
  const owner = await account("owner");
  const viewer = await account("viewer");
  const expected = { identity: { user: owner.user, username: owner.username, profile: { displayName: null, bio: null, picture: null } } };
  expect(await call<unknown>("/profiles/me", { session: owner.session })).toEqual(expected);
  expect(await call<unknown>("/profiles/get", { session: viewer.session, user: owner.user })).toEqual(expected);
  expect(await profiling._get({ user: owner.user })).toEqual([]);
  expect(await call<unknown>("/profiles/get", { session: viewer.session, user: "missing" }))
    .toEqual({ identity: null });
});

test("saving creates then updates only the session user's profile even with a forged user field", async () => {
  const owner = await account("owner");
  const other = await account("other");
  await call("/profiles/save", { session: other.session, ...details, displayName: "Other" });
  const otherBefore = await profiling._get({ user: other.user });
  for (const displayName of ["First name", "Updated name"]) {
    const profile = { ...details, displayName };
    expect(await call<unknown>("/profiles/save", { session: owner.session, user: other.user, ...profile }))
      .toEqual({ identity: { user: owner.user, username: owner.username, profile } });
    expect(await profiling._get({ user: other.user })).toEqual(otherBefore);
  }
});

test("all profile endpoints require sessions and refused saves leave profiles unchanged", async () => {
  const owner = await account("owner");
  await call("/profiles/save", { session: owner.session, ...details });
  const before = await profiling._get({ user: owner.user });
  for (const path of ["/profiles/me", "/profiles/get", "/profiles/save"]) {
    await refuses(path, { session: null, user: owner.user, ...details }, "INVALID_SESSION");
  }
  await refuses("/profiles/save", { session: owner.session, ...details, displayName: " " }, "INVALID_PROFILE");
  expect(await app.invoker.invoke("/profiles/save", { session: owner.session, ...details, picture: 123 }, { timeoutMs: 2000 }))
    .toMatchObject({ ok: false, error: { kind: "framework", code: "INVALID_INPUT" } });
  expect(await profiling._get({ user: owner.user })).toEqual(before);
});

test("updated profiles identify old cooking entries through every recipe access path without rewriting them", async () => {
  const owner = await account("owner");
  const viewer = await account("viewer");
  const { collection } = await call<{ collection: string }>("/collections/create", { session: owner.session, name: "Family" });
  const { recipe } = await call<{ recipe: string }>("/recipes/save", {
    session: owner.session, collection, title: "Rice", ingredients: ["Rice"], instructions: ["Cook"],
  });
  await call("/collections/share", { session: owner.session, collection, username: viewer.username });
  await call("/recipes/share", { session: owner.session, recipe, username: viewer.username });
  const { entry } = await call<{ entry: string }>("/entries/add-personal", {
    session: owner.session, recipe, changes: "Less water", result: "Good",
  });
  const before = await cooking._get({ entry });
  for (const displayName of ["Hunnaid", "New name"]) {
    await call("/profiles/save", { session: owner.session, ...details, displayName });
    for (const [path, session] of [["/recipes/get-personal", owner.session], ["/recipes/get", viewer.session], ["/recipes/get-shared", viewer.session]]) {
      const result = await call<{ recipe: { entries: { author: string }[] } }>(path!, { session, collection, recipe });
      const author = result.recipe.entries[0]!.author;
      const identity = await call<BatchWire["/profiles/get"]["output"]>("/profiles/get", { session, user: author });
      expect(identity.identity?.profile?.displayName).toBe(displayName);
    }
    expect(await cooking._get({ entry })).toEqual(before);
  }
});

test("HTTP upload, replacement and removal persist pictures across concept instances and keep the login name", async () => {
  const owner = await account("owner");
  const viewer = await account("viewer");
  const gateway = createGateway({ application: app });
  const handler = createHttpHandler({ application: app, gateway, policy });
  const upload = async (picture: string, authenticated = true) => handler(new Request(
    new URL("/api/profiles/save", policy.publicOrigin), {
      method: "POST",
      headers: { "Content-Type": "application/json", ...(authenticated ? { Cookie: `__Host-batch-session=${owner.session}` } : {}) },
      body: JSON.stringify({ ...details, picture }),
    }
  ));
  expect((await upload("", false)).status).toBe(401);
  for (const [extension, mime] of [["png", "png"], ["jpg", "jpeg"]]) {
    const bytes = await Bun.file(new URL(`./fixtures/avatar.${extension}`, import.meta.url)).arrayBuffer();
    const picture = `data:image/${mime};base64,${Buffer.from(bytes).toString("base64")}`;
    const response = await upload(picture);
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ identity: { user: owner.user, username: owner.username, profile: { ...details, picture } } });
    expect(await new ProfilingConcept(db)._get({ user: owner.user })).toEqual([{ ...details, picture }]);
    const read = await call<BatchWire["/profiles/get"]["output"]>("/profiles/get", { session: viewer.session, user: owner.user });
    expect(read.identity?.profile?.picture).toBe(picture);
  }
  const before = await profiling._get({ user: owner.user });
  expect((await upload("data:image/svg+xml;base64,PHN2Zz4=" )).status).toBe(400);
  expect(await profiling._get({ user: owner.user })).toEqual(before);
  expect((await upload("")).status).toBe(200);
  expect(await profiling._get({ user: owner.user })).toEqual([details]);
  expect(await sessions.resolve({ session: owner.session })).toEqual({ user: owner.user });
  await gateway.whenIdle();
});
