import "dotenv/config";
import { createDb } from "./client.js";
import { cities, users } from "./schema/index.js";
import crypto from "node:crypto";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL environment variable is required");
}

const db = createDb(connectionString);

async function hashPassword(password: string): Promise<string> {
  // Use scrypt for seeding (bcrypt added via api package)
  return new Promise((resolve, reject) => {
    const salt = crypto.randomBytes(16).toString("hex");
    crypto.scrypt(password, salt, 64, (err: Error | null, derivedKey: Buffer) => {
      if (err) reject(err);
      resolve(`${salt}:${derivedKey.toString("hex")}`);
    });
  });
}

async function seed() {
  console.log("Seeding database...");

  // Seed cities
  const [austin] = await db
    .insert(cities)
    .values({
      name: "Austin",
      slug: "austin",
      state: "TX",
      country: "US",
      timezone: "America/Chicago",
      latitude: 30.2672,
      longitude: -97.7431,
      permitConfig: { requiresPermit: true, leadTimeDays: 30 },
      regulatoryConfig: { noiseOrdinance: "10pm", maxCapacityOutdoor: 5000 },
    })
    .returning();

  await db.insert(cities).values({
    name: "San Francisco",
    slug: "san-francisco",
    state: "CA",
    country: "US",
    timezone: "America/Los_Angeles",
    latitude: 37.7749,
    longitude: -122.4194,
    permitConfig: { requiresPermit: true, leadTimeDays: 45 },
    regulatoryConfig: { noiseOrdinance: "10pm", maxCapacityOutdoor: 3000 },
  });

  // Seed admin user
  const passwordHash = await hashPassword("admin123");
  await db.insert(users).values({
    email: "admin@uniapp.dev",
    passwordHash,
    name: "Platform Admin",
    roles: ["platform_admin"],
    cityId: austin!.id,
    trustScore: 100,
  });

  // Seed organizer user
  await db.insert(users).values({
    email: "organizer@uniapp.dev",
    passwordHash: await hashPassword("organizer123"),
    name: "Demo Organizer",
    roles: ["organizer"],
    cityId: austin!.id,
    trustScore: 75,
  });

  console.log("Seeding complete.");
}

await seed();
process.exit(0);
