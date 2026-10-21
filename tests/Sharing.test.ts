import { expect, test } from "bun:test";
import { testDatabase } from "./helpers/database.ts";
import {
  AccessDenied,
  OwnerAccessRequired,
  CannotUninitializeResource,
  CannotGrantOwner,
  CannotRevokeOwner,
  GrantNotOwner,
  GrantResourceNotFound,
  MemberAlreadyAdded,
  MemberNotAdded,
  ResourceAlreadyInitialized,
  RevokeNotOwner,
  RevokeResourceNotFound,
  SharingConcept,
} from "../src/concepts/Sharing.ts";

/** Keep this run's records separate from application data and other tests. */
const db = testDatabase("sharing");

const sharing = new SharingConcept(db);

/** Give each test a separate resource owned by the same example user. */
async function createResource(): Promise<string> {
  const resource = crypto.randomUUID();
  await sharing.initialize({ resource, owner: "owner" });
  return resource;
}

test("a nonmember cannot access an initialized resource", async () => {
  const resource = await createResource();

  await expect(
    sharing.authorize({ resource, user: "outsider" })
  ).rejects.toBeInstanceOf(AccessDenied);
});

test("an unknown resource cannot be accessed", async () => {
  await expect(
    sharing.authorize({
      resource: crypto.randomUUID(),
      user: "owner",
    })
  ).rejects.toBeInstanceOf(AccessDenied);
});

test("the owner can grant access and later revoke it", async () => {
  const resource = await createResource();
  expect(await sharing.authorize({ resource, user: "owner" })).toEqual({});

  expect(
    await sharing.grant({
      owner: "owner",
      resource,
      member: "friend",
    })
  ).toEqual({});

  expect(
    await sharing.authorize({ resource, user: "friend" })
  ).toEqual({});

  expect(
    await sharing.revoke({
      owner: "owner",
      resource,
      member: "friend",
    })
  ).toEqual({});

  await expect(
    sharing.authorize({ resource, user: "friend" })
  ).rejects.toBeInstanceOf(AccessDenied);

  expect(
    await sharing.authorize({ resource, user: "owner" })
  ).toEqual({});
});

test("reinitialization preserves the original owner and members", async () => {
  const resource = await createResource();

  await sharing.grant({
    owner: "owner",
    resource,
    member: "friend",
  });

  await expect(
    sharing.initialize({ resource, owner: "replacement" })
  ).rejects.toBeInstanceOf(ResourceAlreadyInitialized);

  expect(
    await sharing.authorize({ resource, user: "owner" })
  ).toEqual({});
  expect(
    await sharing.authorize({ resource, user: "friend" })
  ).toEqual({});

  await expect(
    sharing.authorize({ resource, user: "replacement" })
  ).rejects.toBeInstanceOf(AccessDenied);
});

test("member queries reflect grants and revocations without mixing resources or instances", async () => {
  const resource = await createResource();
  const other = await createResource();
  const independent = new SharingConcept(db, "recipeSharing.resources");
  await independent.initialize({ resource, owner: "different-owner" });
  await independent.grant({ resource, owner: "different-owner", member: "other-instance-member" });
  expect(await sharing._members({ resource })).toEqual([]);
  expect(await sharing._members({ resource: "missing" })).toEqual([]);
  for (const member of ["zebra", "alice"]) await sharing.grant({ resource, owner: "owner", member });
  await sharing.grant({ resource: other, owner: "owner", member: "other-resource-member" });
  const stored = db.collection("sharing.resources");
  const before = await stored.find().sort({ _id: 1 }).toArray();
  expect(await sharing._members({ resource })).toEqual([{ member: "alice" }, { member: "zebra" }]);
  expect(await stored.find().sort({ _id: 1 }).toArray()).toEqual(before);
  await sharing.revoke({ resource, owner: "owner", member: "alice" });
  expect(await sharing._members({ resource })).toEqual([{ member: "zebra" }]);
  expect(await sharing._members({ resource: other })).toEqual([{ member: "other-resource-member" }]);
  expect(await independent._members({ resource })).toEqual([{ member: "other-instance-member" }]);
  await sharing.uninitialize({ resource, owner: "owner" });
  expect(await sharing._members({ resource })).toEqual([]);
});

