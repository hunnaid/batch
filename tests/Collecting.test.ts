import { expect, test } from "bun:test";
import { testDatabase } from "./helpers/database.ts";
import {
  CollectingConcept,
  CollectionNotFound,
  InvalidCollectionName,
  ItemAlreadyCollected,
  InvalidCollectionRename,
  RenameCollectionNotFound,
  DeleteCollectionNotFound,
} from "../src/concepts/Collecting.ts";

const db = testDatabase("collecting");

const collecting = new CollectingConcept(db);

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

for (const name of ["", " \t\n"]) {
  test(`rejects blank collection name ${JSON.stringify(name)} without creating a collection`, async () => {
    await collecting.create({ creator: "owner", name: "Keep me" });
    const stored = db.collection("collecting.collections");
    const before = await stored.find().toArray();
    await expect(collecting.create({ creator: "owner", name }))
      .rejects.toBeInstanceOf(InvalidCollectionName);
    expect(await stored.find().toArray()).toEqual(before);
  });
}

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

test("lists collection items as separate rows", async () => {
  const { collection } = await collecting.create({
    creator: "user-1",
    name: "Family Recipes",
  });

  expect(await collecting._items({ collection })).toEqual([]);

  await collecting.add({ collection, item: "recipe-b" });
  await collecting.add({ collection, item: "recipe-a" });

  expect(await collecting._get({ collection })).toEqual([{
    creator: "user-1", name: "Family Recipes", items: ["recipe-a", "recipe-b"],
  }]);
  expect(await collecting._items({ collection })).toEqual([
    { item: "recipe-a" },
    { item: "recipe-b" },
  ]);

  expect(
    await collecting._items({ collection: crypto.randomUUID() })
  ).toEqual([]);
});

test("renaming preserves membership and accepts the current name", async () => {
  const { collection } = await collecting.create({ creator: "owner", name: "Before" });
  await collecting.add({ collection, item: "recipe" });
  const { collection: other } = await collecting.create({ creator: "other", name: "Other" });
  const otherBefore = await collecting._get({ collection: other });
  for (let attempt = 0; attempt < 2; attempt++) {
    expect(await collecting.rename({ collection, name: "After" })).toEqual({});
    expect(await collecting._get({ collection })).toEqual([
      { creator: "owner", name: "After", items: ["recipe"] },
    ]);
  }
  expect(await collecting._get({ collection: other })).toEqual(otherBefore);
});

test("invalid and missing-target renames preserve existing collections", async () => {
  const { collection } = await collecting.create({ creator: "owner", name: "Keep me" });
  await collecting.add({ collection, item: "recipe" });
  const before = await collecting._get({ collection });
  for (const name of ["", " \t\n"]) {
    await expect(collecting.rename({ collection, name })).rejects.toBeInstanceOf(InvalidCollectionRename);
    expect(await collecting._get({ collection })).toEqual(before);
  }
  await expect(collecting.rename({ collection: "missing", name: "New" }))
    .rejects.toBeInstanceOf(RenameCollectionNotFound);
  expect(await collecting._get({ collection: "missing" })).toEqual([]);
  expect(await collecting._get({ collection })).toEqual(before);
});

test("deleting removes only that collection and repeating deletion is refused", async () => {
  const first = await collecting.create({ creator: "owner", name: "First" });
  const second = await collecting.create({ creator: "owner", name: "Second" });
  for (const { collection } of [first, second]) {
    await collecting.add({ collection, item: "shared-recipe" });
  }
  const before = await collecting._get(second);
  expect(await collecting.delete(first)).toEqual({});
  expect(await collecting._get(first)).toEqual([]);
  expect(await collecting._items(first)).toEqual([]);
  for (const collection of [first.collection, "never-existed"]) {
    await expect(collecting.delete({ collection })).rejects.toBeInstanceOf(DeleteCollectionNotFound);
    expect(await collecting._get(second)).toEqual(before);
  }
});
