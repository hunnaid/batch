import { expect, test } from "bun:test";
import { testDatabase } from "./helpers/database.ts";
import {
  InvalidRecipe,
  DeleteRecipeNotFound,
  EditRecipeNotFound,
  RecipeRecordingConcept,
  type RecipeData,
} from "../src/concepts/RecipeRecording.ts";

/**
 * Connect to the configured server using a separate test database.
 * This keeps test records separate from the application's data.
 */
const db = testDatabase("reciperecording");

const recipes = new RecipeRecordingConcept(db);

const example: RecipeData = {
  title: "Mom's Biryani",
  ingredients: ["2 cups rice", "1 tsp chili"],
  instructions: ["Prepare the rice.", "Add spices and steam."],
  source: "Mom, through iMessage",
  notes: "Let the rice rest for 10 minutes.\nFluff gently before serving.",
  description: "Mom's family recipe.\nA favorite for celebrations.",
};

test("records and retrieves all recipe details in order", async () => {
  const { recipe } = await recipes.record(example);

  expect(recipe.length).toBeGreaterThan(0);
  expect(await recipes._get({ recipe })).toEqual([example]);
});

test("allows a recipe without a source", async () => {
  const input: RecipeData = {
    title: "Rice",
    ingredients: ["1 cup rice", "Water"],
    instructions: ["Cook the rice."],
  };

  const { recipe } = await recipes.record(input);
  const rows = await recipes._get({ recipe });

  expect(rows).toEqual([input]);
  expect(rows[0]).not.toHaveProperty("source");
  expect(rows[0]).not.toHaveProperty("notes");
  expect(rows[0]).not.toHaveProperty("description");
});

test("preserves empty notes and description without requiring a source", async () => {
  const input = { title: "Rice", ingredients: ["Rice"], instructions: ["Cook."], notes: "", description: "" };
  const { recipe } = await recipes.record(input);
  expect(await recipes._get({ recipe })).toEqual([input]);
});

test("returns no rows for an unknown recipe", async () => {
  expect(
    await recipes._get({ recipe: crypto.randomUUID() })
  ).toEqual([]);
});

test("recording another recipe preserves the first", async () => {
  const first = await recipes.record(example);
  const second = await recipes.record({
    ...example,
    title: "Another recipe",
  });

  expect(first.recipe).not.toBe(second.recipe);

  expect(
    await recipes._get({ recipe: first.recipe })
  ).toEqual([example]);

  expect(
    await recipes._get({ recipe: second.recipe })
  ).toEqual([{ ...example, title: "Another recipe" }]);
});

/**
 * Change one part of a valid recipe to test each validation rule.
 */
const invalidCases: [string, Partial<RecipeData>][] = [
  ["empty title", { title: "" }],
  ["whitespace title", { title: "   " }],
  ["empty ingredients", { ingredients: [] }],
  ["empty instructions", { instructions: [] }],
  ["blank ingredient", { ingredients: ["Rice", "  "] }],
  ["blank instruction", { instructions: ["Prepare rice.", ""] }],
  ["empty ingredient section", { ingredients: [{ heading: "Sauce", items: [] }] }],
  ["empty instruction section", { instructions: [{ heading: "Sauce", items: [] }] }],
  ["blank item inside an ingredient section", { ingredients: [{ items: ["Rice"] }, { items: [" "] }] }],
  ["blank item inside an instruction section", { instructions: [{ items: ["Cook."] }, { items: [" "] }] }],
];

for (const [description, changes] of invalidCases) {
  test(`rejects ${description} on record and edit without changing stored recipes`, async () => {
    const { recipe } = await recipes.record(example);
    const stored = db.collection("recipeRecording.recipes");
    const before = await stored.find().toArray();
    await expect(
      recipes.record({ ...example, ...changes })
    ).rejects.toBeInstanceOf(InvalidRecipe);
    await expect(recipes.edit({ recipe, ...example, ...changes }))
      .rejects.toBeInstanceOf(InvalidRecipe);
    expect(await stored.find().toArray()).toEqual(before);
  });
}

