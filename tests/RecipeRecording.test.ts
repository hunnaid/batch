import { afterAll, beforeAll, expect, test } from "bun:test";
import { MongoClient } from "mongodb";
import {
  InvalidRecipe,
  RecipeRecordingConcept,
  type RecipeData,
} from "../src/concepts/RecipeRecording.ts";

/**
 * Connect to the configured server using a separate test database.
 * This keeps test records separate from the application's data.
 */
const url = process.env.MONGODB_URL;

if (!url) {
  throw new Error("MONGODB_URL is required to run these tests.");
}

const client = new MongoClient(url, {
  serverSelectionTimeoutMS: 3000,
});

const db = client.db(
  `batch_test_recipe_${crypto.randomUUID().replaceAll("-", "")}`
);

const recipes = new RecipeRecordingConcept(db);
let connected = false;

// Establish the connection before running any tests.
beforeAll(async () => {
  await client.connect();
  connected = true;
});

// Remove only this run's temporary database, then close the connection.
afterAll(async () => {
  try {
    if (connected) {
      await db.dropDatabase();
    }
  } finally {
    await client.close();
  }
});

const example: RecipeData = {
  title: "Mom's Biryani",
  ingredients: ["2 cups rice", "1 tsp chili"],
  instructions: ["Prepare the rice.", "Add spices and steam."],
  source: "Mom, through iMessage",
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
  test(`rejects ${description}`, async () => {
    await expect(
      recipes.record({ ...example, ...changes })
    ).rejects.toBeInstanceOf(InvalidRecipe);
  });
}
