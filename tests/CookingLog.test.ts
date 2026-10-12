import { afterAll, beforeAll, expect, test } from "bun:test";
import { MongoClient } from "mongodb";
import {
  CookingEntryNotFound,
  CookingEntryNotOwned,
  CookingLogConcept,
  InvalidCookingEntry,
  InvalidCookingEntryEdit,
} from "../src/concepts/CookingLog.ts";

/**
 * Use a separate database for this test run so application data is untouched.
 */
const url = process.env.MONGODB_URL;

if (!url) {
  throw new Error("MONGODB_URL is required to run these tests.");
}

const client = new MongoClient(url, {
  serverSelectionTimeoutMS: 3000,
});

const db = client.db(
  `batch_test_cooking_log_${crypto.randomUUID().replaceAll("-", "")}`
);

const log = new CookingLogConcept(db);
let connected = false;

beforeAll(async () => {
  await client.connect();
  connected = true;
});

// Remove only this run's temporary database and always close the connection.
afterAll(async () => {
  try {
    if (connected) {
      await db.dropDatabase();
    }
  } finally {
    await client.close();
  }
});

const example = {
  author: "user-1",
  recipe: "recipe-1",
  changes: "Used half the chili and steamed for five extra minutes.",
  result: "Milder, with fully cooked rice.",
};

test("records an entry with its details and creation time", async () => {
  const before = Date.now();
  const { entry } = await log.record(example);
  const after = Date.now();

  const rows = await log._get({ entry });

  expect(entry.length).toBeGreaterThan(0);
  expect(rows).toHaveLength(1);

  const stored = rows[0]!;

  expect(stored).toMatchObject({
    _id: entry,
    ...example,
  });
  expect(stored.createdAt).toBeInstanceOf(Date);
  expect(stored.createdAt.getTime()).toBeGreaterThanOrEqual(before);
  expect(stored.createdAt.getTime()).toBeLessThanOrEqual(after);
});

test("allows changes before the result is known", async () => {
  const { entry } = await log.record({
    ...example,
    result: "",
  });

  expect(await log._get({ entry })).toMatchObject([
    { changes: example.changes, result: "" },
  ]);
});

test("allows a result without changes to the original recipe", async () => {
  const { entry } = await log.record({
    ...example,
    changes: "",
  });

  expect(await log._get({ entry })).toMatchObject([
    { changes: "", result: example.result },
  ]);
});

test("rejects an entry when both text fields are blank", async () => {
  await expect(
    log.record({
      ...example,
      changes: "  ",
      result: "",
    })
  ).rejects.toBeInstanceOf(InvalidCookingEntry);
});

test("returns no rows for an unknown entry", async () => {
  expect(
    await log._get({ entry: crypto.randomUUID() })
  ).toEqual([]);
});

test("another attempt preserves the earlier entry", async () => {
  const first = await log.record(example);
  const original = await log._get({ entry: first.entry });

  const second = await log.record({
    ...example,
    changes: "Used the original amount of chili.",
    result: "Too spicy for me.",
  });

  expect(second.entry).not.toBe(first.entry);
  expect(await log._get({ entry: first.entry })).toEqual(original);
});

test("the author can edit text while preserving entry metadata", async () => {
  const { entry } = await log.record({
    ...example,
    result: "",
  });

  const original = (await log._get({ entry }))[0]!;

  const response = await log.edit({
    author: example.author,
    entry,
    changes: "Used half the chili.",
    result: "The spice level worked well.",
  });

  expect(response).toEqual({});
  expect(await log._get({ entry })).toEqual([
    {
      ...original,
      changes: "Used half the chili.",
      result: "The spice level worked well.",
    },
  ]);
});

test("another user cannot edit the entry", async () => {
  const { entry } = await log.record(example);
  const original = await log._get({ entry });

  await expect(
    log.edit({
      author: "user-2",
      entry,
      changes: "Someone else's changes.",
      result: "Someone else's result.",
    })
  ).rejects.toBeInstanceOf(CookingEntryNotOwned);

  expect(await log._get({ entry })).toEqual(original);
});

test("editing an unknown entry is refused", async () => {
  await expect(
    log.edit({
      author: example.author,
      entry: crypto.randomUUID(),
      changes: example.changes,
      result: example.result,
    })
  ).rejects.toBeInstanceOf(CookingEntryNotFound);
});

test("an invalid edit leaves the existing entry unchanged", async () => {
  const { entry } = await log.record(example);
  const original = await log._get({ entry });

  await expect(
    log.edit({
      author: example.author,
      entry,
      changes: "",
      result: "  ",
    })
  ).rejects.toBeInstanceOf(InvalidCookingEntryEdit);

  expect(await log._get({ entry })).toEqual(original);
});

test("editing can leave either text field empty", async () => {
  const { entry } = await log.record(example);

  await log.edit({
    author: example.author,
    entry,
    changes: "",
    result: "The original recipe worked well.",
  });

  expect(await log._get({ entry })).toMatchObject([
    { changes: "", result: "The original recipe worked well." },
  ]);

  await log.edit({
    author: example.author,
    entry,
    changes: "Try less chili next time.",
    result: "",
  });

  expect(await log._get({ entry })).toMatchObject([
    { changes: "Try less chili next time.", result: "" },
  ]);
});

test("lists only the entries belonging to the requested recipe", async () => {
  const recipe = crypto.randomUUID();

  expect(await log._forRecipe({ recipe })).toEqual([]);

  const first = await log.record({
    ...example,
    recipe,
  });

  const second = await log.record({
    ...example,
    recipe,
    changes: "Used the original amount of chili.",
  });

  await log.record({
    ...example,
    recipe: crypto.randomUUID(),
  });

  const rows = await log._forRecipe({ recipe });

  expect(rows).toHaveLength(2);
  expect(rows.map((row) => row._id).sort()).toEqual(
    [first.entry, second.entry].sort()
  );

  expect(rows.every((row) => row.recipe === recipe)).toBe(true);

  expect(rows[0]!.createdAt.getTime()).toBeGreaterThanOrEqual(
    rows[1]!.createdAt.getTime()
  );
});
