import { afterAll, beforeAll, beforeEach } from "bun:test";
import { MongoClient } from "mongodb";

/** Each suite owns a disposable database; fixtures must use concept actions. */
export function testDatabase(label: string, whenIdle?: () => Promise<unknown>) {
  const url = process.env.MONGODB_URL;
  if (!url) throw new Error("MONGODB_URL is required to run these tests.");

  const client = new MongoClient(url, { serverSelectionTimeoutMS: 3000 });
  const db = client.db(`batch_test_${label}_${crypto.randomUUID().replaceAll("-", "")}`);
  let connected = false;

  beforeAll(async () => {
    await client.connect();
    connected = true;
  });

  beforeEach(async () => {
    await whenIdle?.();
    await db.dropDatabase();
  });

  afterAll(async () => {
    try {
      await whenIdle?.();
      if (connected) await db.dropDatabase();
    } finally {
      await client.close();
    }
  });

  return db;
}