// Each rejection is independent and must leave ownership and every membership intact.
for (const scenario of [
  { label: "member granting access", action: "grant", owner: "friend", member: "outsider", error: GrantNotOwner },
  { label: "member revoking access", action: "revoke", owner: "friend", member: "other-friend", error: RevokeNotOwner },
  { label: "granting to the owner", action: "grant", owner: "owner", member: "owner", error: CannotGrantOwner },
  { label: "revoking the owner", action: "revoke", owner: "owner", member: "owner", error: CannotRevokeOwner },
  { label: "duplicate grant", action: "grant", owner: "owner", member: "friend", error: MemberAlreadyAdded },
  { label: "revoking a nonmember", action: "revoke", owner: "owner", member: "outsider", error: MemberNotAdded },
  { label: "granting an unknown resource", action: "grant", owner: "owner", member: "friend", missing: true, error: GrantResourceNotFound },
  { label: "revoking an unknown resource", action: "revoke", owner: "owner", member: "friend", missing: true, error: RevokeResourceNotFound },
] as const) {
  test(`refuses ${scenario.label} without changing sharing state`, async () => {
    const resource = await createResource();
    for (const member of ["friend", "other-friend"]) {
      await sharing.grant({ owner: "owner", resource, member });
    }
    const stored = db.collection("sharing.resources");
    const before = await stored.find().toArray();
    await expect(sharing[scenario.action]({
      resource: "missing" in scenario ? "missing" : resource,
      owner: scenario.owner, member: scenario.member,
    })).rejects.toBeInstanceOf(scenario.error);
    expect(await stored.find().toArray()).toEqual(before);
  });
}

test("membership changes stay within their resource", async () => {
  const first = await createResource();
  const second = await createResource();

  for (const resource of [first, second]) {
    await sharing.grant({
      owner: "owner",
      resource,
      member: "friend",
    });
  }

  await sharing.revoke({
    owner: "owner",
    resource: first,
    member: "friend",
  });

  await expect(
    sharing.authorize({ resource: first, user: "friend" })
  ).rejects.toBeInstanceOf(AccessDenied);

  expect(
    await sharing.authorize({ resource: second, user: "friend" })
  ).toEqual({});
});

test("lists owned and shared resources and reflects revoked access", async () => {
  const user = crypto.randomUUID();
  const otherOwner = crypto.randomUUID();
  const owned = crypto.randomUUID();
  const shared = crypto.randomUUID();
  const unrelated = crypto.randomUUID();

  expect(await sharing._accessible({ user })).toEqual([]);

  await sharing.initialize({ resource: owned, owner: user });
  await sharing.initialize({ resource: shared, owner: otherOwner });
  await sharing.initialize({ resource: unrelated, owner: otherOwner });

  await sharing.grant({
    owner: otherOwner,
    resource: shared,
    member: user,
  });

  const rows = await sharing._accessible({ user });

  expect(rows).toHaveLength(2);
  expect(rows).toContainEqual({ resource: owned, owner: user });
  expect(rows).toContainEqual({
    resource: shared,
    owner: otherOwner,
  });

  await sharing.revoke({
    owner: otherOwner,
    resource: shared,
    member: user,
  });

  expect(await sharing._accessible({ user })).toEqual([
    { resource: owned, owner: user },
  ]);
});

