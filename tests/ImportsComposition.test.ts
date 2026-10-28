import { beforeEach, expect, test } from "bun:test";
import { assemble } from "@mit-sdg/sync-engine/assembly";
import { createGateway } from "@mit-sdg/sync-engine/boundary";
import { createHttpHandler } from "@mit-sdg/sync-engine-http/handler";
import { testDatabase } from "./helpers/database.ts";
import { applicationConceptSet } from "../src/concepts.ts";
import { policy } from "../src/http-policy.ts";
import { RecipeRecordingConcept } from "../src/concepts/RecipeRecording.ts";
import { PasswordAuthenticatingConcept } from "../src/concepts/PasswordAuthenticating.ts";
import { SessioningConcept } from "../src/concepts/Sessioning.ts";
import { CollectingConcept } from "../src/concepts/Collecting.ts";
import { CookingLogConcept } from "../src/concepts/CookingLog.ts";
import { SavingConcept } from "../src/concepts/Saving.ts";
import { SharingConcept } from "../src/concepts/Sharing.ts";
import { ProfilingConcept } from "../src/concepts/Profiling.ts";
import { RecipeImportingConcept, NoRecipeFound, RecipeImportUnavailable, RecipeImportBusy } from "../src/concepts/RecipeImporting.ts";
import type { ImportedRecipeDraft } from "../src/recipe-import.ts";
import { composition as Accounts } from "../src/compositions/Accounts.ts";
import { composition as Collections } from "../src/compositions/Collections.ts";
import { composition as Recipes } from "../src/compositions/Recipes.ts";
import { composition as Shared } from "../src/compositions/Shared.ts";
import { composition as Imports } from "../src/compositions/Imports.ts";

const db = testDatabase("imports", () => app.whenIdle());
const sessions = new SessioningConcept(db);
const recording = new RecipeRecordingConcept(db);
const collecting = new CollectingConcept(db);
const cooking = new CookingLogConcept(db);
const saving = new SavingConcept(db);
const sharing = new SharingConcept(db);
const recipeSharing = new SharingConcept(db, "recipeSharing.resources");
const calls: string[] = [];
const textCalls: string[] = [];
let failure: Error | null = null;
const extracted = {
  foundRecipe: true, title: "Website cake", description: "A cake.", notes: "Cool before icing.",
  ingredients: [{ heading: "Cake", items: ["Flour", "Cocoa"] }, { heading: "Icing", items: ["Butter", "Sugar"] }],
  instructions: [{ heading: "Cake", items: ["Mix.", "Bake."] }, { heading: "Icing", items: ["Beat.", "Spread."] }],
};
const app = assemble({
  conceptSet: applicationConceptSet,
  instances: {
    RecipeImporting: new RecipeImportingConcept(async (url) => {
      calls.push(url);
      if (failure) throw failure;
      return extracted;
    }, async (text) => {
      textCalls.push(text);
      if (failure) throw failure;
      return { ...extracted, source: "https://invented.example.com", owner: "invented" };
    }),
    Profiling: new ProfilingConcept(db), PasswordAuthenticating: new PasswordAuthenticatingConcept(db),
    RecipeRecording: recording, Sessioning: sessions, Collecting: collecting, CookingLog: cooking,
    Saving: saving, Sharing: sharing, RecipeSharing: recipeSharing,
  },
  composition: { Accounts, Collections, Recipes, Shared, Imports },
});
const gateway = createGateway({ application: app });
const handler = createHttpHandler({ application: app, gateway, policy });
beforeEach(() => { calls.length = 0; textCalls.length = 0; failure = null; });

async function call<T = unknown>(path: string, input: Record<string, unknown>): Promise<T> {
  const result = await app.invoker.invoke(path, input, { timeoutMs: 2000 });
  if (!result.ok) throw new Error(JSON.stringify(result.error));
  return result.value as T;
}
async function account(label: string) {
  const username = `${label}-${crypto.randomUUID()}`;
  const { user } = await call<{ user: string }>("/accounts/register", { username, password: "test-password" });
  const { session } = await sessions.start({ user });
  return { username, user, session };
}
function post(path: string, input: unknown, session?: string, origin = policy.publicOrigin) {
  return handler(new Request(new URL(`/api${path}`, policy.publicOrigin), {
    method: "POST", headers: { "Content-Type": "application/json", Origin: origin!,
      ...(session ? { Cookie: `__Host-batch-session=${session}` } : {}) },
    body: JSON.stringify(input),
  }));
}
async function storedState() {
  const names = ["recipeRecording.recipes", "cookingLog.entries", "saving.items", "collecting.collections",
    "sharing.resources", "recipeSharing.resources", "profiling.profiles", "passwordAuthenticating.users", "sessioning.sessions"];
  return Promise.all(names.map((name) => db.collection(name).find().sort({ _id: 1 }).toArray()));
}
const url = "https://recipes.example.com/cake";
const pasted = "Website cake\nIngredients\nFlour\nCocoa\nInstructions\nMix.\nBake.";

