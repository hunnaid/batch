import { expect, test } from "bun:test";
import type { Document } from "mongodb";
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

const db = testDatabase("sharedcomposition", () => app.whenIdle());
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
  const historyBefore = await cooking._forRecipe({ recipe: f.recipe });
  await refuses("/entries/add-shared", {
    session: f.member.session, recipe: f.recipe, changes: " ", result: "",
  }, "INVALID_COOKING_ENTRY");
  await refuses("/entries/edit-shared", {
    session: f.member.session, recipe: f.recipe, entry, changes: "", result: " ",
  }, "INVALID_COOKING_ENTRY_EDIT");
  expect(await cooking._forRecipe({ recipe: f.recipe })).toEqual(historyBefore);
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

test("a dangling personal save cannot establish ownership of a nonexistent recipe", async () => {
  const owner = await account("owner");
  const recipe = "never-recorded";
  await saving.save({ user: owner.user, item: recipe });
  const before = await saving._forUser({ user: owner.user });
  expect(await call<{ canManage: boolean }>("/recipes/sharing-status", { session: owner.session, recipe }))
    .toEqual({ canManage: false });
  await refuses("/recipes/prepare-sharing", { session: owner.session, recipe }, "OWNER_ACCESS_REQUIRED");
  expect(await recipeSharing._get({ resource: recipe })).toEqual([]);
  expect(await saving._forUser({ user: owner.user })).toEqual(before);
});

/** Include every affected concept so destructive actions cannot leave hidden references. */
type StoredRecord = Document & { _id: string };

async function deletionState(): Promise<Record<string, StoredRecord[]>> {
  const names = ["recipeRecording.recipes", "cookingLog.entries", "saving.items",
    "collecting.collections", "sharing.resources", "recipeSharing.resources"];
  return Object.fromEntries(await Promise.all(names.map(async (name) =>
    [name, await db.collection<StoredRecord>(name).find().sort({ _id: 1 }).toArray()]
  )));
}

async function deletionFixture() {
  const f = await fixture();
  const { collection: first } = await call<{ collection: string }>("/collections/create", {
    session: f.owner.session, name: "Owner's collection",
  });
  const { collection: second } = await call<{ collection: string }>("/collections/create", {
    session: f.member.session, name: "Member's collection",
  });
  await sharing.grant({ owner: f.owner.user, resource: first, member: f.member.user });
  await sharing.grant({ owner: f.member.user, resource: second, member: f.owner.user });
  await call("/recipes/share", { session: f.owner.session, recipe: f.recipe, username: f.member.username });
  const { recipe: keep } = await call<{ recipe: string }>("/recipes/save-personal", {
    session: f.member.session, ...recipeData, title: "Keep this recipe",
  });
  for (const collection of [first, second]) {
    await collecting.add({ collection, item: f.recipe });
    await collecting.add({ collection, item: keep });
  }
  for (const session of [f.owner.session, f.member.session]) {
    await call("/entries/add-shared", { session, recipe: f.recipe, changes: "An attempt", result: "Good" });
  }
  await cooking.record({ author: f.member.user, recipe: keep, changes: "Keep this history", result: "Good" });
  return { ...f, first, second, keep };
}

test("collection removal preserves personal access, direct sharing, other collections and cooking history", async () => {
  const f = await deletionFixture();
  const before = await deletionState();
  // The collection owner can remove another person's recipe without owning that recipe.
  await call("/recipes/remove-from-collection", {
    session: f.member.session, collection: f.second, recipe: f.recipe,
  });
  const expected = { ...before, "collecting.collections": before["collecting.collections"]!.map(row =>
    row._id === f.second ? { ...row, items: row.items.filter((id: string) => id !== f.recipe) } : row
  ) };
  expect(await deletionState()).toEqual(expected);
  const personal = await call<unknown>("/recipes/get-personal", { session: f.owner.session, recipe: f.recipe });
  expect(await call<unknown>("/recipes/get-shared", { session: f.member.session, recipe: f.recipe })).toEqual(personal);
  expect(await call<unknown>("/recipes/get", { session: f.member.session, collection: f.first, recipe: f.recipe }))
    .toEqual(personal);
  expect(await call<unknown>("/recipes/get", { session: f.member.session, collection: f.second, recipe: f.recipe }))
    .toEqual({ recipe: null });
  await refuses("/recipes/remove-from-collection", {
    session: f.member.session, collection: f.second, recipe: f.recipe,
  }, "ITEM_NOT_COLLECTED");
  expect(await deletionState()).toEqual(expected);
});

