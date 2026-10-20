import { afterAll, beforeAll, beforeEach, expect, test } from "bun:test";
import { MongoClient } from "mongodb";
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

const url = process.env.MONGODB_URL;
if (!url) throw new Error("MONGODB_URL is required to run these tests.");
const client = new MongoClient(url, { serverSelectionTimeoutMS: 3000 });
const db = client.db(`batch_test_shared_${crypto.randomUUID().replaceAll("-", "")}`);
const sessions = new SessioningConcept(db);
const recording = new RecipeRecordingConcept(db);
const collecting = new CollectingConcept(db);
const cooking = new CookingLogConcept(db);
const saving = new SavingConcept(db);
const sharing = new SharingConcept(db);
const recipeSharing = new SharingConcept(db, "recipeSharing.resources");
const app = assemble({
  conceptSet: applicationConceptSet,
  instances: {
    PasswordAuthenticating: new PasswordAuthenticatingConcept(db),
    Sessioning: sessions,
    RecipeRecording: recording,
    Collecting: collecting,
    CookingLog: cooking,
    Saving: saving,
    Sharing: sharing,
    RecipeSharing: recipeSharing,
  },
  composition: { Accounts, Collections, Recipes, Shared },
});

let connected = false;
beforeAll(async () => { await client.connect(); connected = true; });
beforeEach(async () => { await app.whenIdle(); await db.dropDatabase(); });
afterAll(async () => {
  try {
    await app.whenIdle();
    if (connected) await db.dropDatabase();
  } finally {
    await client.close();
  }
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

const recipeData = {
  title: "Simple Rice", ingredients: ["Rice", "Water"],
  instructions: ["Cook the rice."], source: "My notes",
};

async function fixture() {
  const owner = await account("owner");
  const member = await account("member");
  const outsider = await account("outsider");
  const { recipe } = await call<{ recipe: string }>("/recipes/save-personal", {
    session: owner.session, ...recipeData,
  });
  return { owner, member, outsider, recipe };
}

async function list(session: string) {
  return call<BatchWire["/shared/list"]["output"]>("/shared/list", { session });
}

async function state(f: Awaited<ReturnType<typeof fixture>>) {
  return {
    owner: await recipeSharing._get({ resource: f.recipe }),
    ownerShared: await recipeSharing._shared({ user: f.owner.user }),
    memberShared: await recipeSharing._shared({ user: f.member.user }),
    outsiderShared: await recipeSharing._shared({ user: f.outsider.user }),
    recipe: await recording._get({ recipe: f.recipe }),
    entries: await cooking._forRecipe({ recipe: f.recipe }),
    ownerSaves: await saving._forUser({ user: f.owner.user }),
    memberSaves: await saving._forUser({ user: f.member.user }),
  };
}

test("shared overview separates collections from direct recipes and excludes private and unrelated items", async () => {
  const f = await fixture();
  const { collection } = await call<{ collection: string }>("/collections/create", {
    session: f.owner.session, name: "Family Recipes",
  });
  const { recipe: collectionOnly } = await call<{ recipe: string }>("/recipes/save", {
    session: f.owner.session, collection, ...recipeData, title: "Collection Only",
  });
  await call("/collections/create", { session: f.owner.session, name: "Private Collection" });
  expect(await list(f.owner.session)).toEqual({ overview: { collections: [], recipes: [] } });

  await call("/collections/share", {
    session: f.owner.session, collection, username: f.member.username,
  });
  await call("/recipes/share", {
    session: f.owner.session, recipe: f.recipe, username: f.member.username,
  });

  const expected = { overview: {
    collections: [{ collection, owner: f.owner.user, name: "Family Recipes",
      recipes: [{ recipe: collectionOnly, title: "Collection Only" }] }],
    recipes: [{ recipe: f.recipe, owner: f.owner.user, title: recipeData.title }],
  } };
  expect(await list(f.owner.session)).toEqual(expected);
  expect(await list(f.member.session)).toEqual(expected);
  expect(await list(f.outsider.session)).toEqual({ overview: { collections: [], recipes: [] } });
  expect(await call<unknown>("/recipes/mine", { session: f.member.session }))
    .toEqual({ overview: { recipes: [] } });

  // A direct recipe can also belong to collections without duplicate direct rows.
  await call("/recipes/add-personal-to-collection", {
    session: f.owner.session, recipe: f.recipe, destinationCollection: collection,
  });
  expect((await list(f.member.session)).overview.recipes).toEqual(expected.overview.recipes);
  expect(await call<unknown>("/recipes/sharing-status", {
    session: f.owner.session, recipe: f.recipe,
  })).toEqual({ canManage: true });
  expect(await call<unknown>("/recipes/sharing-status", {
    session: f.member.session, recipe: f.recipe,
  })).toEqual({ canManage: false });

  // Both sections can simultaneously contain incoming and outgoing sharing.
  const { collection: incomingCollection } = await call<{ collection: string }>("/collections/create", {
    session: f.member.session, name: "Friend's Collection",
  });
  const { recipe: incomingRecipe } = await call<{ recipe: string }>("/recipes/save-personal", {
    session: f.member.session, ...recipeData, title: "Friend's Recipe",
  });
  await call("/collections/share", {
    session: f.member.session, collection: incomingCollection, username: f.owner.username,
  });
  await call("/recipes/share", {
    session: f.member.session, recipe: incomingRecipe, username: f.owner.username,
  });
  const mixed = (await list(f.owner.session)).overview;
  expect(mixed.collections).toHaveLength(2);
  expect(mixed.collections.map(({ collection, owner }) => ({ collection, owner })))
    .toEqual(expect.arrayContaining([
      { collection, owner: f.owner.user },
      { collection: incomingCollection, owner: f.member.user },
    ]));
  expect(mixed.recipes).toHaveLength(2);
  expect(mixed.recipes).toEqual(expect.arrayContaining([
    { recipe: f.recipe, title: recipeData.title, owner: f.owner.user },
    { recipe: incomingRecipe, title: "Friend's Recipe", owner: f.member.user },
  ]));
});

test("direct members read shared history and edit only their own entries on the correct recipe", async () => {
  const f = await fixture();
  await call("/recipes/share", {
    session: f.owner.session, recipe: f.recipe, username: f.member.username,
  });
  expect(await call<unknown>("/recipes/get-shared", {
    session: f.member.session, recipe: f.recipe,
  })).toEqual({ recipe: { recipe: f.recipe, ...recipeData, entries: [] } });
  const { entry } = await call<{ entry: string }>("/entries/add-shared", {
    session: f.member.session, recipe: f.recipe, changes: "Less water.", result: "",
  });
  const before = await cooking._get({ entry });
  await call("/entries/edit-shared", {
    session: f.member.session, recipe: f.recipe, entry, changes: "Less water.", result: "Firmer rice.",
  });
  const edited = before.map((row) => ({ ...row, result: "Firmer rice." }));
  expect(await cooking._get({ entry })).toEqual(edited);
  expect(await call<unknown>("/recipes/get-shared", {
    session: f.member.session, recipe: f.recipe,
  })).toEqual(await call("/recipes/get-personal", { session: f.owner.session, recipe: f.recipe }));

  await refuses("/entries/edit-shared", {
    session: f.owner.session, recipe: f.recipe, entry, changes: "Overwrite", result: "",
  }, "COOKING_ENTRY_NOT_OWNED");
  const { recipe: otherRecipe } = await call<{ recipe: string }>("/recipes/save-personal", {
    session: f.member.session, ...recipeData,
  });
  await refuses("/entries/edit-shared", {
    session: f.member.session, recipe: otherRecipe, entry, changes: "Wrong recipe", result: "",
  }, "ENTRY_NOT_IN_RECIPE");
  expect(await cooking._get({ entry })).toEqual(edited);
});

test("only the recipe creator manages direct sharing, including recipes created in someone else's collection", async () => {
  const f = await fixture();
  const { collection } = await call<{ collection: string }>("/collections/create", {
    session: f.owner.session, name: "Family",
  });
  await call("/collections/share", {
    session: f.owner.session, collection, username: f.member.username,
  });
  const { recipe } = await call<{ recipe: string }>("/recipes/save", {
    session: f.member.session, collection, ...recipeData,
  });
  expect(await recipeSharing._get({ resource: recipe })).toEqual([{ owner: f.member.user }]);
  await refuses("/recipes/share", {
    session: f.owner.session, recipe, username: f.outsider.username,
  }, "OWNER_ACCESS_REQUIRED");
  await call("/recipes/share", {
    session: f.member.session, recipe, username: f.outsider.username,
  });
  expect((await list(f.outsider.session)).overview.recipes)
    .toEqual([{ recipe, title: recipeData.title, owner: f.member.user }]);
});

test("duplicate, invalid and unauthorized sharing requests preserve recipe and access state", async () => {
  const f = await fixture();
  await call("/recipes/share", { session: f.owner.session, recipe: f.recipe, username: f.member.username });
  const before = await state(f);
  for (const [session, username, expected] of [
    [f.owner.session, f.member.username, "MEMBER_ALREADY_ADDED"],
    [f.owner.session, f.owner.username, "CANNOT_GRANT_OWNER"],
    [f.owner.session, "unknown-user", "RECIPIENT_NOT_FOUND"],
    [f.member.session, f.outsider.username, "OWNER_ACCESS_REQUIRED"],
    [f.outsider.session, f.member.username, "OWNER_ACCESS_REQUIRED"],
  ]) {
    await refuses("/recipes/share", { session, recipe: f.recipe, username }, expected!);
    expect(await state(f)).toEqual(before);
  }
  await refuses("/recipes/revoke", {
    session: f.member.session, recipe: f.recipe, username: f.owner.username,
  }, "OWNER_ACCESS_REQUIRED");
  await refuses("/recipes/revoke", {
    session: f.owner.session, recipe: f.recipe, username: f.outsider.username,
  }, "MEMBER_NOT_ADDED");
  await refuses("/recipes/prepare-sharing", { session: f.member.session, recipe: f.recipe }, "ITEM_NOT_SAVED");
  await refuses("/recipes/get-shared", { session: f.outsider.session, recipe: f.recipe }, "ACCESS_DENIED");
  await refuses("/entries/add-shared", {
    session: f.outsider.session, recipe: f.recipe, changes: "Unauthorized", result: "",
  }, "ACCESS_DENIED");
  expect(await state(f)).toEqual(before);
});

test("revoking direct access blocks reads and entries but preserves access through a shared collection", async () => {
  const f = await fixture();
  const { collection } = await call<{ collection: string }>("/collections/create", {
    session: f.owner.session, name: "Family",
  });
  await call("/recipes/add-personal-to-collection", {
    session: f.owner.session, destinationCollection: collection, recipe: f.recipe,
  });
  await call("/collections/share", { session: f.owner.session, collection, username: f.member.username });
  await call("/recipes/share", { session: f.owner.session, recipe: f.recipe, username: f.member.username });
  const { entry } = await call<{ entry: string }>("/entries/add-shared", {
    session: f.member.session, recipe: f.recipe, changes: "Less water", result: "",
  });
  const before = await state(f);
  await call("/recipes/revoke", { session: f.owner.session, recipe: f.recipe, username: f.member.username });

  await refuses("/recipes/get-shared", { session: f.member.session, recipe: f.recipe }, "ACCESS_DENIED");
  for (const path of ["/entries/add-shared", "/entries/edit-shared"]) {
    await refuses(path, { session: f.member.session, recipe: f.recipe, entry,
      changes: "Should fail", result: "" }, "ACCESS_DENIED");
  }
  expect(await state(f)).toEqual({ ...before, ownerShared: [], memberShared: [] });
  expect((await list(f.member.session)).overview.recipes).toEqual([]);
  expect((await list(f.owner.session)).overview.recipes).toEqual([]);
  expect((await list(f.member.session)).overview.collections).toHaveLength(1);
  expect(await call<unknown>("/recipes/get", {
    session: f.member.session, collection, recipe: f.recipe,
  })).toEqual(await call("/recipes/get-personal", { session: f.owner.session, recipe: f.recipe }));

  // Direct ownership survives the final revocation and permits sharing again.
  await call("/recipes/share", { session: f.owner.session, recipe: f.recipe, username: f.member.username });
  expect((await list(f.member.session)).overview.recipes).toHaveLength(1);
  await call("/collections/delete", { session: f.owner.session, collection });
  expect((await list(f.member.session)).overview.collections).toEqual([]);
  expect(await call<unknown>("/recipes/get-shared", {
    session: f.member.session, recipe: f.recipe,
  })).toEqual(await call("/recipes/get-personal", { session: f.owner.session, recipe: f.recipe }));
});

test("legacy personal recipes can prepare ownership without granting access or replacing an owner", async () => {
  const f = await fixture();
  const { recipe } = await recording.record(recipeData);
  await saving.save({ user: f.owner.user, item: recipe });
  const savesBefore = await saving._forUser({ user: f.owner.user });
  expect(await call<unknown>("/recipes/sharing-status", { session: f.owner.session, recipe }))
    .toEqual({ canManage: true });
  await refuses("/recipes/prepare-sharing", { session: f.outsider.session, recipe }, "ITEM_NOT_SAVED");
  expect(await recipeSharing._get({ resource: recipe })).toEqual([]);

  await call("/recipes/prepare-sharing", { session: f.owner.session, recipe });
  await call("/recipes/prepare-sharing", { session: f.owner.session, recipe });
  expect(await recipeSharing._get({ resource: recipe })).toEqual([{ owner: f.owner.user }]);
  expect((await list(f.owner.session)).overview.recipes).toEqual([]);
  expect(await saving._forUser({ user: f.owner.user })).toEqual(savesBefore);
  await call("/recipes/share", { session: f.owner.session, recipe, username: f.member.username });
  expect(await call<unknown>("/recipes/get-shared", { session: f.member.session, recipe }))
    .toEqual({ recipe: { recipe, ...recipeData, entries: [] } });

  // A personal save must never overwrite established direct ownership.
  await saving.save({ user: f.member.user, item: recipe });
  await refuses("/recipes/prepare-sharing", { session: f.member.session, recipe }, "OWNER_ACCESS_REQUIRED");
  expect(await recipeSharing._get({ resource: recipe })).toEqual([{ owner: f.owner.user }]);
});

test("shared endpoints require sessions and validate input without changing state", async () => {
  const f = await fixture();
  const before = await state(f);
  for (const path of ["/shared/list", "/recipes/sharing-status", "/recipes/prepare-sharing",
    "/recipes/share", "/recipes/revoke", "/recipes/get-shared", "/entries/add-shared", "/entries/edit-shared"]) {
    await refuses(path, { session: null, recipe: f.recipe, username: f.member.username,
      entry: "missing", changes: "Change", result: "" }, "INVALID_SESSION");
  }
  expect(await app.invoker.invoke("/recipes/share", {
    session: f.owner.session, recipe: f.recipe, username: 123,
  }, { timeoutMs: 2000 })).toMatchObject({ ok: false, error: { kind: "framework", code: "INVALID_INPUT" } });
  expect(await state(f)).toEqual(before);
});
