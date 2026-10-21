import { expect, test } from "bun:test";
import { testDatabase } from "./helpers/database.ts";
import {
  InvalidRecipe,
  DeleteRecipeNotFound,
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
});

test("preserves empty notes without requiring a source", async () => {
  const input = { title: "Rice", ingredients: ["Rice"], instructions: ["Cook."], notes: "" };
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
];

for (const [description, changes] of invalidCases) {
  test(`rejects ${description} without changing stored recipes`, async () => {
    await recipes.record(example);
    const stored = db.collection("recipeRecording.recipes");
    const before = await stored.find().toArray();
    await expect(
      recipes.record({ ...example, ...changes })
    ).rejects.toBeInstanceOf(InvalidRecipe);
    expect(await stored.find().toArray()).toEqual(before);
  });
}

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
