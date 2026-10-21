import { ProfilingConcept } from "../src/concepts/Profiling.ts";
import { expect, test } from "bun:test";
import { testDatabase } from "./helpers/database.ts";
import { assemble } from "@mit-sdg/sync-engine/assembly";
import {
  createGateway,
  endpoint,
  receive,
  respond,
} from "@mit-sdg/sync-engine/boundary";
import { createHttpHandler } from "@mit-sdg/sync-engine-http/handler";
import { policy } from "../src/http-policy.ts";

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
import { SavingConcept } from "../src/concepts/Saving.ts";

import { SessioningConcept } from "../src/concepts/Sessioning.ts";
import { composition as accountsComposition } from "../src/compositions/Accounts.ts";
import { composition as recipesComposition } from "../src/compositions/Recipes.ts";
import { composition as sharedComposition } from "../src/compositions/Shared.ts";

/** Use a temporary database separate from the application's data. */
const db = testDatabase("collections", () => app.whenIdle());

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
    Profiling: new ProfilingConcept(db),
    RecipeRecording: recipes,
    PasswordAuthenticating: new PasswordAuthenticatingConcept(db),
    Collecting: collecting,
    CookingLog: cookingLog,
    Sharing: sharing,
    RecipeSharing: new SharingConcept(db, "recipeSharing.resources"),
    Sessioning: sessions,
    Saving: new SavingConcept(db),
  },
  composition: {
    Collections: collectionsComposition,
    Accounts: accountsComposition,
    Recipes: recipesComposition,
    Shared: sharedComposition,
    Test: { CreateCollection },
  },
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

test("a recipe can be saved without a collection and appears only in the saver's list", async () => {
    const owner = crypto.randomUUID();
    const otherUser = crypto.randomUUID();

    const { session: ownerSession } = await sessions.start({
        user: owner,
    });

    const { session: otherSession } = await sessions.start({
        user: otherUser,
    });

    const recipeData = {
        title: "Simple Rice",
        ingredients: ["1 cup rice", "Water"],
        instructions: ["Cook the rice."],
        source: "My notes",
    };

    const { recipe } = await invokeSuccessfully<{ recipe: string }>(
        "/recipes/save-personal",
        {
            session: ownerSession,
            ...recipeData,
        }
    );

    // The original details are stored without creating a collection.
    expect(await recipes._get({ recipe })).toEqual([recipeData]);
    expect(await visibleCollections(ownerSession)).toEqual([]);

    const mine = await invokeSuccessfully<{
        overview: {
            recipes: {
                recipe: string;
                title: string;
                savedAt: unknown;
            }[];
        };
    }>("/recipes/mine", {
        session: ownerSession,
    });

    expect(mine.overview.recipes).toHaveLength(1);
    expect(mine.overview.recipes[0]).toMatchObject({
        recipe,
        title: recipeData.title,
    });
    expect(mine.overview.recipes[0]!.savedAt).toBeDefined();

    // Another signed-in user's list does not expose this recipe.
    const otherList = await invokeSuccessfully<typeof mine>(
        "/recipes/mine",
        { session: otherSession }
    );

    expect(otherList).toEqual({
        overview: {
            recipes: [],
        },
    });
});

test("a personal recipe can be opened by its saver but not another user", async () => {
    const owner = crypto.randomUUID();
    const outsider = crypto.randomUUID();

    const { session: ownerSession } = await sessions.start({
        user: owner,
    });

    const { session: outsiderSession } = await sessions.start({
        user: outsider,
    });

    const recipeData = {
        title: "Simple Rice",
        ingredients: ["Rice", "Water"],
        instructions: ["Cook the rice."],
        source: "My notes",
    };

    const { recipe } = await invokeSuccessfully<{ recipe: string }>(
        "/recipes/save-personal",
        {
            session: ownerSession,
            ...recipeData,
        }
    );

    const opened = await invokeSuccessfully<{ recipe: unknown }>(
        "/recipes/get-personal",
        {
            session: ownerSession,
            recipe,
        }
    );

    expect(opened).toEqual({
        recipe: {
            recipe,
            ...recipeData,
            entries: [],
        },
    });

    // Knowing the identifier does not allow another user to read it.
    expect(
        await app.invoker.invoke(
            "/recipes/get-personal",
            {
                session: outsiderSession,
                recipe,
            },
            { timeoutMs: 2000 }
        )
    ).toEqual({
        ok: false,
        error: {
            kind: "domain",
            value: "ITEM_NOT_SAVED",
        },
    });

    // The browser receives an access refusal without losing its valid session.
    const gateway = createGateway({ application: app });
    const handler = createHttpHandler({ application: app, gateway, policy });
    const response = await handler(new Request(
        new URL("/api/recipes/get-personal", policy.publicOrigin),
        {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                // The HTTP adapter prefixes this host-only, root-path cookie.
                Cookie: `__Host-batch-session=${outsiderSession}`,
            },
            body: JSON.stringify({ recipe }),
        }
    ));

    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({ error: "FORBIDDEN" });
    expect(response.headers.get("Set-Cookie")).toBeNull();
    expect(await sessions.resolve({ session: outsiderSession })).toEqual({
        user: outsider,
    });
    await gateway.whenIdle();

    // The refused request leaves the owner's recipe available.
    expect(
        await invokeSuccessfully<typeof opened>(
            "/recipes/get-personal",
            {
                session: ownerSession,
                recipe,
            }
        )
    ).toEqual(opened);
});

