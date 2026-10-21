import { expect, test } from "bun:test";
import { ProfilingConcept, InvalidProfile, ProfileAlreadyExists, ProfileNotFound } from "../src/concepts/Profiling.ts";
import { testDatabase } from "./helpers/database.ts";

const db = testDatabase("profiling");
const profiles = new ProfilingConcept(db);
const example = { displayName: "Hunnaid", bio: "Home cook", picture: "" };
const png = `data:image/png;base64,${Buffer.from(await Bun.file(new URL("./fixtures/avatar.png", import.meta.url)).arrayBuffer()).toString("base64")}`;

async function state() { return db.collection("profiling.profiles").find().sort({ _id: 1 }).toArray(); }

test("create and update preserve the user identity and other profiles; optional details can be cleared", async () => {
  expect(await profiles._get({ user: "alice" })).toEqual([]);
  await profiles.create({ user: "alice", ...example, picture: png });
  await profiles.create({ user: "bob", ...example, displayName: "Bob" });
  expect(await profiles._get({ user: "alice" })).toEqual([{ ...example, picture: png }]);
  const otherBefore = await profiles._get({ user: "bob" });
  const replacement = { displayName: "New name", bio: "", picture: "" };
  for (let attempt = 0; attempt < 2; attempt++) {
    expect(await profiles.update({ user: "alice", ...replacement })).toEqual({});
    expect(await profiles._get({ user: "alice" })).toEqual([replacement]);
    expect(await profiles._get({ user: "bob" })).toEqual(otherBefore);
  }
  expect(await profiles._get({ user: "unknown" })).toEqual([]);
});

test("duplicate creation and updating a missing profile do not change stored profiles", async () => {
  await profiles.create({ user: "alice", ...example });
  const before = await state();
  await expect(profiles.create({ user: "alice", ...example, displayName: "Overwrite" }))
    .rejects.toBeInstanceOf(ProfileAlreadyExists);
  await expect(profiles.update({ user: "unknown", ...example })).rejects.toBeInstanceOf(ProfileNotFound);
  expect(await state()).toEqual(before);
});

for (const [label, change] of [
  ["empty name", { displayName: "" }],
  ["blank name", { displayName: " \n\t " }],
  ["long name", { displayName: "x".repeat(81) }],
  ["long bio", { bio: "x".repeat(501) }],
  ["remote URL", { picture: "https://example.com/avatar.png" }],
  ["SVG", { picture: "data:image/svg+xml;base64,PHN2Zz48L3N2Zz4=" }],
  ["invalid base64", { picture: "data:image/png;base64,!!!!" }],
  ["noncanonical base64", { picture: png.replace(/=+$/, "") }],
  ["wrong raster type", { picture: png.replace("image/png", "image/jpeg") }],
  ["non-image content", { picture: "data:image/png;base64," + Buffer.from("not an image").toString("base64") }],
  ["oversized picture", { picture: "data:image/png;base64," + Buffer.alloc(256 * 1024 + 1).toString("base64") }],
] as const) {
  test(`rejects ${label} on create and update without mutations`, async () => {
    await profiles.create({ user: "existing", ...example });
    const before = await state();
    await expect(profiles.create({ user: "new", ...example, ...change })).rejects.toBeInstanceOf(InvalidProfile);
    await expect(profiles.update({ user: "existing", ...example, ...change })).rejects.toBeInstanceOf(InvalidProfile);
    expect(await state()).toEqual(before);
  });
}

test("accepts the name and bio limits and each supported raster format", async () => {
  for (const [extension, mime] of [["png", "png"], ["jpg", "jpeg"], ["webp", "webp"]]) {
    const bytes = await Bun.file(new URL(`./fixtures/avatar.${extension}`, import.meta.url)).arrayBuffer();
    const details = { displayName: "x".repeat(80), bio: "y".repeat(500), picture: `data:image/${mime};base64,${Buffer.from(bytes).toString("base64")}` };
    await profiles.create({ user: mime!, ...details });
    expect(await profiles._get({ user: mime! })).toEqual([details]);
  }
});
