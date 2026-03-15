import fs from "fs";
import path from "path";
import { Client } from "pg";
import dotenv from "dotenv";

dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

const dbUrl = process.env.SUPABASE_DB_URL;
if (!dbUrl) {
  console.error("Missing SUPABASE_DB_URL. Add it to .env.local and retry.");
  process.exit(1);
}

const schemaPath = path.resolve(process.cwd(), "supabase", "schema.sql");
if (!fs.existsSync(schemaPath)) {
  console.error(`Schema file not found at ${schemaPath}`);
  process.exit(1);
}

const sql = fs.readFileSync(schemaPath, "utf-8");

const client = new Client({ connectionString: dbUrl });
try {
  await client.connect();
  await client.query(sql);
  console.log("Supabase schema applied successfully.");
} catch (err) {
  console.error("Failed to apply schema:", err);
  process.exit(1);
} finally {
  await client.end();
}