test("personal cooking entries can be recorded and edited while unauthorized changes are refused", async () => {
    const owner = crypto.randomUUID();
    const outsider = crypto.randomUUID();

    const { session: ownerSession } = await sessions.start({
        user: owner,
    });

    const { session: outsiderSession } = await sessions.start({
        user: outsider,
    });

    const { recipe } = await invokeSuccessfully<{ recipe: string }>(
        "/recipes/save-personal",
        {
            session: ownerSession,
            title: "Simple Rice",
            ingredients: ["Rice", "Water"],
            instructions: ["Cook the rice."],
        }
    );

    const { entry } = await invokeSuccessfully<{ entry: string }>(
        "/entries/add-personal",
        {
            session: ownerSession,
            recipe,
            changes: "Used less water.",
            result: "",
        }
    );

    const original = await cookingLog._get({ entry });

    expect(original).toHaveLength(1);
    expect(original[0]).toMatchObject({
        _id: entry,
        author: owner,
        recipe,
        changes: "Used less water.",
        result: "",
    });

    expect(
        await invokeSuccessfully<{ entry: string }>(
            "/entries/edit-personal",
            {
                session: ownerSession,
                recipe,
                entry,
                changes: "Used less water.",
                result: "The rice was firmer.",
            }
        )
    ).toEqual({ entry });

    const edited = await cookingLog._get({ entry });

    expect(edited).toEqual(
        original.map((row) => ({
            ...row,
            result: "The rice was firmer.",
        }))
    );

    // The personal recipe screen receives the updated history.
    const opened = await invokeSuccessfully<{
        recipe: {
            entries: {
                entry: string;
                result: string;
            }[];
        };
    }>("/recipes/get-personal", {
        session: ownerSession,
        recipe,
    });

    expect(opened.recipe.entries).toHaveLength(1);
    expect(opened.recipe.entries[0]).toMatchObject({
        entry,
        result: "The rice was firmer.",
    });

    const historyBefore = await cookingLog._forRecipe({ recipe });

    // Another user cannot add or edit through personal access.
    for (const path of [
        "/entries/add-personal",
        "/entries/edit-personal",
    ]) {
        const input =
            path === "/entries/edit-personal"
                ? {
                    session: outsiderSession,
                    recipe,
                    entry,
                    changes: "Unauthorized change.",
                    result: "",
                }
                : {
                    session: outsiderSession,
                    recipe,
                    changes: "Unauthorized addition.",
                    result: "",
                };

        expect(
            await app.invoker.invoke(
                path,
                input,
                { timeoutMs: 2000 }
            )
        ).toEqual({
            ok: false,
            error: {
                kind: "domain",
                value: "ITEM_NOT_SAVED",
            },
        });

        expect(
            await cookingLog._forRecipe({ recipe })
        ).toEqual(historyBefore);
    }

    // Saving another recipe does not permit editing this entry through it.
    const { recipe: otherRecipe } =
        await invokeSuccessfully<{ recipe: string }>(
            "/recipes/save-personal",
            {
                session: ownerSession,
                title: "Another Recipe",
                ingredients: ["Water"],
                instructions: ["Pour the water."],
            }
        );

    expect(
        await app.invoker.invoke(
            "/entries/edit-personal",
            {
                session: ownerSession,
                recipe: otherRecipe,
                entry,
                changes: "Wrong recipe.",
                result: "",
            },
            { timeoutMs: 2000 }
        )
    ).toEqual({
        ok: false,
        error: {
            kind: "domain",
            value: "ENTRY_NOT_IN_RECIPE",
        },
    });

    expect(await cookingLog._get({ entry })).toEqual(edited);
});

