import type { Collection, Db } from "mongodb";

/**
 * A named group of item identifiers.
 * The concept does not need to know what those items represent.
 */
type CollectionDocument = {
    _id: string;
    creator: string;
    name: string;
    items: string[];
};

/** A collection must have a nonblank name. */
export class InvalidCollectionName extends Error {}

/** The requested collection does not exist. */
export class CollectionNotFound extends Error {}

/** The item is already in the collection. */
export class ItemAlreadyCollected extends Error {}

/**
 * Organizes items into collections.
 * Access control belongs in the application composition.
 */
export class CollectingConcept {
    private readonly collections: Collection<CollectionDocument>;

    /**
     * Select this concept's storage without contacting MongoDB.
     * @param db - The database used to store collections.
     */
    constructor(db: Db) {
        this.collections = db.collection<CollectionDocument>(
            "collecting.collections"
        );
    }

    /**
     * Creates an empty, named collection.
     *
     * @param input - The creator's identifier and collection name.
     * @returns The new collection's identifier.
     * @throws InvalidCollectionName if the name is blank.
     */
    async create(
        { creator, name }: { creator: string; name: string }
    ): Promise<{ collection: string }> {
        if (name.trim().length === 0) {
            throw new InvalidCollectionName(
                "The collection name cannot be blank."
            );
        }

        const collection = crypto.randomUUID();

        await this.collections.insertOne({
            _id: collection,
            creator,
            name,
            items: [],
        });

        return { collection };
    }

    /**
     * Adds an item identifier to an existing collection.
     *
     * @param input - The collection and item identifiers.
     * @returns An empty result after the item is added.
     * @throws CollectionNotFound if the collection does not exist.
     * @throws ItemAlreadyCollected if it already contains the item.
     */
    async add(
        { collection, item }: { collection: string; item: string }
    ): Promise<{}> {
        const result = await this.collections.updateOne(
            { _id: collection },
            { $addToSet: { items: item } }
        );

        if (result.matchedCount === 0) {
            throw new CollectionNotFound("The collection does not exist.");
        }

        if (result.modifiedCount === 0) {
            throw new ItemAlreadyCollected(
            "The item is already in the collection."
            );
        }

        return {};
    }

    /**
     * Retrieves a collection's details and item identifiers.
     *
     * @param input - The collection identifier.
     * @returns One row with its details, or no rows if it does not exist.
     */
    async _get(
        { collection }: { collection: string }
    ): Promise<{ creator: string; name: string; items: string[] }[]> {
        const document = await this.collections.findOne({
            _id: collection,
        });

        if (!document) {
            return [];
        }

        return [{
            creator: document.creator,
            name: document.name,
            items: [...document.items].sort(),
        }];
    }

    /**
     * Lists the items belonging to a collection as individual rows.
     *
     * @param input - The collection whose items should be returned.
     * @returns One row per item, or no rows for an empty or unknown collection.
     */
    async _items({
        collection,
    }: {
        collection: string;
    }): Promise<{ item: string }[]> {
        const document = await this.collections.findOne({ _id: collection });

        if (!document) {
            return [];
        }

        return [...document.items]
            .sort()
            .map((item) => ({ item }));
    }
}
