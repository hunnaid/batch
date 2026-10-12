import type { Collection, Db } from "mongodb";

/**
 * One cooking attempt associated with a recipe.
 * Changes describe adjustments relative to the original recipe.
 */
type EntryDocument = {
    _id: string;
    author: string;
    recipe: string;
    changes: string;
    result: string;
    createdAt: Date;
};

/** An entry must describe a change, a result, or both. */
export class InvalidCookingEntry extends Error {}

/** The requested entry does not exist. */
export class CookingEntryNotFound extends Error {}

/** Only the entry's author can edit it. */
export class CookingEntryNotOwned extends Error {}

/** An edit must retain changes, a result, or both. */
export class InvalidCookingEntryEdit extends Error {}

/**
 * Records cooking attempts while preserving earlier entries.
 * Recipe access is checked separately by the application's composition.
 */
export class CookingLogConcept {
    private readonly entries: Collection<EntryDocument>;

    /**
     * Select this concept's storage without performing a database operation.
     * @param db - The database used to store cooking entries.
     */
    constructor(db: Db) {
        this.entries = db.collection<EntryDocument>("cookingLog.entries");
    }

    /**
     * Records a new cooking attempt without modifying the original recipe.
     *
     * @param input - The author, recipe, adjustments, and result.
     * @returns The new entry's identifier.
     * @throws InvalidCookingEntry if both changes and result are blank.
     */
    async record({
        author,
        recipe,
        changes,
        result,
    }: {
        author: string;
        recipe: string;
        changes: string;
        result: string;
    }): Promise<{ entry: string }> {
        if (changes.trim().length === 0 && result.trim().length === 0) {
            throw new InvalidCookingEntry(
                "A cooking entry needs changes or a result."
            );
        }

        const entry = crypto.randomUUID();

        await this.entries.insertOne({
            _id: entry,
            author,
            recipe,
            changes,
            result,
            createdAt: new Date(),
        });

        return { entry };
    }

    /**
     * Retrieves a cooking entry by its identifier.
     *
     * @param input - The entry to retrieve.
     * @returns One row containing the entry, or no rows if it does not exist.
     */
    async _get({ entry }: { entry: string }): Promise<EntryDocument[]> {
        const document = await this.entries.findOne({ _id: entry });
        return document ? [document] : [];
    }

    /**
     * Updates an entry's changes and result without changing its authorship,
     * recipe, or creation time.
     *
     * @param input - The author, entry, and replacement text.
     * @returns An empty action result when the edit succeeds.
     * @throws CookingEntryNotFound if the entry does not exist.
     * @throws CookingEntryNotOwned if the supplied author does not own it.
     * @throws InvalidCookingEntryEdit if both replacement fields are blank.
     */
    async edit({
        author,
        entry,
        changes,
        result,
    }: {
        author: string;
        entry: string;
        changes: string;
        result: string;
    }): Promise<{}> {
        const existing = await this.entries.findOne({ _id: entry });

        if (!existing) {
            throw new CookingEntryNotFound("The cooking entry does not exist.");
        }

        if (existing.author !== author) {
            throw new CookingEntryNotOwned(
                "Only the author can edit this cooking entry."
            );
        }

        if (changes.trim().length === 0 && result.trim().length === 0) {
            throw new InvalidCookingEntryEdit(
                "A cooking entry needs changes or a result."
            );
        }

        await this.entries.updateOne(
            { _id: entry, author },
            { $set: { changes, result } }
        );

        return {};
    }

    /**
     * Lists a recipe's cooking entries, newest first.
     *
     * @param input - The recipe whose cooking history should be returned.
     * @returns All matching entries, or an empty array if none exist.
     */
    async _forRecipe({
        recipe,
    }: {
        recipe: string;
    }): Promise<EntryDocument[]> {
        return await this.entries
            .find({ recipe })
            .sort({ createdAt: -1, _id: 1 })
            .toArray();
    }
}