/** Creating inside a shared collection saves personally for the actual creator. */
for (const creatorRole of ["owner", "member"] as const) {
  test(`a recipe created in a collection appears only in its ${creatorRole} creator's personal list`, async () => {
    const fixture = await createSharedCollection();
    const session = fixture[`${creatorRole}Session`];
    const otherSession = creatorRole === "owner"
      ? fixture.memberSession
      : fixture.ownerSession;
    const recipeData = {
      title: "Simple Rice",
      ingredients: ["Rice", "Water"],
      instructions: ["Cook the rice."],
      source: "My notes",
    };

    const before = Date.now();
    const { recipe } = await invokeSuccessfully<{ recipe: string }>(
      "/recipes/save",
      { session, collection: fixture.collection, ...recipeData }
    );
    const after = Date.now();

    const mine = await invokeSuccessfully<{
      overview: { recipes: { recipe: string; title: string; savedAt: Date }[] };
    }>("/recipes/mine", { session });

    expect(mine.overview.recipes).toHaveLength(1);
    expect(mine.overview.recipes[0]).toMatchObject({
      recipe,
      title: recipeData.title,
    });
    const savedAt = mine.overview.recipes[0]!.savedAt;
    expect(savedAt).toBeInstanceOf(Date);
    expect(savedAt.getTime()).toBeGreaterThanOrEqual(before);
    expect(savedAt.getTime()).toBeLessThanOrEqual(after);
    expect(await invokeSuccessfully<unknown>("/recipes/mine", {
      session: otherSession,
    })).toEqual({ overview: { recipes: [] } });

    const personal = await invokeSuccessfully<unknown>("/recipes/get-personal", {
      session,
      recipe,
    });
    expect(personal).toEqual({ recipe: { recipe, ...recipeData, entries: [] } });
    expect(await invokeSuccessfully<unknown>("/recipes/get", {
      session: otherSession,
      collection: fixture.collection,
      recipe,
    })).toEqual(personal);
  });
}

/** The saver is a member, rather than the destination's owner. */
async function createPersonalRecipeTransferFixture() {
  const destination = await createSharedCollection();
  const { recipe } = await invokeSuccessfully<{ recipe: string }>(
    "/recipes/save-personal",
    {
      session: destination.memberSession,
      title: "Simple Rice",
      ingredients: ["Rice", "Water"],
      instructions: ["Cook the rice."],
      source: "My notes",
    }
  );
  const { entry } = await invokeSuccessfully<{ entry: string }>(
    "/entries/add-personal",
    {
      session: destination.memberSession,
      recipe,
      changes: "Used less water.",
      result: "Firmer rice.",
    }
  );

  return {
    destination,
    recipe,
    entry,
    input: {
      session: destination.memberSession,
      destinationCollection: destination.collection,
      recipe,
    },
  };
}

/** Include personal lists in the state that additions must preserve. */
async function personalRecipeTransferState(
  fixture: Awaited<ReturnType<typeof createPersonalRecipeTransferFixture>>
) {
  return {
    destination: await collecting._get({ collection: fixture.destination.collection }),
    recipe: await recipes._get({ recipe: fixture.recipe }),
    entries: await cookingLog._forRecipe({ recipe: fixture.recipe }),
    saverList: await invokeSuccessfully<unknown>("/recipes/mine", {
      session: fixture.destination.memberSession,
    }),
    ownerList: await invokeSuccessfully<unknown>("/recipes/mine", {
      session: fixture.destination.ownerSession,
    }),
  };
}

test("adding a personal recipe to a collection preserves its save date and shared history", async () => {
  const fixture = await createPersonalRecipeTransferFixture();
  const { destination, recipe, entry, input } = fixture;
  const before = await personalRecipeTransferState(fixture);

  expect(await invokeSuccessfully<unknown>(
    "/recipes/add-personal-to-collection", input
  )).toEqual({ recipe, collection: destination.collection });

  expect(await personalRecipeTransferState(fixture)).toEqual({
    ...before,
    destination: before.destination.map((row) => ({ ...row, items: [recipe] })),
  });
  expect(before.ownerList).toEqual({ overview: { recipes: [] } });

  const personal = await invokeSuccessfully<unknown>("/recipes/get-personal", {
    session: destination.memberSession,
    recipe,
  });
  expect(personal).toMatchObject({ recipe: { recipe, entries: [{ entry }] } });
  expect(await invokeSuccessfully<unknown>("/recipes/get", {
    session: destination.ownerSession,
    collection: destination.collection,
    recipe,
  })).toEqual(personal);

  // Future attempts added by another collection member share the same history.
  const { entry: laterEntry } = await invokeSuccessfully<{ entry: string }>(
    "/entries/add",
    {
      session: destination.ownerSession,
      collection: destination.collection,
      recipe,
      changes: "Added some salt.",
      result: "More flavorful.",
    }
  );
  const updated = await invokeSuccessfully<{
    recipe: { entries: { entry: string }[] };
  }>("/recipes/get-personal", { session: destination.memberSession, recipe });

  expect(updated.recipe.entries.map((row) => row.entry).sort()).toEqual(
    [entry, laterEntry].sort()
  );
  expect(await invokeSuccessfully<unknown>("/recipes/get", {
    session: destination.ownerSession,
    collection: destination.collection,
    recipe,
  })).toEqual(updated);
  expect(await invokeSuccessfully<unknown>("/recipes/mine", {
    session: destination.memberSession,
  })).toEqual(before.saverList);
});

