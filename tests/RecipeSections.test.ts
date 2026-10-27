import { expect, test } from "bun:test";
import { isRecipeContent, toRecipeSections } from "../src/recipe-content.ts";
import { createRecipeRow, createRecipeSection, editableRecipeSections, serializeRecipeSections } from "../web/src/recipe-sections.ts";

test("older recipes enter the section editor as one untitled section without mutating saved data", () => {
  const original = ["Rice", "Water"];
  const draft = editableRecipeSections(original);
  expect(draft).toHaveLength(1);
  expect(draft[0]!.heading).toBe("");
  expect(draft[0]!.showHeading).toBe(false);
  draft[0]!.rows[0]!.text = "Brown rice";
  expect(original).toEqual(["Rice", "Water"]);
  expect(serializeRecipeSections(draft)).toEqual([{ items: ["Brown rice", "Water"] }]);
  expect(toRecipeSections(original)).toEqual([{ items: ["Rice", "Water"] }]);
});

test("section editing preserves order and duplicate text while excluding UI identifiers from saved content", () => {
  const draft = editableRecipeSections([
    { heading: "Cake", items: ["Sugar", "Flour"] },
    { heading: "Buttercream", items: ["Sugar", "Butter"] },
  ]);
  draft[0]!.rows.splice(1, 0, createRecipeRow(" Cocoa "));
  draft[1]!.heading = "  Icing  ";
  draft.push(createRecipeSection({ items: ["Serve"] }));
  expect(serializeRecipeSections(draft)).toEqual([
    { heading: "Cake", items: ["Sugar", "Cocoa", "Flour"] },
    { heading: "Icing", items: ["Sugar", "Butter"] },
    { items: ["Serve"] },
  ]);
  expect(new Set(draft.flatMap((section) => [section.id, ...section.rows.map((row) => row.id)])).size).toBe(9);
});

test("a simple recipe starts with one blank untitled section and headings stay optional", () => {
  const draft = editableRecipeSections();
  expect(draft).toHaveLength(1);
  expect(draft[0]!.rows).toHaveLength(1);
  draft[0]!.heading = "  ";
  draft[0]!.rows[0]!.text = "Cook";
  expect(serializeRecipeSections(draft)).toEqual([{ items: ["Cook"] }]);
});

test("recipe content accepts either format but refuses malformed sections and mixed lists", () => {
  for (const content of [["Rice"], [{ items: ["Rice"] }], [{ heading: "Rice", items: ["Rice"] }]]) {
    expect(isRecipeContent(content)).toBe(true);
  }
  for (const content of [null, "Rice", [null], [{ heading: "Cake" }], [{ items: "Rice" }],
    [{ heading: 1, items: ["Rice"] }], [{ items: [1] }], ["Rice", { items: ["Water"] }]]) {
    expect(isRecipeContent(content)).toBe(false);
  }
});
