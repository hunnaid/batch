import { afterAll, beforeAll, expect, test } from "bun:test";
import { MongoClient } from "mongodb";
import {
  CollectingConcept,
  CollectionNotFound,
  InvalidCollectionName,
  ItemAlreadyCollected,
} from "../src/concepts/Collecting.ts";

const url = process.env.MONGODB_URL;

if (!url) {
  throw new Error("MONGODB_URL is required to run these tests.");
}

// Keep this run's records separate from application data.
const client = new MongoClient(url, {
  serverSelectionTimeoutMS: 3000,
});

const db = client.db(
  `batch_test_collecting_${crypto.randomUUID().replaceAll("-", "")}`
);

const collecting = new CollectingConcept(db);
let connected = false;

beforeAll(async () => {
  await client.connect();
  connected = true;
});

// Remove only this run's database, then close the connection.
afterAll(async () => {
  try {
    if (connected) {
      await db.dropDatabase();
    }
  } finally {
    await client.close();
  }
});

test("creates an empty collection with its creator and name", async () => {
  const { collection } = await collecting.create({
    creator: "user-1",
    name: "Family Recipes",
  });

  expect(collection.length).toBeGreaterThan(0);
  expect(await collecting._get({ collection })).toEqual([
    {
      creator: "user-1",
      name: "Family Recipes",
      items: [],
    },
  ]);
});

test("creates distinct collections even with the same name", async () => {
  const input = { creator: "user-1", name: "Favorites" };

  const first = await collecting.create(input);
  const second = await collecting.create(input);

  expect(first.collection).not.toBe(second.collection);
});

test("rejects an empty collection name", async () => {
  await expect(
    collecting.create({ creator: "user-1", name: "" })
  ).rejects.toBeInstanceOf(InvalidCollectionName);
});

test("rejects a whitespace-only collection name", async () => {
  await expect(
    collecting.create({ creator: "user-1", name: "   " })
  ).rejects.toBeInstanceOf(InvalidCollectionName);
});

test("adds items and retrieves them in sorted order", async () => {
  const { collection } = await collecting.create({
    creator: "user-1",
    name: "Dinner",
  });

  await collecting.add({ collection, item: "recipe-z" });
  await collecting.add({ collection, item: "recipe-a" });

  expect(await collecting._get({ collection })).toEqual([
    {
      creator: "user-1",
      name: "Dinner",
      items: ["recipe-a", "recipe-z"],
    },
  ]);
});

test("rejects a duplicate without changing membership", async () => {
  const { collection } = await collecting.create({
    creator: "user-1",
    name: "Favorites",
  });

  await collecting.add({ collection, item: "recipe-1" });

  await expect(
    collecting.add({ collection, item: "recipe-1" })
  ).rejects.toBeInstanceOf(ItemAlreadyCollected);

  expect(await collecting._get({ collection })).toEqual([
    {
      creator: "user-1",
      name: "Favorites",
      items: ["recipe-1"],
    },
  ]);
});

test("rejects adding an item to an unknown collection", async () => {
  await expect(
    collecting.add({
      collection: crypto.randomUUID(),
      item: "recipe-1",
    })
  ).rejects.toBeInstanceOf(CollectionNotFound);
});

test("returns no rows for an unknown collection", async () => {
  expect(
    await collecting._get({ collection: crypto.randomUUID() })
  ).toEqual([]);
});

test("keeps membership independent across collections", async () => {
  const first = await collecting.create({
    creator: "user-1",
    name: "Family Recipes",
  });

  const second = await collecting.create({
    creator: "user-2",
    name: "Favorites",
  });

  // The same item may belong to both collections.
  await collecting.add({
    collection: first.collection,
    item: "shared-recipe",
  });
  await collecting.add({
    collection: second.collection,
    item: "shared-recipe",
  });

  // Adding another item to the first must not change the second.
  await collecting.add({
    collection: first.collection,
    item: "another-recipe",
  });

  expect(
    await collecting._get({ collection: second.collection })
  ).toEqual([
    {
      creator: "user-2",
      name: "Favorites",
      items: ["shared-recipe"],
    },
  ]);
});
