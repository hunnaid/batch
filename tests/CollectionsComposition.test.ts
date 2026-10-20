import { afterAll, beforeAll, beforeEach, expect, test } from "bun:test";
import { MongoClient } from "mongodb";
import { assemble } from "@mit-sdg/sync-engine/assembly";
import {
  endpoint,
  receive,
  respond,
} from "@mit-sdg/sync-engine/boundary";

import { applicationConceptSet, concepts } from "../src/concepts.ts";
import { composition as collectionsComposition } from "../src/compositions/Collections.ts";

import { CollectingConcept } from "../src/concepts/Collecting.ts";
import { CookingLogConcept } from "../src/concepts/CookingLog.ts";
import { PasswordAuthenticatingConcept } from "../src/concepts/PasswordAuthenticating.ts";
import { RecipeRecordingConcept } from "../src/concepts/RecipeRecording.ts";
import {
  AccessDenied,
  SharingConcept,
} from "../src/concepts/Sharing.ts";
import { SessioningConcept } from "../src/concepts/Sessioning.ts";
import { composition as accountsComposition } from "../src/compositions/Accounts.ts";
import { composition as recipesComposition } from "../src/compositions/Recipes.ts";

/** Use a temporary database separate from the application's data. */
const url = process.env.MONGODB_URL;

if (!url) {
  throw new Error("MONGODB_URL is required to run these tests.");
}

const client = new MongoClient(url, {
  serverSelectionTimeoutMS: 3000,
});

const db = client.db(
  `batch_test_composition_${crypto.randomUUID().replaceAll("-", "")}`
);

const collecting = new CollectingConcept(db);
const sharing = new SharingConcept(db);
const sessions = new SessioningConcept(db);
const recipes = new RecipeRecordingConcept(db);
const cookingLog = new CookingLogConcept(db);

/**
 * A test-only entry point for triggering collection creation.
 * This endpoint is not included in the production application.
 */
const CreateCollection = endpoint(
  "/test/collections/create",
  ({ creator, name, collection }) =>
    receive({ creator, name })
      .then(
        concepts.Collecting.create({ creator, name })
          .responds({ collection })
      )
      .then(respond({ collection }))
);

/** Assemble the real reaction with implementations using the test database. */
const app = assemble({
  conceptSet: applicationConceptSet,
  instances: {
    RecipeRecording: recipes,
    PasswordAuthenticating: new PasswordAuthenticatingConcept(db),
    Collecting: collecting,
    CookingLog: cookingLog,
    Sharing: sharing,
    Sessioning: sessions,
  },
  composition: {
    Collections: collectionsComposition,
    Accounts: accountsComposition,
    Recipes: recipesComposition,
    Test: { CreateCollection },
  },
});

let connected = false;

beforeAll(async () => {
  await client.connect();
  connected = true;
});

/** Clear only this test run's temporary database between tests. */
beforeEach(async () => {
  await app.whenIdle();
  await db.dropDatabase();
});

// Finish pending engine work before deleting this run's database.
afterAll(async () => {
  try {
    await app.whenIdle();

    if (connected) {
      await db.dropDatabase();
    }
  } finally {
    await client.close();
  }
});

test("creating a collection automatically gives its creator access", async () => {
  const response = await app.invoker.invoke(
    "/test/collections/create",
    {
      creator: "user-1",
      name: "Family Recipes",
    }
  );

  // Wait for reactions, which may finish after the endpoint responds.
  await app.whenIdle();

  if (!response.ok) {
    throw new Error(JSON.stringify(response.error));
  }

  const { collection } = response.value as { collection: string };

  expect(typeof collection).toBe("string");

  expect(await collecting._get({ collection })).toEqual([
    {
      creator: "user-1",
      name: "Family Recipes",
      items: [],
    },
  ]);

  expect(
    await sharing.authorize({
      user: "user-1",
      resource: collection,
    })
  ).toEqual({});

  await expect(
    sharing.authorize({
      user: "outsider",
      resource: collection,
    })
  ).rejects.toBeInstanceOf(AccessDenied);
});

