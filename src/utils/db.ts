import { MongoClient, Db } from "mongodb";
import { configDotenv } from "dotenv";
configDotenv();

const uri = process.env.MONGODB_URI;
if (!uri) throw new Error("MONGODB_URI is not defined in environment variables");

const client = new MongoClient(uri, {
  serverSelectionTimeoutMS: 5000,
  retryWrites: true,
  retryReads: true,
});

let db: Db;
let connectionAttempted = false;

export const connectToDb = async (): Promise<Db> => {
  if (db) return db;
  if (connectionAttempted) throw new Error("Database connection already attempted");

  connectionAttempted = true;
  await client.connect();
  db = client.db();
  console.log("✅ MongoDB Connected");
  return db;
};

export const getDb = (): Db => {
  if (!db) throw new Error("Database not initialized. Call connectToDb() first");
  return db;
};

process.on('SIGINT', async () => {
  await client.close();
  console.log('MongoDB connection closed');
  process.exit(0);
});
