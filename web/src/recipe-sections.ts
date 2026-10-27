import { toRecipeSections, type RecipeContent, type RecipeSection } from "../../src/recipe-content.ts";

export type RecipeRow = { id: string; text: string };
export type EditableRecipeSection = { id: string; heading: string; showHeading: boolean; rows: RecipeRow[] };

export function createRecipeRow(text = ""): RecipeRow {
  return { id: crypto.randomUUID(), text };
}

export function createRecipeSection(section?: RecipeSection): EditableRecipeSection {
  return {
    id: crypto.randomUUID(), heading: section?.heading ?? "", showHeading: Boolean(section?.heading?.trim()),
    rows: section?.items.length ? section.items.map(createRecipeRow) : [createRecipeRow()],
  };
}

export function editableRecipeSections(content?: RecipeContent): EditableRecipeSection[] {
  return content?.length ? toRecipeSections(content).map(createRecipeSection) : [createRecipeSection()];
}

/** Save only recipe content, preserving section/row order and omitting untitled headings. */
export function serializeRecipeSections(sections: EditableRecipeSection[]): RecipeSection[] {
  return sections.map((section) => ({
    ...(section.heading.trim() ? { heading: section.heading.trim() } : {}),
    items: section.rows.map((row) => row.text.trim()),
  }));
}
