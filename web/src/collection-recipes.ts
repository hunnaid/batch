export type RecipeSummary = { recipe: string; title: string };
export type RecipeCandidate = RecipeSummary & { sourceCollection?: string };

/** Keep one usable access path per recipe, preferring a personal save. */
export function collectionRecipeCandidates(
  personal: RecipeSummary[],
  collections: { collection: string; recipes: RecipeSummary[] }[],
  destination: string,
): RecipeCandidate[] {
  const existing = new Set(collections.find((item) => item.collection === destination)
    ?.recipes.map((item) => item.recipe) ?? []);
  const candidates = new Map<string, RecipeCandidate>();
  for (const recipe of personal) candidates.set(recipe.recipe, { ...recipe });
  for (const collection of collections) {
    for (const recipe of collection.recipes) {
      if (!candidates.has(recipe.recipe)) {
        candidates.set(recipe.recipe, { ...recipe, sourceCollection: collection.collection });
      }
    }
  }
  return [...candidates.values()]
    .filter((recipe) => !existing.has(recipe.recipe))
    .sort((a, b) => a.title.localeCompare(b.title) || a.recipe.localeCompare(b.recipe));
}