test("personal import returns an editable draft without saving, then reviewed saving retains normal ownership and sharing", async () => {
  const owner = await account("owner");
  const member = await account("member");
  const { recipe: existing } = await call<{ recipe: string }>("/recipes/save-personal", {
    session: owner.session, title: "Keep this", ingredients: ["Rice"], instructions: ["Cook."],
  });
  await call("/entries/add-personal", { session: owner.session, recipe: existing, changes: "Keep", result: "Good" });
  const before = await storedState();
  const response = await post("/recipes/import-personal", { url: `${url}#recipe` }, owner.session);
  expect(response.status).toBe(200);
  const { draft } = await response.json() as { draft: ImportedRecipeDraft };
  expect(draft).toEqual({ title: extracted.title, source: url, ingredients: extracted.ingredients,
    instructions: extracted.instructions, description: extracted.description, notes: extracted.notes });
  expect(draft).not.toHaveProperty("recipe");
  expect(await storedState()).toEqual(before);
  const reviewed = { ...draft, title: "My reviewed cake", ingredients: [{ heading: "Cake", items: ["Less cocoa", "Flour"] }] };
  const saved = await post("/recipes/save-personal", reviewed, owner.session);
  expect(saved.status).toBe(200);
  const { recipe } = await saved.json() as { recipe: string };
  expect(await recording._get({ recipe })).toEqual([reviewed]);
  expect(await recipeSharing._get({ resource: recipe })).toEqual([{ owner: owner.user }]);
  expect((await saving._forUser({ user: owner.user })).map((item) => item.item)).toContain(recipe);
  expect(await saving._forUser({ user: member.user })).toEqual([]);
  await call("/recipes/share", { session: owner.session, recipe, username: member.username });
  expect(await call<unknown>("/recipes/get-shared", { session: member.session, recipe }))
    .toEqual({ recipe: { recipe, ...reviewed, entries: [] } });
  expect(await cooking._forRecipe({ recipe: existing })).toHaveLength(1);
  expect((await recording._get({ recipe: existing }))[0]?.title).toBe("Keep this");
  expect(calls).toEqual([url]);
});

test("pasted personal imports stay unsaved until review and retain normal recipe ownership and sharing", async () => {
  const owner = await account("owner");
  const member = await account("member");
  const before = await storedState();
  const response = await post("/recipes/import-text-personal", { text: pasted }, owner.session);
  expect(response.status).toBe(200);
  const { draft } = await response.json() as { draft: ImportedRecipeDraft };
  expect(draft).toEqual({ title: extracted.title, source: "", ingredients: extracted.ingredients,
    instructions: extracted.instructions, description: extracted.description, notes: extracted.notes });
  expect(await storedState()).toEqual(before);
  expect(calls).toEqual([]);
  expect(textCalls).toEqual([pasted]);
  const reviewed = { ...draft, title: "Reviewed pasted cake", source: url, notes: "My own notes." };
  const saved = await post("/recipes/save-personal", reviewed, owner.session);
  expect(saved.status).toBe(200);
  const { recipe } = await saved.json() as { recipe: string };
  expect(await recording._get({ recipe })).toEqual([reviewed]);
  expect(await recipeSharing._get({ resource: recipe })).toEqual([{ owner: owner.user }]);
  expect((await saving._forUser({ user: owner.user })).map((item) => item.item)).toEqual([recipe]);
  expect(await saving._forUser({ user: member.user })).toEqual([]);
  await call("/recipes/share", { session: owner.session, recipe, username: member.username });
  expect(await call<unknown>("/recipes/get-shared", { session: member.session, recipe }))
    .toEqual({ recipe: { recipe, ...reviewed, entries: [] } });
});

