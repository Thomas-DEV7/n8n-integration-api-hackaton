import "dotenv/config";
import { MongoClient, Db, ServerApiVersion } from "mongodb";

let client: MongoClient | null = null;
let db: Db | null = null;

export async function getDb(): Promise<Db> {
  if (db) return db;

  const uri = process.env.MONGODB_URI;
  const dbName = process.env.MONGODB_DB || "hackaton";
  
  if (!uri) throw new Error("MONGODB_URI missing");

  console.log("🔗 Connecting to MongoDB...");
  console.log("URI:", uri.replace(/\/\/[^:]+:[^@]+@/, '//***:***@')); // Log seguro

  client = new MongoClient(uri, {
    serverApi: { 
      version: ServerApiVersion.v1, 
      strict: true, 
      deprecationErrors: true 
    },
  });

  try {
    await client.connect();
    // Testar a conexão
    await client.db().admin().ping();
    console.log("✅ MongoDB connected successfully");
    
    db = client.db(dbName);
    return db;
  } catch (error) {
    console.error("❌ MongoDB connection failed:", error);
    throw error;
  }
}

export async function ensureMongo(): Promise<void> {
  try {
    const database = await getDb();
    const coll = database.collection("port_calls");

    // Criar índices
    await coll.createIndex(
      { identificador_navio: 1, data_prevista_atracacao: 1 },
      { name: "ux_navio_prevista", unique: true }
    );

    await coll.createIndex(
      { created_at: -1 }, 
      { name: "idx_created_at_desc" }
    );

    console.log("✅ MongoDB indexes created");
  } catch (error) {
    console.error("❌ Failed to create indexes:", error);
    throw error;
  }
}

// Função para fechar a conexão
export async function closeMongo(): Promise<void> {
  if (client) {
    await client.close();
    client = null;
    db = null;
    console.log("✅ MongoDB connection closed");
  }
}