test("shared queries exclude private resources and update for each revoked member", async () => {
  const resource = crypto.randomUUID();
  const owner = crypto.randomUUID();
  const first = crypto.randomUUID();
  const second = crypto.randomUUID();
  expect(await sharing._get({ resource })).toEqual([]);
  await sharing.initialize({ resource, owner });
  expect(await sharing._get({ resource })).toEqual([{ owner }]);
  expect(await sharing._shared({ user: owner })).toEqual([]);
  await sharing.grant({ resource, owner, member: first });
  await sharing.grant({ resource, owner, member: second });
  for (const user of [owner, first, second]) {
    expect(await sharing._shared({ user })).toEqual([{ resource, owner }]);
  }
  expect(await sharing._shared({ user: "outsider" })).toEqual([]);
  await sharing.revoke({ resource, owner, member: first });
  expect(await sharing._shared({ user: first })).toEqual([]);
  expect(await sharing._shared({ user: owner })).toEqual([{ resource, owner }]);
  await sharing.revoke({ resource, owner, member: second });
  expect(await sharing._shared({ user: owner })).toEqual([]);
  expect(await sharing._get({ resource })).toEqual([{ owner }]);
});

test("separate sharing instances do not share ownership or memberships", async () => {
  const direct = new SharingConcept(db, "recipeSharing.resources");
  const resource = crypto.randomUUID();
  await sharing.initialize({ resource, owner: "collection-owner" });
  await direct.initialize({ resource, owner: "recipe-owner" });
  await direct.grant({ resource, owner: "recipe-owner", member: "direct-member" });
  expect(await sharing._get({ resource })).toEqual([{ owner: "collection-owner" }]);
  expect(await sharing._shared({ user: "direct-member" })).toEqual([]);
  expect(await direct._shared({ user: "direct-member" }))
    .toEqual([{ resource, owner: "recipe-owner" }]);
});

test("owner authorization rejects members, outsiders and missing resources without mutations", async () => {
  const resource = await createResource();
  await sharing.grant({ resource, owner: "owner", member: "friend" });
  const stored = db.collection("sharing.resources");
  const before = await stored.find().toArray();
  expect(await sharing.authorizeOwner({ resource, user: "owner" })).toEqual({});
  for (const input of [
    { resource, user: "friend" }, { resource, user: "outsider" },
    { resource: "missing", user: "owner" },
  ]) {
    await expect(sharing.authorizeOwner(input)).rejects.toBeInstanceOf(OwnerAccessRequired);
    expect(await stored.find().toArray()).toEqual(before);
  }
});

test("only the owner can uninitialize; removal clears access without affecting other resources", async () => {
  const resource = await createResource();
  const other = await createResource();
  for (const id of [resource, other]) {
    await sharing.grant({ resource: id, owner: "owner", member: "friend" });
  }
  const stored = db.collection("sharing.resources");
  const before = await stored.find().sort({ _id: 1 }).toArray();
  for (const owner of ["friend", "outsider"]) {
    await expect(sharing.uninitialize({ resource, owner })).rejects.toBeInstanceOf(CannotUninitializeResource);
    expect(await stored.find().sort({ _id: 1 }).toArray()).toEqual(before);
  }
  expect(await sharing.uninitialize({ resource, owner: "owner" })).toEqual({});
  expect(await sharing._get({ resource })).toEqual([]);
  const remaining = await stored.find().toArray();
  for (const id of [resource, "missing"]) {
    await expect(sharing.uninitialize({ resource: id, owner: "owner" }))
      .rejects.toBeInstanceOf(CannotUninitializeResource);
    expect(await stored.find().toArray()).toEqual(remaining);
  }
  for (const user of ["owner", "friend"]) {
    await expect(sharing.authorize({ resource, user })).rejects.toBeInstanceOf(AccessDenied);
    expect(await sharing._accessible({ user })).toEqual([{ resource: other, owner: "owner" }]);
    expect(await sharing._shared({ user })).toEqual([{ resource: other, owner: "owner" }]);
  }
  await sharing.initialize({ resource, owner: "replacement" });
  expect(await sharing.authorizeOwner({ resource, user: "replacement" })).toEqual({});
  await expect(sharing.authorize({ resource, user: "friend" })).rejects.toBeInstanceOf(AccessDenied);
});
