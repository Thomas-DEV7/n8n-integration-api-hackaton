// test-connection.ts
import "dotenv/config";
import { MongoClient } from "mongodb";

async function testConnection() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error("❌ MONGODB_URI not found");
    return;
  }

  try {
    const client = new MongoClient(uri);
    await client.connect();
    
    const databases = await client.db().admin().listDatabases();
    console.log("✅ Connected successfully");
    console.log("📊 Available databases:", databases.databases.map(d => d.name));
    
    await client.close();
  } catch (error) {
    console.error("❌ Connection failed:", error);
  }
}

testConnection();