import { afterAll, beforeAll, expect, test } from "bun:test";
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
    RecipeRecording: new RecipeRecordingConcept(db),
    PasswordAuthenticating: new PasswordAuthenticatingConcept(db),
    Collecting: collecting,
    CookingLog: new CookingLogConcept(db),
    Sharing: sharing,
  },
  composition: {
    Collections: collectionsComposition,
    Test: { CreateCollection },
  },
});

let connected = false;

beforeAll(async () => {
  await client.connect();
  connected = true;
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
