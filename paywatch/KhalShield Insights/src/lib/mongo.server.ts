import { MongoClient, type Db } from "mongodb";

let clientPromise: Promise<MongoClient> | undefined;

function getClient(): Promise<MongoClient> {
  if (!clientPromise) {
    const uri = process.env["MONGODB_URI"];
    if (!uri) throw new Error("MONGODB_URI is not configured");
    clientPromise = new MongoClient(uri, {
      serverSelectionTimeoutMS: 8000,
      connectTimeoutMS: 8000,
      maxPoolSize: 5,
    }).connect();
  }
  return clientPromise;
}

export async function getDb(): Promise<Db> {
  const client = await getClient();
  return client.db("paywatch");
}
