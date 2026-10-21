import { afterEach, expect, setSystemTime, test } from "bun:test";
import { testDatabase } from "./helpers/database.ts";
import {
    ItemNotSaved,
    SavingConcept,
} from "../src/concepts/Saving.ts";

const db = testDatabase("saving");

const saving = new SavingConcept(db);
const now = new Date("2026-01-01T00:00:00.000Z");
afterEach(() => setSystemTime());

test("saving an item makes it available in the user's personal list", async () => {
    expect(await saving._forUser({ user: "alice" })).toEqual([]);
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

test("saving an item again preserves its date and avoids duplicates", async () => {
    setSystemTime(now);
    await saving.save({ user: "alice", item: "recipe-1" });

    const before = await saving._forUser({ user: "alice" });

    setSystemTime(now.getTime() + 1000);

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
    setSystemTime(now);
    await saving.save({ user: "alice", item: "older-recipe" });

    setSystemTime(now.getTime() + 1000);

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

test("equal save timestamps have a consistent item order independent of insertion order", async () => {
    setSystemTime(now);
    for (const item of ["recipe-z", "recipe-a", "recipe-m"]) {
        await saving.save({ user: "alice", item });
    }
    expect(await saving._forUser({ user: "alice" })).toEqual(
        ["recipe-a", "recipe-m", "recipe-z"].map((item) => ({ item, savedAt: now }))
    );
});

test("removing an item clears every user's save and preserves other items and dates", async () => {
    for (const user of ["alice", "bob"]) {
        await saving.save({ user, item: "delete" });
        await saving.save({ user, item: "keep" });
    }
    const before = await db.collection("saving.items").find({ item: "keep" }).sort({ _id: 1 }).toArray();
    for (const item of ["delete", "delete", "missing"]) {
        expect(await saving.removeItem({ item })).toEqual({});
        expect(await db.collection("saving.items").find().sort({ _id: 1 }).toArray()).toEqual(before);
        for (const user of ["alice", "bob"]) {
            await expect(saving.authorize({ user, item: "delete" })).rejects.toBeInstanceOf(ItemNotSaved);
        }
    }
});
