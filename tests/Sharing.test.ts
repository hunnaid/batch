import { afterAll, beforeAll, expect, test } from "bun:test";
import { MongoClient } from "mongodb";
import {
  AccessDenied,
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
const url = process.env.MONGODB_URL;

if (!url) {
  throw new Error("MONGODB_URL is required to run these tests.");
}

const client = new MongoClient(url, {
  serverSelectionTimeoutMS: 3000,
});

const db = client.db(
  `batch_test_sharing_${crypto.randomUUID().replaceAll("-", "")}`
);

const sharing = new SharingConcept(db);
let connected = false;

beforeAll(async () => {
  await client.connect();
  connected = true;
});

// Remove only this run's temporary database and always close the connection.
afterAll(async () => {
  try {
    if (connected) {
      await db.dropDatabase();
    }
  } finally {
    await client.close();
  }
});

/** Give each test a separate resource owned by the same example user. */
async function createResource(): Promise<string> {
  const resource = crypto.randomUUID();
  await sharing.initialize({ resource, owner: "owner" });
  return resource;
}

test("initialization gives the owner access", async () => {
  const resource = await createResource();

  expect(
    await sharing.authorize({ resource, user: "owner" })
  ).toEqual({});
});

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

test("a member cannot grant access to another user", async () => {
  const resource = await createResource();

  await sharing.grant({
    owner: "owner",
    resource,
    member: "friend",
  });

  await expect(
    sharing.grant({
      owner: "friend",
      resource,
      member: "outsider",
    })
  ).rejects.toBeInstanceOf(GrantNotOwner);

  await expect(
    sharing.authorize({ resource, user: "outsider" })
  ).rejects.toBeInstanceOf(AccessDenied);
});

test("a member cannot revoke another member's access", async () => {
  const resource = await createResource();

  for (const member of ["friend", "other-friend"]) {
    await sharing.grant({ owner: "owner", resource, member });
  }

  await expect(
    sharing.revoke({
      owner: "friend",
      resource,
      member: "other-friend",
    })
  ).rejects.toBeInstanceOf(RevokeNotOwner);

  expect(
    await sharing.authorize({ resource, user: "other-friend" })
  ).toEqual({});
});

test("the owner cannot be added as a member", async () => {
  const resource = await createResource();

  await expect(
    sharing.grant({
      owner: "owner",
      resource,
      member: "owner",
    })
  ).rejects.toBeInstanceOf(CannotGrantOwner);
});

test("the owner's access cannot be revoked", async () => {
  const resource = await createResource();

  await expect(
    sharing.revoke({
      owner: "owner",
      resource,
      member: "owner",
    })
  ).rejects.toBeInstanceOf(CannotRevokeOwner);

  expect(
    await sharing.authorize({ resource, user: "owner" })
  ).toEqual({});
});

test("a duplicate grant is refused without removing access", async () => {
  const resource = await createResource();
  const input = { owner: "owner", resource, member: "friend" };

  await sharing.grant(input);

  await expect(
    sharing.grant(input)
  ).rejects.toBeInstanceOf(MemberAlreadyAdded);

  expect(
    await sharing.authorize({ resource, user: "friend" })
  ).toEqual({});
});

test("revoking a nonmember is refused", async () => {
  const resource = await createResource();

  await expect(
    sharing.revoke({
      owner: "owner",
      resource,
      member: "outsider",
    })
  ).rejects.toBeInstanceOf(MemberNotAdded);
});

test("granting access to an unknown resource is refused", async () => {
  await expect(
    sharing.grant({
      owner: "owner",
      resource: crypto.randomUUID(),
      member: "friend",
    })
  ).rejects.toBeInstanceOf(GrantResourceNotFound);
});

test("revoking access to an unknown resource is refused", async () => {
  await expect(
    sharing.revoke({
      owner: "owner",
      resource: crypto.randomUUID(),
      member: "friend",
    })
  ).rejects.toBeInstanceOf(RevokeResourceNotFound);
});

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
