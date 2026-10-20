import {
    afterAll,
    beforeAll,
    beforeEach,
    expect,
    test,
} from "bun:test";
import { MongoClient } from "mongodb";
import {
    ItemNotSaved,
    SavingConcept,
} from "../src/concepts/Saving.ts";

const url = process.env.MONGODB_URL;

if (!url) {
    throw new Error("MONGODB_URL is required to run these tests.");
}

const client = new MongoClient(url, {
    serverSelectionTimeoutMS: 3000,
});

/** Use a temporary database, separate from application data. */
const db = client.db(
    `batch_test_saving_${crypto.randomUUID().replaceAll("-", "")}`
);

const saving = new SavingConcept(db);
let connected = false;

beforeAll(async () => {
    await client.connect();
    connected = true;
});

/** Each test starts with an empty personal saved list. */
beforeEach(async () => {
    await db.dropDatabase();
});

afterAll(async () => {
    try {
        if (connected) {
            await db.dropDatabase();
        }
    } finally {
        await client.close();
    }
});

test("saving an item makes it available in the user's personal list", async () => {
    const before = Date.now();

    expect(
        await saving.save({ user: "alice", item: "recipe-1" })
    ).toEqual({});

    const after = Date.now();

    expect(
        await saving.authorize({ user: "alice", item: "recipe-1" })
    ).toEqual({});

    const rows = await saving._forUser({ user: "alice" });

    expect(rows).toHaveLength(1);

    const row = rows[0]!;

    expect(row.item).toBe("recipe-1");
    expect(row.savedAt).toBeInstanceOf(Date);
    expect(row.savedAt.getTime()).toBeGreaterThanOrEqual(before);
    expect(row.savedAt.getTime()).toBeLessThanOrEqual(after);
});

test("a user with no saved items has an empty list", async () => {
    expect(
        await saving._forUser({ user: "alice" })
    ).toEqual([]);
});

test("saving an item again preserves its date and avoids duplicates", async () => {
    await saving.save({ user: "alice", item: "recipe-1" });

    const before = await saving._forUser({ user: "alice" });

    // Ensure a mistakenly replaced timestamp would be different.
    await new Promise((resolve) => setTimeout(resolve, 10));

    await saving.save({ user: "alice", item: "recipe-1" });

    expect(
        await saving._forUser({ user: "alice" })
    ).toEqual(before);
});

test("users can save the same item independently", async () => {
    await saving.save({ user: "alice", item: "recipe-1" });

    const aliceBefore = await saving._forUser({ user: "alice" });

    await saving.save({ user: "bob", item: "recipe-1" });
    await saving.save({ user: "bob", item: "recipe-2" });

    expect(
        await saving._forUser({ user: "alice" })
    ).toEqual(aliceBefore);

    const bobItems = await saving._forUser({ user: "bob" });

    expect(
        bobItems.map((row) => row.item).sort()
    ).toEqual(["recipe-1", "recipe-2"]);

    expect(
        await saving.authorize({ user: "bob", item: "recipe-1" })
    ).toEqual({});
});

test("another user's save does not grant access or change either list", async () => {
    await saving.save({ user: "alice", item: "recipe-1" });

    const aliceBefore = await saving._forUser({ user: "alice" });
    const bobBefore = await saving._forUser({ user: "bob" });

    await expect(
        saving.authorize({ user: "bob", item: "recipe-1" })
    ).rejects.toBeInstanceOf(ItemNotSaved);

    expect(
        await saving._forUser({ user: "alice" })
    ).toEqual(aliceBefore);

    expect(
        await saving._forUser({ user: "bob" })
    ).toEqual(bobBefore);
});

test("an unsaved item is refused without changing existing saves", async () => {
    await saving.save({ user: "alice", item: "recipe-1" });

    const before = await saving._forUser({ user: "alice" });

    await expect(
        saving.authorize({ user: "alice", item: "unknown" })
    ).rejects.toBeInstanceOf(ItemNotSaved);

    expect(
        await saving._forUser({ user: "alice" })
    ).toEqual(before);
});

test("lists newer saves before older saves", async () => {
    await saving.save({ user: "alice", item: "older-recipe" });

    await new Promise((resolve) => setTimeout(resolve, 10));

    await saving.save({ user: "alice", item: "newer-recipe" });

    const rows = await saving._forUser({ user: "alice" });

    expect(rows.map((row) => row.item)).toEqual([
        "newer-recipe",
        "older-recipe",
    ]);

    expect(rows[0]!.savedAt.getTime()).toBeGreaterThan(
        rows[1]!.savedAt.getTime()
    );
});
