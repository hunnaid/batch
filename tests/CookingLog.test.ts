import { afterEach, expect, setSystemTime, test } from "bun:test";
import { testDatabase } from "./helpers/database.ts";
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
const db = testDatabase("cookinglog");

const log = new CookingLogConcept(db);
afterEach(() => setSystemTime());

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

test("rejects an entry when both text fields are blank without changing history", async () => {
  await log.record(example);
  const before = await log._forRecipe({ recipe: example.recipe });
  await expect(
    log.record({
      ...example,
      changes: "  ",
      result: "",
    })
  ).rejects.toBeInstanceOf(InvalidCookingEntry);
  expect(await log._forRecipe({ recipe: example.recipe })).toEqual(before);
});

test("returns no rows for an unknown entry", async () => {
  expect(
    await log._get({ entry: crypto.randomUUID() })
  ).toEqual([]);
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

test("editing an unknown entry is refused without creating or changing entries", async () => {
  await log.record(example);
  const stored = db.collection("cookingLog.entries");
  const before = await stored.find().toArray();
  await expect(
    log.edit({
      author: example.author,
      entry: crypto.randomUUID(),
      changes: example.changes,
      result: example.result,
    })
  ).rejects.toBeInstanceOf(CookingEntryNotFound);
  expect(await stored.find().toArray()).toEqual(before);
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

test("lists attempts newest first, preserving earlier entries and excluding other recipes", async () => {
  const now = new Date("2026-01-01T00:00:00.000Z");
  setSystemTime(now);
  const recipe = crypto.randomUUID();

  expect(await log._forRecipe({ recipe })).toEqual([]);

  const first = await log.record({
    ...example,
    recipe,
  });

  const original = await log._get({ entry: first.entry });
  setSystemTime(now.getTime() + 1000);
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
  expect(rows.map((row) => row._id)).toEqual([second.entry, first.entry]);
  expect(await log._get({ entry: first.entry })).toEqual(original);

  expect(rows.every((row) => row.recipe === recipe)).toBe(true);

  expect(rows[0]!.createdAt.getTime()).toBeGreaterThanOrEqual(
    rows[1]!.createdAt.getTime()
  );
});

test("clearing a recipe removes attempts by all authors and preserves other histories", async () => {
  for (const author of ["alice", "bob"]) {
    await log.record({ ...example, author, recipe: "delete" });
    await log.record({ ...example, author, recipe: "keep" });
  }
  const before = await log._forRecipe({ recipe: "keep" });
  for (const recipe of ["delete", "delete", "missing"]) {
    expect(await log.clearRecipe({ recipe })).toEqual({});
    expect(await log._forRecipe({ recipe: "delete" })).toEqual([]);
    expect(await log._forRecipe({ recipe: "keep" })).toEqual(before);
  }
});
