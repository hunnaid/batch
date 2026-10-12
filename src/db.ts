import { MongoClient } from "mongodb";

// bun loads this setting from .env
const url = process.env.MONGODB_URL;

if (!url) {
    throw new Error("MONGODB_URL is not set. Add it to your .env file.");
}

// share one client across the app
// creating the client doesn't open a connection until an operation needs it
export const client = new MongoClient(url);

// select the database named in the connection string
export const db = client.db();