test("registration, login, current user, and logout work together", async () => {
  const credentials = {
    username: `cook-${crypto.randomUUID()}`,
    password: "test-password",
  };

  const registered = await app.invoker.invoke(
    "/accounts/register",
    credentials
  );

  if (!registered.ok) {
    throw new Error(JSON.stringify(registered.error));
  }

  const { user } = registered.value as { user: string };

  const loggedIn = await app.invoker.invoke(
    "/sessions/start",
    credentials
  );

  if (!loggedIn.ok) {
    throw new Error(JSON.stringify(loggedIn.error));
  }

  const login = loggedIn.value as {
    user: string;
    session: string;
  };

  expect(login.user).toBe(user);
  expect(typeof login.session).toBe("string");
  expect(login.session.length).toBeGreaterThan(0);

  expect(
    await app.invoker.invoke("/sessions/current", {
      session: login.session,
    })
  ).toEqual({
    ok: true,
    value: { user },
  });

  expect(
    await app.invoker.invoke("/sessions/end", {
      session: login.session,
    })
  ).toEqual({
    ok: true,
    value: {},
  });

  // A logged-out session must produce a domain error, not a timeout.
  expect(
    await app.invoker.invoke(
      "/sessions/current",
      { session: login.session },
      { timeoutMs: 2000 }
    )
  ).toEqual({
    ok: false,
    error: { kind: "domain", value: "INVALID_SESSION" },
  });
});

test("account refusals return domain errors rather than timing out", async () => {
  const credentials = {
    username: `cook-${crypto.randomUUID()}`,
    password: "test-password",
  };

  const registered = await app.invoker.invoke(
    "/accounts/register",
    credentials
  );

  expect(registered.ok).toBe(true);

  expect(
    await app.invoker.invoke(
      "/accounts/register",
      credentials,
      { timeoutMs: 2000 }
    )
  ).toEqual({
    ok: false,
    error: { kind: "domain", value: "USERNAME_TAKEN" },
  });

  expect(
    await app.invoker.invoke(
      "/sessions/start",
      { ...credentials, password: "wrong-password" },
      { timeoutMs: 2000 }
    )
  ).toEqual({
    ok: false,
    error: { kind: "domain", value: "INVALID_CREDENTIALS" },
  });

  expect(
    await app.invoker.invoke(
      "/accounts/register",
      { username: "", password: "" },
      { timeoutMs: 2000 }
    )
  ).toEqual({
    ok: false,
    error: { kind: "domain", value: "INVALID_REGISTRATION" },
  });
});

/**
 * Invoke an endpoint with a bounded wait.
 * Unexpected failures should stop the test with their actual error.
 */
async function invokeSuccessfully<T>(
  path: string,
  input: Record<string, unknown>
): Promise<T> {
  const response = await app.invoker.invoke(
    path,
    input,
    { timeoutMs: 2000 }
  );

  if (!response.ok) {
    throw new Error(JSON.stringify(response.error));
  }

  return response.value as T;
}

/**
 * Create independent owner/member sessions and a shared collection.
 * Account registration is covered separately by the account tests.
 */
async function createSharedCollection() {
  const owner = crypto.randomUUID();
  const member = crypto.randomUUID();

  const { session: ownerSession } = await sessions.start({
    user: owner,
  });

  const { session: memberSession } = await sessions.start({
    user: member,
  });

  const { collection } = await invokeSuccessfully<{
    collection: string;
  }>("/collections/create", {
    session: ownerSession,
    name: "Family Recipes",
  });

  await sharing.grant({
    resource: collection,
    owner,
    member,
  });

  return {
    collection,
    owner,
    member,
    ownerSession,
    memberSession,
  };
}

