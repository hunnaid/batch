import { endpoint, receive, respond } from "@mit-sdg/sync-engine/boundary";
import { concepts } from "../concepts.ts";

const { Sessioning, Sharing, RecipeImporting } = concepts;

function inputWith(...fields: string[]) {
  return (value: unknown) => {
    if (typeof value !== "object" || value === null || Array.isArray(value)) return { ok: false };
    const input = value as Record<string, unknown>;
    return { ok: (typeof input.session === "string" || input.session === null) &&
      fields.every((field) => typeof input[field] === "string") };
  };
}

const ImportPersonalRecipe = endpoint(
  "/recipes/import-personal",
  ({ session, url, user, draft }) => receive({ session, url })
    .then(Sessioning.resolve({ session }).responds({ user }))
    .then(RecipeImporting.extract({ url }).responds({ draft }))
    .then(respond({ draft })),
  { validators: { input: inputWith("url") } }
);

/** Check the intended destination before spending an external extraction request. */
const ImportRecipeToCollection = endpoint(
  "/recipes/import",
  ({ session, collection, url, user, draft }) => receive({ session, collection, url })
    .then(Sessioning.resolve({ session }).responds({ user }))
    .then(Sharing.authorize({ user, resource: collection }))
    .then(RecipeImporting.extract({ url }).responds({ draft }))
    .then(respond({ draft })),
  { validators: { input: inputWith("collection", "url") } }
);

const ImportPersonalRecipeText = endpoint(
  "/recipes/import-text-personal",
  ({ session, text, user, draft }) => receive({ session, text })
    .then(Sessioning.resolve({ session }).responds({ user }))
    .then(RecipeImporting.extractText({ text }).responds({ draft }))
    .then(respond({ draft })),
  { validators: { input: inputWith("text") } }
);

const ImportRecipeTextToCollection = endpoint(
  "/recipes/import-text",
  ({ session, collection, text, user, draft }) => receive({ session, collection, text })
    .then(Sessioning.resolve({ session }).responds({ user }))
    .then(Sharing.authorize({ user, resource: collection }))
    .then(RecipeImporting.extractText({ text }).responds({ draft }))
    .then(respond({ draft })),
  { validators: { input: inputWith("collection", "text") } }
);

export const composition = { ImportPersonalRecipe, ImportRecipeToCollection, ImportPersonalRecipeText, ImportRecipeTextToCollection };