test("recipe ownership does not permit removal from someone else's collection", async () => {
  const f = await deletionFixture();
  const before = await deletionState();
  for (const session of [f.owner.session, f.outsider.session]) {
    await refuses("/recipes/remove-from-collection", {
      session, collection: f.second, recipe: f.recipe,
    }, "OWNER_ACCESS_REQUIRED");
    expect(await deletionState()).toEqual(before);
  }
  await refuses("/recipes/remove-from-collection", {
    session: f.member.session, collection: f.second, recipe: "missing",
  }, "ITEM_NOT_COLLECTED");
  expect(await deletionState()).toEqual(before);
});

test("permanent deletion clears every reference and all authors' entries while preserving unrelated data", async () => {
  const f = await deletionFixture();
  // Generic Saving permits more than one saver; all references need cleanup.
  await saving.save({ user: f.member.user, item: f.recipe });
  const before = await deletionState();
  expect(await call<unknown>("/recipes/delete", { session: f.owner.session, recipe: f.recipe }))
    .toEqual({ recipe: f.recipe });
  expect(await deletionState()).toEqual({
    "recipeRecording.recipes": before["recipeRecording.recipes"]!.filter(row => row._id !== f.recipe),
    "cookingLog.entries": before["cookingLog.entries"]!.filter(row => row.recipe !== f.recipe),
    "saving.items": before["saving.items"]!.filter(row => row.item !== f.recipe),
    "collecting.collections": before["collecting.collections"]!.map(row => ({
      ...row, items: row.items.filter((id: string) => id !== f.recipe),
    })),
    "sharing.resources": before["sharing.resources"],
    "recipeSharing.resources": before["recipeSharing.resources"]!.filter(row => row._id !== f.recipe),
  });
  expect((await list(f.owner.session)).overview.recipes).toEqual([]);
  expect((await list(f.member.session)).overview.recipes).toEqual([]);
  await refuses("/recipes/get-personal", { session: f.owner.session, recipe: f.recipe }, "ITEM_NOT_SAVED");
  await refuses("/recipes/get-shared", { session: f.member.session, recipe: f.recipe }, "ACCESS_DENIED");
  expect(await call<unknown>("/recipes/get", {
    session: f.member.session, collection: f.second, recipe: f.recipe,
  })).toEqual({ recipe: null });
  const after = await deletionState();
  await refuses("/recipes/delete", { session: f.owner.session, recipe: f.recipe }, "OWNER_ACCESS_REQUIRED");
  expect(await deletionState()).toEqual(after);
});

test("direct members, collection owners and other savers cannot delete someone else's recipe", async () => {
  const f = await deletionFixture();
  await saving.save({ user: f.member.user, item: f.recipe });
  const before = await deletionState();
  for (const session of [f.member.session, f.outsider.session]) {
    await refuses("/recipes/delete", { session, recipe: f.recipe }, "OWNER_ACCESS_REQUIRED");
    expect(await deletionState()).toEqual(before);
  }
  await refuses("/recipes/delete", { session: f.owner.session, recipe: "missing" }, "OWNER_ACCESS_REQUIRED");
  expect(await deletionState()).toEqual(before);
});

test("restored legacy recipes can be deleted by their saver without first sharing them", async () => {
  const f = await fixture();
  const { recipe } = await recording.record(recipeData);
  await saving.save({ user: f.owner.user, item: recipe });
  await cooking.record({ author: f.member.user, recipe, changes: "Old attempt", result: "Good" });
  const before = await deletionState();
  await refuses("/recipes/delete", { session: f.outsider.session, recipe }, "OWNER_ACCESS_REQUIRED");
  expect(await deletionState()).toEqual(before);
  await call("/recipes/delete", { session: f.owner.session, recipe });
  expect(await recording._get({ recipe })).toEqual([]);
  expect(await cooking._forRecipe({ recipe })).toEqual([]);
  expect(await recipeSharing._get({ resource: recipe })).toEqual([]);
  expect(await saving._forUser({ user: f.owner.user })).toHaveLength(1);
  expect(await recording._get({ recipe: f.recipe })).toEqual([recipeData]);
});

test("destructive endpoints reject missing sessions and malformed inputs without changing data", async () => {
  const f = await deletionFixture();
  const before = await deletionState();
  for (const path of ["/recipes/delete", "/recipes/remove-from-collection"]) {
    await refuses(path, { session: null, collection: f.first, recipe: f.recipe }, "INVALID_SESSION");
    expect(await app.invoker.invoke(path, {
      session: f.owner.session, collection: f.first, recipe: 123,
    }, { timeoutMs: 2000 })).toMatchObject({ ok: false, error: { kind: "framework", code: "INVALID_INPUT" } });
    expect(await deletionState()).toEqual(before);
  }
});