for (const [role, path] of [
  ["owner", "/recipes/import"], ["member", "/recipes/import"],
  ["owner", "/recipes/import-text"], ["member", "/recipes/import-text"],
] as const) {
  test(`${role} uses ${path} without saving until review and remains the recipe creator`, async () => {
    const owner = await account("owner");
    const member = await account("member");
    const actor = role === "owner" ? owner : member;
    const other = role === "owner" ? member : owner;
    const { collection } = await call<{ collection: string }>("/collections/create", { session: owner.session, name: "Destination" });
    const { collection: unrelated } = await call<{ collection: string }>("/collections/create", { session: owner.session, name: "Other" });
    await call("/collections/share", { session: owner.session, collection, username: member.username });
    const before = await storedState();
    const response = await post(path, { collection, url, text: pasted }, actor.session);
    expect(response.status).toBe(200);
    const { draft } = await response.json() as { draft: ImportedRecipeDraft };
    expect(draft.source).toBe(path === "/recipes/import" ? url : "");
    expect(await storedState()).toEqual(before);
    const reviewed = { ...draft, title: "Reviewed collection recipe", notes: "My own note." };
    const saved = await post("/recipes/save", { collection, ...reviewed }, actor.session);
    expect(saved.status).toBe(200);
    const { recipe } = await saved.json() as { recipe: string };
    expect(await recipeSharing._get({ resource: recipe })).toEqual([{ owner: actor.user }]);
    expect((await saving._forUser({ user: actor.user })).map((item) => item.item)).toEqual([recipe]);
    expect(await saving._forUser({ user: other.user })).toEqual([]);
    expect((await collecting._get({ collection }))[0]?.items).toEqual([recipe]);
    expect((await collecting._get({ collection: unrelated }))[0]?.items).toEqual([]);
    expect(await call<unknown>("/recipes/get", { session: other.session, collection, recipe }))
      .toEqual({ recipe: { recipe, ...reviewed, entries: [] } });
  });
}

test("sessions, collection permissions, URL validation and request origins are checked before extraction", async () => {
  const owner = await account("owner");
  const outsider = await account("outsider");
  const { collection } = await call<{ collection: string }>("/collections/create", { session: owner.session, name: "Private" });
  const before = await storedState();
  for (const path of ["/recipes/import", "/recipes/import-personal", "/recipes/import-text", "/recipes/import-text-personal"]) {
    const input = { url, text: pasted, collection };
    const anonymous = await post(path, { ...input, session: owner.session, user: owner.user });
    expect(anonymous.status).toBe(401);
    expect((await post(path, input, owner.session, "https://other.example.com")).status).toBe(403);
    const field = path.includes("-text") ? "text" : "url";
    expect((await post(path, { ...input, [field]: 123 }, owner.session)).status).toBe(400);
    expect((await post(path, { ...input, [field]: field === "text" ? " \n " : "http://127.0.0.1/recipe" }, owner.session)).status).toBe(400);
  }
  expect((await post("/recipes/import", { collection, url }, outsider.session)).status).toBe(403);
  expect((await post("/recipes/import", { collection: "missing", url }, owner.session)).status).toBe(403);
  expect((await post("/recipes/import-text", { collection, text: pasted }, outsider.session)).status).toBe(403);
  expect((await post("/recipes/import-text", { collection: "missing", text: pasted }, owner.session)).status).toBe(403);
  expect((await post("/recipes/import-text-personal", { text: "x".repeat(100_001) }, owner.session)).status).toBe(400);
  expect(calls).toEqual([]);
  expect(textCalls).toEqual([]);
  expect(await storedState()).toEqual(before);
});

test("inaccessible pages and provider failures return safe errors without changing records", async () => {
  const owner = await account("owner");
  const before = await storedState();
  for (const [cause, status, code] of [
    [new NoRecipeFound("private details"), 404, "NOT_FOUND"],
    [new RecipeImportBusy("private details"), 409, "CONFLICT"],
    [new RecipeImportUnavailable("private API key details"), 500, "INTERNAL_ERROR"],
  ] as const) {
    failure = cause;
    for (const path of ["/recipes/import-personal", "/recipes/import-text-personal"]) {
      const response = await post(path, { url, text: pasted }, owner.session);
      expect(response.status).toBe(status);
      expect(await response.json()).toEqual({ error: code });
      expect(await storedState()).toEqual(before);
    }
  }
});

for (const path of ["/recipes/import", "/recipes/import-text"]) {
test(`${path} does not bypass collection access when the user later saves`, async () => {
  const owner = await account("owner");
  const member = await account("member");
  const { collection } = await call<{ collection: string }>("/collections/create", { session: owner.session, name: "Family" });
  await call("/collections/share", { session: owner.session, collection, username: member.username });
  const response = await post(path, { collection, url, text: pasted }, member.session);
  expect(response.status).toBe(200);
  const { draft } = await response.json() as { draft: ImportedRecipeDraft };
  await call("/collections/revoke", { session: owner.session, collection, username: member.username });
  const before = await storedState();
  expect((await post("/recipes/save", { collection, ...draft }, member.session)).status).toBe(403);
  expect(await storedState()).toEqual(before);
});
}
