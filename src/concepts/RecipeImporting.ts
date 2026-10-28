import {
  createGeminiExtractor, createGeminiTextExtractor, importedRecipeDraft, normalizeRecipeUrl,
  RecipeImportBusy, RecipeImportUnavailable, NoRecipeFound, InvalidImportUrl, InvalidImportText,
  type ImportedRecipeDraft, type RecipeExtractor, type RecipeTextExtractor,
} from "../recipe-import.ts";
import { validPastedRecipeInput } from "../recipe-import-input.ts";

export { RecipeImportBusy, RecipeImportUnavailable, NoRecipeFound, InvalidImportUrl, InvalidImportText };

/** Reads external recipe content without creating recipe identities or stored records. */
export class RecipeImportingConcept {
  private pending = 0;
  constructor(private readonly extractor: RecipeExtractor = createGeminiExtractor(),
    private readonly textExtractor: RecipeTextExtractor = createGeminiTextExtractor()) {}

  async extract({ url }: { url: string }): Promise<{ draft: ImportedRecipeDraft }> {
    const source = normalizeRecipeUrl(url);
    return this.#extractDraft(() => this.extractor(source), source);
  }

  async extractText({ text }: { text: string }): Promise<{ draft: ImportedRecipeDraft }> {
    if (!validPastedRecipeInput(text)) throw new InvalidImportText("Paste the recipe page content. If it is too long, paste just the recipe.");
    return this.#extractDraft(() => this.textExtractor(text), "");
  }

  async #extractDraft(extract: () => Promise<unknown>, source: string): Promise<{ draft: ImportedRecipeDraft }> {
    if (this.pending >= 2) throw new RecipeImportBusy("Website import is busy. Try again shortly.");
    this.pending++;
    try {
      return { draft: importedRecipeDraft(await extract(), source) };
    } catch (cause) {
      if (cause instanceof NoRecipeFound || cause instanceof RecipeImportBusy || cause instanceof RecipeImportUnavailable) throw cause;
      throw new RecipeImportUnavailable("Website import is temporarily unavailable.");
    } finally { this.pending--; }
  }
}