/** Read the collection identifiers visible through the real list endpoint. */
async function visibleCollections(session: string): Promise<string[]> {
  const response = await invokeSuccessfully<{
    overview: {
      collections: { collection: string }[];
    };
  }>("/collections/list", { session });

  return response.overview.collections.map(
    (collection) => collection.collection
  );
}

test("the owner can rename a collection without changing its items or access", async () => {
  const fixture = await createSharedCollection();
  const { collection, owner, member, ownerSession } = fixture;

  const { recipe } = await recipes.record({
    title: "Mom's Biryani",
    ingredients: ["Rice", "Chili"],
    instructions: ["Cook the rice.", "Add chili and steam."],
  });

  await collecting.add({ collection, item: recipe });

  const before = await collecting._get({ collection });

  expect(
    await invokeSuccessfully<{ collection: string }>(
      "/collections/rename",
      {
        session: ownerSession,
        collection,
        name: "Family Favorites",
      }
    )
  ).toEqual({ collection });

  expect(await collecting._get({ collection })).toEqual(
    before.map((details) => ({
      ...details,
      name: "Family Favorites",
    }))
  );

  // Both the owner and the existing member retain access.
  for (const user of [owner, member]) {
    expect(
      await sharing.authorize({ user, resource: collection })
    ).toEqual({});
  }

  expect(
    await visibleCollections(fixture.memberSession)
  ).toContain(collection);
});

test("a blank rename leaves the existing collection unchanged", async () => {
  const { collection, ownerSession } = await createSharedCollection();
  const before = await collecting._get({ collection });

  expect(
    await app.invoker.invoke(
      "/collections/rename",
      {
        session: ownerSession,
        collection,
        name: "   ",
      },
      { timeoutMs: 2000 }
    )
  ).toEqual({
    ok: false,
    error: {
      kind: "domain",
      value: "INVALID_COLLECTION_RENAME",
    },
  });

  expect(await collecting._get({ collection })).toEqual(before);
});

/**
 * Exercise both owner-only endpoints as an actual shared member.
 * Refusal must preserve the collection and its sharing state.
 */
for (const operation of [
  {
    name: "rename",
    path: "/collections/rename",
    error: "OWNER_ACCESS_REQUIRED",
  },
  {
    name: "delete",
    path: "/collections/delete",
    error: "CANNOT_UNINITIALIZE_RESOURCE",
  },
]) {
  test(`a shared member cannot ${operation.name} a collection`, async () => {
    const fixture = await createSharedCollection();
    const { collection, owner, member, memberSession } = fixture;

    const before = await collecting._get({ collection });

    const input =
      operation.name === "rename"
        ? {
            session: memberSession,
            collection,
            name: "Unauthorized rename",
          }
        : {
            session: memberSession,
            collection,
          };

    expect(
      await app.invoker.invoke(
        operation.path,
        input,
        { timeoutMs: 2000 }
      )
    ).toEqual({
      ok: false,
      error: {
        kind: "domain",
        value: operation.error,
      },
    });

    expect(await collecting._get({ collection })).toEqual(before);

    for (const user of [owner, member]) {
      expect(
        await sharing.authorize({ user, resource: collection })
      ).toEqual({});
    }
  });
}