test("repeating a personal recipe addition is refused without changing its save or collection", async () => {
  const fixture = await createPersonalRecipeTransferFixture();
  await invokeSuccessfully("/recipes/add-personal-to-collection", fixture.input);
  const before = await personalRecipeTransferState(fixture);

  expect(await app.invoker.invoke(
    "/recipes/add-personal-to-collection", fixture.input, { timeoutMs: 2000 }
  )).toEqual({
    ok: false,
    error: { kind: "domain", value: "ITEM_ALREADY_COLLECTED" },
  });
  expect(await personalRecipeTransferState(fixture)).toEqual(before);
});

for (const restriction of ["personal save", "destination access"] as const) {
  test(`adding a personal recipe requires ${restriction} and preserves state on refusal`, async () => {
    const fixture = await createPersonalRecipeTransferFixture();
    let session = fixture.destination.memberSession;

    if (restriction === "personal save") {
      // The owner can access the destination but has not personally saved the recipe.
      session = fixture.destination.ownerSession;
    } else {
      await sharing.revoke({
        owner: fixture.destination.owner,
        resource: fixture.destination.collection,
        member: fixture.destination.member,
      });
    }

    const before = await personalRecipeTransferState(fixture);
    expect(await app.invoker.invoke(
      "/recipes/add-personal-to-collection",
      { ...fixture.input, session },
      { timeoutMs: 2000 }
    )).toEqual({
      ok: false,
      error: {
        kind: "domain",
        value: restriction === "personal save" ? "ITEM_NOT_SAVED" : "ACCESS_DENIED",
      },
    });
    expect(await personalRecipeTransferState(fixture)).toEqual(before);
  });
}

/** Read all recipe-related records so refusals cannot hide orphan inserts. */
async function recipeStorage() {
  const names = ["recipeRecording.recipes", "saving.items", "recipeSharing.resources",
    "collecting.collections", "sharing.resources", "cookingLog.entries"];
  return Promise.all(names.map((name) => db.collection(name).find().sort({ _id: 1 }).toArray()));
}

async function refuses(path: string, input: Record<string, unknown>, error: string) {
  expect(await app.invoker.invoke(path, input, { timeoutMs: 2000 })).toEqual({
    ok: false, error: { kind: "domain", value: error },
  });
}

test("refused recipe saves leave no orphan recipes, personal saves, ownership or memberships", async () => {
  const f = await createSharedCollection();
  const { session: outsiderSession } = await sessions.start({ user: "outsider" });
  const valid = { title: "Rice", ingredients: ["Rice"], instructions: ["Cook."] };
  await invokeSuccessfully("/recipes/save", { session: f.ownerSession, collection: f.collection, ...valid });
  const before = await recipeStorage();

  for (const path of ["/recipes/save", "/recipes/save-personal"]) {
    const input = { session: f.memberSession, collection: f.collection, ...valid };
    await refuses(path, { ...input, title: "  " }, "INVALID_RECIPE");
    expect(await recipeStorage()).toEqual(before);
    await refuses(path, { ...input, session: null }, "INVALID_SESSION");
    expect(await recipeStorage()).toEqual(before);
    expect(await app.invoker.invoke(path, { ...input, ingredients: [123] }, { timeoutMs: 2000 }))
      .toMatchObject({ ok: false, error: { kind: "framework", code: "INVALID_INPUT" } });
    expect(await recipeStorage()).toEqual(before);
  }
  await refuses("/recipes/save", {
    session: outsiderSession, collection: f.collection, ...valid,
  }, "ACCESS_DENIED");
  expect(await recipeStorage()).toEqual(before);
});

