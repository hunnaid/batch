/** One ordered part of a recipe; an absent or blank heading is untitled. */
export type RecipeSection = { heading?: string; items: string[] };

/** Plain lists remain valid for recipes saved before sections were introduced. */
export type RecipeContent = string[] | RecipeSection[];

/** Check JSON structure at the boundary; RecipeRecording checks required content. */
export function isRecipeContent(value: unknown): value is RecipeContent {
  if (!Array.isArray(value)) return false;
  return value.every((item) => typeof item === "string") || value.every((section: unknown) => {
    if (typeof section !== "object" || section === null || Array.isArray(section)) return false;
    const fields = section as Record<string, unknown>;
    return (fields.heading === undefined || typeof fields.heading === "string") &&
      Array.isArray(fields.items) && fields.items.every((item) => typeof item === "string");
  });
}

/** Present an older flat list as one untitled section without changing storage. */
export function toRecipeSections(content: RecipeContent): RecipeSection[] {
  if (content.every((item) => typeof item === "string")) return [{ items: content as string[] }];
  return content as RecipeSection[];
}
