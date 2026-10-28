import { isRecipeContent } from "./recipe-content.ts";

function isInputObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** Check field types only; each concept still enforces its own content rules. */
export function stringInput(...fields: string[]) {
  return (value: unknown) => ({
    ok: isInputObject(value) && fields.every((field) => typeof value[field] === "string"),
  });
}

/** A missing cookie supplies null. Sessioning decides whether the token is valid. */
export function sessionInput(...fields: string[]) {
  const strings = stringInput(...fields);
  return (value: unknown) => ({
    ok: isInputObject(value) &&
      (value.session === null || typeof value.session === "string") && strings(value).ok,
  });
}

/** Saving and editing accept the same recipe shape, including legacy flat lists. */
export function recipeInput(...fields: string[]) {
  const session = sessionInput("title", ...fields);
  return (value: unknown) => ({
    ok: isInputObject(value) && session(value).ok &&
      isRecipeContent(value.ingredients) && isRecipeContent(value.instructions) &&
      [value.source, value.notes, value.description].every((field) =>
        field === undefined || typeof field === "string"),
  });
}