test("collection entry editing enforces authorship, recipe membership and revocation", async () => {
  const f = await createSharedCollection();
  const { recipe } = await invokeSuccessfully<{ recipe: string }>("/recipes/save", {
    session: f.ownerSession, collection: f.collection,
    title: "Rice", ingredients: ["Rice"], instructions: ["Cook."],
  });
  const input = { session: f.memberSession, collection: f.collection, recipe,
    changes: "Less water", result: "" };
  const { entry } = await invokeSuccessfully<{ entry: string }>("/entries/add", input);
  const original = await cookingLog._get({ entry });
  expect(original[0]).toMatchObject({ author: f.member, recipe, changes: input.changes });
  await invokeSuccessfully("/entries/edit", { ...input, entry, result: "Firmer rice" });
  expect(await cookingLog._get({ entry }))
    .toEqual(original.map((row) => ({ ...row, result: "Firmer rice" })));

  const { recipe: otherRecipe } = await invokeSuccessfully<{ recipe: string }>("/recipes/save", {
    session: f.memberSession, collection: f.collection,
    title: "Soup", ingredients: ["Water"], instructions: ["Boil."],
  });
  const { recipe: privateRecipe } = await invokeSuccessfully<{ recipe: string }>("/recipes/save-personal", {
    session: f.memberSession, title: "Private", ingredients: ["Water"], instructions: ["Boil."],
  });
  const before = await recipeStorage();
  for (const [overrides, error] of [
    [{ session: f.ownerSession }, "COOKING_ENTRY_NOT_OWNED"],
    [{ recipe: otherRecipe }, "ENTRY_NOT_IN_RECIPE"],
    [{ entry: "missing" }, "ENTRY_NOT_IN_RECIPE"],
    [{ recipe: privateRecipe }, "RECIPE_NOT_IN_COLLECTION"],
    [{ changes: "", result: " " }, "INVALID_COOKING_ENTRY_EDIT"],
  ] as const) {
    await refuses("/entries/edit", { ...input, entry, ...overrides }, error);
    expect(await recipeStorage()).toEqual(before);
  }
  await refuses("/entries/add", { ...input, recipe: privateRecipe }, "RECIPE_NOT_IN_COLLECTION");
  await refuses("/entries/add", { ...input, changes: "", result: " " }, "INVALID_COOKING_ENTRY");
  expect(await recipeStorage()).toEqual(before);

  await sharing.revoke({ resource: f.collection, owner: f.owner, member: f.member });
  const revoked = await recipeStorage();
  for (const path of ["/recipes/get", "/entries/add", "/entries/edit"]) {
    await refuses(path, { ...input, entry }, "ACCESS_DENIED");
    expect(await recipeStorage()).toEqual(revoked);
  }
});

test("collection sharing resolves usernames, enforces ownership and revokes access through the endpoints", async () => {
  const accounts = new PasswordAuthenticatingConcept(db);
  const users = [];
  for (const username of ["owner", "member", "outsider"]) {
    const { user } = await accounts.register({ username, password: "test-password" });
    const { session } = await sessions.start({ user });
    users.push({ user, username, session });
  }
  const [owner, member, outsider] = users;
  const { collection } = await invokeSuccessfully<{ collection: string }>("/collections/create", {
    session: owner!.session, name: "Family",
  });
  const input = { session: owner!.session, collection, username: member!.username };
  await invokeSuccessfully("/collections/share", input);
  expect(await visibleCollections(member!.session)).toEqual([collection]);
  const before = await recipeStorage();
  for (const [path, overrides, error] of [
    ["/collections/share", {}, "MEMBER_ALREADY_ADDED"],
    ["/collections/share", { username: "missing" }, "RECIPIENT_NOT_FOUND"],
    ["/collections/revoke", { username: "missing" }, "RECIPIENT_NOT_FOUND"],
    ["/collections/share", { session: member!.session, username: outsider!.username }, "GRANT_NOT_OWNER"],
    ["/collections/revoke", { session: member!.session, username: owner!.username }, "REVOKE_NOT_OWNER"],
  ] as const) {
    await refuses(path, { ...input, ...overrides }, error);
    expect(await recipeStorage()).toEqual(before);
  }
  await invokeSuccessfully("/collections/revoke", input);
  expect(await visibleCollections(member!.session)).toEqual([]);
  expect(await visibleCollections(owner!.session)).toEqual([collection]);
  const after = await recipeStorage();
  await refuses("/collections/revoke", input, "MEMBER_NOT_ADDED");
  expect(await recipeStorage()).toEqual(after);
});
