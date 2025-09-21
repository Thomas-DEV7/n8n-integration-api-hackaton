// src/db/mongo.ts
import "dotenv/config";
import { MongoClient, Db, ServerApiVersion } from "mongodb";

let client: MongoClient | null = null;
let db: Db | null = null;

export async function getDb(): Promise<Db> {
  if (db) return db;

  const uri = process.env.MONGODB_URI;
  const dbName = process.env.MONGODB_DB || "hackaton";
  if (!uri) throw new Error("MONGODB_URI missing");

  client = new MongoClient(uri, {
    serverApi: { version: ServerApiVersion.v1, strict: true, deprecationErrors: true },
  });

  await client.connect();
  db = client.db(dbName);
  return db;
}

export async function ensureMongo(): Promise<void> {
  const database = await getDb();
  const coll = database.collection("port_calls");

  // índice único: (identificador_navio + data_prevista_atracacao)
  await coll.createIndex(
    { identificador_navio: 1, data_prevista_atracacao: 1 },
    { name: "ux_navio_prevista", unique: true }
  );

  // auxiliar para ordenação por criação
  await coll.createIndex({ created_at: -1 }, { name: "idx_created_at_desc" });
}