test("deleting a collection removes access while preserving recipes, entries, and other collections", async () => {
  const fixture = await createSharedCollection();
  const {
    collection,
    owner,
    member,
    ownerSession,
    memberSession,
  } = fixture;

  const { collection: otherCollection } =
    await invokeSuccessfully<{ collection: string }>(
      "/collections/create",
      {
        session: ownerSession,
        name: "Other Recipes",
      }
    );

  const recipeData = {
    title: "Mom's Biryani",
    ingredients: ["Rice", "Chili"],
    instructions: ["Cook the rice.", "Add chili and steam."],
    source: "Mom, through iMessage",
  };

  const { recipe } = await recipes.record(recipeData);

  // One recipe can remain accessible through another collection.
  await collecting.add({ collection, item: recipe });
  await collecting.add({
    collection: otherCollection,
    item: recipe,
  });

  const { entry } = await cookingLog.record({
    author: owner,
    recipe,
    changes: "Used half the chili.",
    result: "Milder, which I preferred.",
  });

  const entryBefore = await cookingLog._get({ entry });
  const otherBefore = await collecting._get({
    collection: otherCollection,
  });

  // Establish that both users could see the collection before deletion.
  expect(await visibleCollections(ownerSession)).toContain(collection);
  expect(await visibleCollections(memberSession)).toContain(collection);

  expect(
    await invokeSuccessfully<{ collection: string }>(
      "/collections/delete",
      {
        session: ownerSession,
        collection,
      }
    )
  ).toEqual({ collection });

  expect(await collecting._get({ collection })).toEqual([]);

  for (const user of [owner, member]) {
    await expect(
      sharing.authorize({ user, resource: collection })
    ).rejects.toBeInstanceOf(AccessDenied);
  }

  const ownerCollections = await visibleCollections(ownerSession);
  const memberCollections = await visibleCollections(memberSession);

  expect(ownerCollections).not.toContain(collection);
  expect(memberCollections).not.toContain(collection);
  expect(ownerCollections).toContain(otherCollection);

  // Deletion must not cascade into independently stored recipe history.
  expect(await recipes._get({ recipe })).toEqual([recipeData]);
  expect(await cookingLog._get({ entry })).toEqual(entryBefore);

  expect(
    await collecting._get({ collection: otherCollection })
  ).toEqual(otherBefore);

  expect(
    await sharing.authorize({
      user: owner,
      resource: otherCollection,
    })
  ).toEqual({});
});

/**
 * Set up two collections with different owners.
 * The acting user is a member of both, demonstrating that ownership
 * is not required to contribute an existing recipe.
 */
async function createRecipeTransferFixture() {
  const source = await createSharedCollection();
  const destination = await createSharedCollection();

  await sharing.grant({
    resource: destination.collection,
    owner: destination.owner,
    member: source.member,
  });

  const recipeData = {
    title: "Mom's Biryani",
    ingredients: ["Rice", "Chili"],
    instructions: ["Cook the rice.", "Add chili and steam."],
    source: "Mom, through iMessage",
  };

  const { recipe } = await recipes.record(recipeData);

  await collecting.add({
    collection: source.collection,
    item: recipe,
  });

  const { entry } = await cookingLog.record({
    author: source.owner,
    recipe,
    changes: "Used half the chili.",
    result: "Milder flavor.",
  });

  return {
    source,
    destination,
    recipe,
    entry,
    recipeData,
    input: {
      session: source.memberSession,
      sourceCollection: source.collection,
      destinationCollection: destination.collection,
      recipe,
    },
  };
}

/** Capture the state that a refused addition must leave unchanged. */
async function recipeTransferState(
  fixture: Awaited<ReturnType<typeof createRecipeTransferFixture>>
) {
  return {
    source: await collecting._get({
      collection: fixture.source.collection,
    }),
    destination: await collecting._get({
      collection: fixture.destination.collection,
    }),
    recipe: await recipes._get({ recipe: fixture.recipe }),
    entries: await cookingLog._forRecipe({ recipe: fixture.recipe }),
  };
}

