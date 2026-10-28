const MAX_PASTED_RECIPE_BYTES = 750_000;
const MAX_PASTED_TEXT_CHARACTERS = 100_000;

export function isRecipeHtml(text: string): boolean {
  return /<(?:!doctype|html|body|h[1-6]|p|ul|ol|div|script|article|section)\b/i.test(text);
}

/** Shared by the browser and backend; it contains no provider code or credentials. */
export function validPastedRecipeInput(value: unknown): value is string {
  return typeof value === "string" && Boolean(value.trim()) &&
    new TextEncoder().encode(value).byteLength <= MAX_PASTED_RECIPE_BYTES &&
    (isRecipeHtml(value) || value.length <= MAX_PASTED_TEXT_CHARACTERS);
}
