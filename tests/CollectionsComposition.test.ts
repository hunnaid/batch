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
import { SessioningConcept } from "../src/concepts/Sessioning.ts";
import { composition as accountsComposition } from "../src/compositions/Accounts.ts";

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
    Sessioning: new SessioningConcept(db),
  },
  composition: {
    Collections: collectionsComposition,
    Accounts: accountsComposition,
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
