import type { Collection, Db } from "mongodb";
import { isRecipeContent, toRecipeSections, type RecipeContent } from "../recipe-content.ts";

/**
 * The original recipe details supplied by a cook
 * Ingredients and instructions preserve their order
 * Source may be a URL or a description such as "Mom, through iMessage"
 */
export type RecipeData = {
  title: string;
  ingredients: RecipeContent;
  instructions: RecipeContent;
  source?: string;
  notes?: string;
  description?: string;
};

/**
 * A stored recipe includes a unique identifier in addition to its details
 * MongoDB uses the _id field to identify each document
 */
type RecipeDocument = RecipeData & {
    _id: string;
};

/**
 * Indicates that recipe details do not satisfy the recording requirements
 */
export class InvalidRecipe extends Error{}

/** The recipe to delete does not exist. */
export class DeleteRecipeNotFound extends Error {}
export class EditRecipeNotFound extends Error {}

/** Recording and editing accept the same details and preserve optional text. */
function validatedDetails(input: RecipeData): RecipeData {
    const { title, ingredients, instructions, source, notes, description } = input;
    if (!title.trim()) throw new InvalidRecipe("The recipe title cannot be blank.");
    for (const content of [ingredients, instructions]) {
        if (!isRecipeContent(content) || content.length === 0) {
            throw new InvalidRecipe("A recipe needs nonempty ingredient and instruction lists.");
        }
        if (toRecipeSections(content).some((section) =>
            section.items.length === 0 || section.items.some((item) => !item.trim()))) {
            throw new InvalidRecipe("Each section needs at least one item, with no blank rows.");
        }
    }
    return {
        title, ingredients, instructions,
        ...(source !== undefined ? { source } : {}),
        ...(notes !== undefined ? { notes } : {}),
        ...(description !== undefined ? { description } : {}),
    };
}

/**
 * Stores original recipes independently of collections and cooking entries
 */
export class RecipeRecordingConcept {
    private readonly recipes: Collection<RecipeDocument>;

    /**
     * Select this concept's storage within the supplied database.
     * No database operation runs during construction.
     * @param db the database used to store this concept's recipes
     */
    constructor(db: Db) {
        this.recipes = db.collection<RecipeDocument>(
            "recipeRecording.recipes"
        );
    }

    /**
     * Stores an original recipe and returns its identifier.
     *
     * @param input - The recipe details to save.
     * @returns The identifier of the newly stored recipe.
     * @throws InvalidRecipe if the title or recipe lists contain missing details.
     */
    async record(input: RecipeData): Promise<{ recipe: string }> {
        const details = validatedDetails(input);
        const recipe = crypto.randomUUID();
        await this.recipes.insertOne({ _id: recipe, ...details });
        return { recipe };
    }

    /** Replace one original recipe's details without changing its identifier. */
    async edit(input: RecipeData & { recipe: string }): Promise<{}> {
        const details = validatedDetails(input);
        const result = await this.recipes.replaceOne(
            { _id: input.recipe }, details
        );
        if (result.matchedCount === 0) throw new EditRecipeNotFound("The recipe does not exist.");
        return {};
    }

    /**
     * Retrieves the original details of a recipe.
     *
     * @param input - The identifier of the recipe to retrieve.
     * @returns One row containing the details, or no rows if it does not exist.
     */
    async _get(
        { recipe }: { recipe: string }
        ): Promise<RecipeData[]> {
        const document = await this.recipes.findOne({ _id: recipe });

        if (!document) {
            return [];
        }

        const details: RecipeData = {
            title: document.title,
            ingredients: document.ingredients,
            instructions: document.instructions,
        };

        if (document.source !== undefined) {
            details.source = document.source;
        }
        if (document.notes !== undefined) {
            details.notes = document.notes;
        }
        if (document.description !== undefined) {
            details.description = document.description;
        }

        return [details];
    }
    /** Delete only the original recipe; the composition coordinates related cleanup. */
    async delete({ recipe }: { recipe: string }): Promise<{}> {
        const result = await this.recipes.deleteOne({ _id: recipe });
        if (result.deletedCount === 0) {
            throw new DeleteRecipeNotFound("The recipe does not exist.");
        }
        return {};
    }

}
