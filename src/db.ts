import { MongoClient } from "mongodb";

// Bun loads this from .env locally; the deployment platform supplies it online.
const url = process.env.MONGODB_URL;

if (!url) {
    throw new Error("MONGODB_URL must be set in the environment.");
}

// share one client across the app
// creating the client doesn't open a connection until an operation needs it
export const client = new MongoClient(url);

// select the database named in the connection string
export const db = client.db();