test("recording and editing preserve optional headings, section order and row order", async () => {
  const grouped: RecipeData = {
    ...example,
    ingredients: [
      { items: ["Butter for the pan"] },
      { heading: "Cake", items: ["Flour", "Cocoa", "Sugar"] },
      { heading: "Buttercream", items: ["Butter", "Icing sugar"] },
    ],
    instructions: [
      { heading: "Make the cake", items: ["Mix dry ingredients.", "Bake."] },
      { heading: "Make the buttercream", items: ["Beat the butter.", "Add sugar."] },
      { heading: "", items: ["Assemble."] },
    ],
  };
  const { recipe } = await recipes.record(grouped);
  expect(await recipes._get({ recipe })).toEqual([grouped]);
  const revised = {
    ...grouped,
    ingredients: [{ heading: "Buttercream", items: ["Icing sugar", "Butter"] }, { items: ["Cake"] }],
    instructions: [{ items: ["Assemble first.", "Chill."] }],
  };
  await recipes.edit({ recipe, ...revised });
  expect(await recipes._get({ recipe })).toEqual([revised]);
});

test("plain lists and section lists can be used independently and converted without changing recipe identity", async () => {
  const mixedFormats: RecipeData = {
    ...example,
    ingredients: [{ heading: "Rice", items: ["Rice", "Water"] }],
  };
  const { recipe } = await recipes.record(mixedFormats);
  expect(await recipes._get({ recipe })).toEqual([mixedFormats]);
  await recipes.edit({ recipe, ...example });
  expect(await recipes._get({ recipe })).toEqual([example]);
});

test("editing replaces details in order while preserving the identifier and other recipes", async () => {
  const first = await recipes.record(example);
  const other = await recipes.record({ ...example, title: "Keep" });
  const replacement = {
    title: "Revised biryani", ingredients: ["Water", "Rice", "Salt"],
    instructions: ["Rinse.", "Cook.", "Rest."], source: "Family cookbook",
    notes: "Rest ten minutes.\nServe hot.", description: "Updated family version.",
  };
  expect(await recipes.edit({ ...first, ...replacement })).toEqual({});
  expect(await recipes._get(first)).toEqual([replacement]);
  expect(await recipes._get(other)).toEqual([{ ...example, title: "Keep" }]);
  expect(await db.collection("recipeRecording.recipes").countDocuments()).toBe(2);
});

test("editing can clear optional details using empty strings or omitted fields", async () => {
  const { recipe } = await recipes.record(example);
  const required = { title: "Rice", ingredients: ["Rice"], instructions: ["Cook."] };
  const empty = { ...required, source: "", notes: "", description: "" };
  await recipes.edit({ recipe, ...empty });
  expect(await recipes._get({ recipe })).toEqual([empty]);
  await recipes.edit({ recipe, ...required });
  expect(await recipes._get({ recipe })).toEqual([required]);
});

test("editing an unknown or deleted recipe never recreates it", async () => {
  const first = await recipes.record(example);
  await recipes.delete(first);
  const other = await recipes.record({ ...example, title: "Keep" });
  for (const recipe of [first.recipe, "missing"]) {
    await expect(recipes.edit({ recipe, ...example })).rejects.toBeInstanceOf(EditRecipeNotFound);
    expect(await recipes._get({ recipe })).toEqual([]);
    expect(await recipes._get(other)).toEqual([{ ...example, title: "Keep" }]);
  }
});

test("deletion removes only the selected recipe and rejects repeated or unknown deletion", async () => {
  const first = await recipes.record(example);
  const other = await recipes.record({ ...example, title: "Keep" });
  const before = await recipes._get(other);
  expect(await recipes.delete(first)).toEqual({});
  expect(await recipes._get(first)).toEqual([]);
  for (const recipe of [first.recipe, "missing"]) {
    await expect(recipes.delete({ recipe })).rejects.toBeInstanceOf(DeleteRecipeNotFound);
    expect(await recipes._get(other)).toEqual(before);
  }
});
