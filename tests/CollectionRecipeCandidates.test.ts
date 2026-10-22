import { expect, test } from "bun:test";
import { collectionRecipeCandidates } from "../web/src/collection-recipes.ts";

test("the picker excludes destination recipes even when they also have other access paths", () => {
  const already = { recipe: "already", title: "Already collected" };
  expect(collectionRecipeCandidates(
    [already, { recipe: "personal", title: "Personal" }],
    [
      { collection: "destination", recipes: [already] },
      { collection: "source", recipes: [already, { recipe: "other", title: "Other" }] },
    ],
    "destination",
  )).toEqual([
    { recipe: "other", title: "Other", sourceCollection: "source" },
    { recipe: "personal", title: "Personal" },
  ]);
});

test("the picker deduplicates recipe identifiers and prefers personal access", () => {
  const personal = { recipe: "personal", title: "Personal" };
  const shared = { recipe: "shared", title: "Shared" };
  expect(collectionRecipeCandidates([personal], [
    { collection: "first", recipes: [personal, shared] },
    { collection: "second", recipes: [shared] },
  ], "destination")).toEqual([
    personal,
    { ...shared, sourceCollection: "first" },
  ]);
});

test("different recipes with the same title remain selectable and sort deterministically", () => {
  const personal = [
    { recipe: "b", title: "Soup" },
    { recipe: "a", title: "Soup" },
    { recipe: "c", title: "Bread" },
  ];
  const before = structuredClone(personal);
  expect(collectionRecipeCandidates(personal, [], "destination").map((item) => item.recipe))
    .toEqual(["c", "a", "b"]);
  expect(personal).toEqual(before);
});

test("the picker handles empty sources and a collection containing every available recipe", () => {
  expect(collectionRecipeCandidates([], [], "destination")).toEqual([]);
  const recipe = { recipe: "only", title: "Only recipe" };
  expect(collectionRecipeCandidates([recipe], [
    { collection: "destination", recipes: [recipe] },
  ], "destination")).toEqual([]);
});
