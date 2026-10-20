import type { Collection, Db } from "mongodb";

/** An item saved to one user's personal list. */
type SavedItemDocument = {
    _id: string;
    user: string;
    item: string;
    savedAt: Date;
};

/** The requested item is not in this user's personal list. */
export class ItemNotSaved extends Error {}

/**
 * Maintains personal saved lists independently of collections.
 * Saving does not assume anything about the items' contents.
 */
export class SavingConcept {
    private readonly savedItems: Collection<SavedItemDocument>;

    /**
     * Select storage without performing a database operation.
     * @param db - The database containing users' saved lists.
     */
    constructor(db: Db) {
        this.savedItems = db.collection<SavedItemDocument>(
            "saving.items"
        );
    }

    /**
     * Save an item, preserving its original addition time on repeated saves.
     *
     * @param input - The user and item to associate.
     * @returns An empty result after the association exists.
     */
    async save(
        { user, item }: { user: string; item: string }
    ): Promise<{}> {
        // Encoding the pair gives each user/item association one unique key.
        const id = JSON.stringify([user, item]);

        await this.savedItems.updateOne(
            { _id: id },
            {
                $setOnInsert: {
                    user,
                    item,
                    savedAt: new Date(),
                },
            },
            { upsert: true }
        );

        return {};
    }

    /**
     * Check that an item belongs to the user's personal saved list.
     *
     * @throws ItemNotSaved if this user has not saved the item.
     */
    async authorize(
        { user, item }: { user: string; item: string }
    ): Promise<{}> {
        const document = await this.savedItems.findOne({
            _id: JSON.stringify([user, item]),
        });

        if (!document) {
            throw new ItemNotSaved(
                "This item is not in your saved list."
            );
        }

        return {};
    }

    /**
     * List a user's saved items, newest first.
     * The identifier provides consistent ordering when timestamps match.
     */
    async _forUser(
        { user }: { user: string }
    ): Promise<{ item: string; savedAt: Date }[]> {
        const documents = await this.savedItems
            .find({ user })
            .sort({ savedAt: -1, _id: 1 })
            .toArray();

        return documents.map((document) => ({
            item: document.item,
            savedAt: document.savedAt,
        }));
    }
}
