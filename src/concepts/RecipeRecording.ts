import type { Collection, Db } from "mongodb";

/**
 * The original recipe details supplied by a cook
 * Ingredients and instructions preserve their order
 * Source may be a URL or a description such as "Mom, through iMessage"
 */
export type RecipeData = {
  title: string;
  ingredients: string[];
  instructions: string[];
  source?: string;
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
        const { title, ingredients, instructions, source } = input;

        if (title.trim().length === 0) {
            throw new InvalidRecipe("The recipe title cannot be blank.");
        }

        if (ingredients.length === 0 || instructions.length === 0) {
            throw new InvalidRecipe(
            "A recipe needs at least one ingredient and one instruction."
            );
        }

        if (
            ingredients.some((item) => item.trim().length === 0) ||
            instructions.some((item) => item.trim().length === 0)
        ) {
            throw new InvalidRecipe(
            "Ingredients and instructions cannot contain blank items."
            );
        }

        const recipe = crypto.randomUUID();

        const document: RecipeDocument = {
            _id: recipe,
            title,
            ingredients,
            instructions,
        };

        // Leave the optional field absent when no source was supplied.
        if (source !== undefined) {
            document.source = source;
        }

        await this.recipes.insertOne(document);

        return { recipe };
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

        return [details];
    }
}