test("a member can add an existing recipe while retaining its source and history", async () => {
  const fixture = await createRecipeTransferFixture();
  const { source, destination, recipe, entry, input } = fixture;
  const before = await recipeTransferState(fixture);

  expect(
    await invokeSuccessfully<{ recipe: string; collection: string }>(
      "/recipes/add-to-collection",
      input
    )
  ).toEqual({
    recipe,
    collection: destination.collection,
  });

  const after = await recipeTransferState(fixture);

  expect(after.source).toEqual(before.source);
  expect(after.recipe).toEqual(before.recipe);
  expect(after.entries).toEqual(before.entries);

  expect(after.destination).toEqual([
    {
      creator: destination.owner,
      name: "Family Recipes",
      items: [recipe],
    },
  ]);

  // Both collection routes expose the same recipe and existing entry.
  const throughSource = await invokeSuccessfully<unknown>(
    "/recipes/get",
    {
      session: source.memberSession,
      collection: source.collection,
      recipe,
    }
  );

  const throughDestination = await invokeSuccessfully<unknown>(
    "/recipes/get",
    {
      session: source.memberSession,
      collection: destination.collection,
      recipe,
    }
  );

  expect(throughDestination).toEqual(throughSource);
  expect(throughDestination).toMatchObject({
    recipe: {
      recipe,
      title: fixture.recipeData.title,
      entries: [{ entry }],
    },
  });

  // Later entries are also shared because both collections use one recipe.
  const { entry: laterEntry } = await cookingLog.record({
    author: source.member,
    recipe,
    changes: "Steamed for five extra minutes.",
    result: "Rice turned out well.",
  });

  const updatedSource = await invokeSuccessfully<{
    recipe: { entries: { entry: string }[] };
  }>("/recipes/get", {
    session: source.memberSession,
    collection: source.collection,
    recipe,
  });

  const updatedDestination = await invokeSuccessfully<unknown>(
    "/recipes/get",
    {
      session: source.memberSession,
      collection: destination.collection,
      recipe,
    }
  );

  expect(updatedDestination).toEqual(updatedSource);
  expect(
    updatedSource.recipe.entries.map((row) => row.entry)
  ).toContain(laterEntry);
});

/** Losing access to either collection must prevent the addition. */
for (const restrictedSide of ["source", "destination"] as const) {
  test(`adding a recipe requires access to the ${restrictedSide} collection`, async () => {
    const fixture = await createRecipeTransferFixture();
    const restricted = fixture[restrictedSide];

    await sharing.revoke({
      resource: restricted.collection,
      owner: restricted.owner,
      member: fixture.source.member,
    });

    const before = await recipeTransferState(fixture);

    expect(
      await app.invoker.invoke(
        "/recipes/add-to-collection",
        fixture.input,
        { timeoutMs: 2000 }
      )
    ).toEqual({
      ok: false,
      error: {
        kind: "domain",
        value: "ACCESS_DENIED",
      },
    });

    expect(await recipeTransferState(fixture)).toEqual(before);
  });
}

test("a recipe outside the stated source collection cannot be added", async () => {
  const fixture = await createRecipeTransferFixture();

  // This is a real recipe, but it has never belonged to the source.
  const { recipe: unrelatedRecipe } = await recipes.record({
    title: "Unrelated recipe",
    ingredients: ["Water"],
    instructions: ["Pour the water."],
  });

  const unrelatedBefore = await recipes._get({
    recipe: unrelatedRecipe,
  });
  const before = await recipeTransferState(fixture);

  expect(
    await app.invoker.invoke(
      "/recipes/add-to-collection",
      {
        ...fixture.input,
        recipe: unrelatedRecipe,
      },
      { timeoutMs: 2000 }
    )
  ).toEqual({
    ok: false,
    error: {
      kind: "domain",
      value: "RECIPE_NOT_IN_COLLECTION",
    },
  });

  expect(await recipeTransferState(fixture)).toEqual(before);
  expect(
    await recipes._get({ recipe: unrelatedRecipe })
  ).toEqual(unrelatedBefore);
});

test("repeating an addition is refused without changing either collection", async () => {
  const fixture = await createRecipeTransferFixture();

  await invokeSuccessfully(
    "/recipes/add-to-collection",
    fixture.input
  );

  const before = await recipeTransferState(fixture);

  expect(
    await app.invoker.invoke(
      "/recipes/add-to-collection",
      fixture.input,
      { timeoutMs: 2000 }
    )
  ).toEqual({
    ok: false,
    error: {
      kind: "domain",
      value: "ITEM_ALREADY_COLLECTED",
    },
  });

  expect(await recipeTransferState(fixture)).toEqual(before);
});
