import "dotenv/config";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import { createDb } from "./client.js";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL environment variable is required");
}

const db = createDb(connectionString);

console.log("Running migrations...");
await migrate(db, { migrationsFolder: "./drizzle" });
console.log("Migrations complete.");

process.exit(0);
