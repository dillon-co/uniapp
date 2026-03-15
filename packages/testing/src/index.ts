import "dotenv/config";
import Fastify from "fastify";
import cors from "@fastify/cors";
import jwt from "@fastify/jwt";
import sensible from "@fastify/sensible";
import { createDb } from "@uniapp/db";
import { cities, users } from "@uniapp/db";
import { eq } from "drizzle-orm";
import bcrypt from "bcrypt";
import type { FastifyInstance } from "fastify";
import type { Database } from "@uniapp/db";
import type { Role } from "@uniapp/shared";

export type TestApp = FastifyInstance & { db: Database };

const TEST_JWT_SECRET = process.env.JWT_SECRET ?? "test-secret-32-chars-minimum-len";
const TEST_DATABASE_URL =
  process.env.DATABASE_URL ?? "postgresql://uniapp:uniapp_dev@localhost:5432/uniapp_test";

/**
 * Build a minimal Fastify instance configured for testing.
 * Does NOT register business routes — import buildApp() from @uniapp/api if you need full routes.
 */
export async function createTestApp(): Promise<TestApp> {
  const app = Fastify({ logger: false }) as unknown as TestApp;

  await app.register(cors, { origin: true });
  await app.register(sensible);
  await app.register(jwt, { secret: TEST_JWT_SECRET });

  const db = createDb(TEST_DATABASE_URL);
  app.decorate("db", db);

  await app.ready();
  return app;
}

export interface TestUser {
  id: string;
  email: string;
  name: string;
  token: string;
  cityId: string | null;
  roles: Role[];
}

export interface TestCity {
  id: string;
  name: string;
  state: string;
  country: string;
  timezone: string;
}

let _userCounter = 0;

/**
 * Insert a test user into the DB and return a signed JWT.
 */
export async function createTestUser(
  app: TestApp,
  overrides: Partial<{
    email: string;
    name: string;
    password: string;
    roles: Role[];
    cityId: string | null;
  }> = {},
): Promise<TestUser> {
  const n = ++_userCounter;
  const email = overrides.email ?? `test-user-${n}-${Date.now()}@uniapp.test`;
  const name = overrides.name ?? `Test User ${n}`;
  const password = overrides.password ?? "TestPassword123!";
  const roles: Role[] = overrides.roles ?? ["attendee"];
  const cityId = overrides.cityId ?? null;

  const passwordHash = await bcrypt.hash(password, 4); // low rounds for speed in tests

  const [user] = await app.db
    .insert(users)
    .values({ email, name, passwordHash, roles, cityId })
    .returning({ id: users.id });

  if (!user) throw new Error("Failed to insert test user");

  const token = app.jwt.sign({
    userId: user.id,
    email,
    roles,
    cityId,
  });

  return { id: user.id, email, name, token, cityId, roles };
}

let _cityCounter = 0;

/**
 * Insert a test city into the DB and return it.
 */
export async function createTestCity(
  app: TestApp,
  overrides: Partial<{
    name: string;
    state: string;
    country: string;
    timezone: string;
    latitude: number;
    longitude: number;
  }> = {},
): Promise<TestCity> {
  const n = ++_cityCounter;
  const name = overrides.name ?? `TestCity${n}`;
  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-") + `-${Date.now()}`;
  const state = overrides.state ?? "TX";
  const country = overrides.country ?? "US";
  const timezone = overrides.timezone ?? "America/Chicago";
  const latitude = overrides.latitude ?? 30.2672;
  const longitude = overrides.longitude ?? -97.7431;

  const [city] = await app.db
    .insert(cities)
    .values({ name, slug, state, country, timezone, latitude, longitude })
    .returning({ id: cities.id, name: cities.name, state: cities.state, country: cities.country, timezone: cities.timezone });

  if (!city) throw new Error("Failed to insert test city");
  return city;
}

/**
 * Delete all rows inserted by the test session.
 * Call this in afterAll / afterEach.
 * Deletes users and cities whose emails/names contain ".test" or start with "TestCity".
 */
export async function cleanupDb(app: TestApp): Promise<void> {
  // Select all users and filter by test email suffix client-side
  // (LIKE requires sql`` which adds complexity; this is fine for test DB sizes)
  const allUsers = await app.db
    .select({ id: users.id, email: users.email })
    .from(users)
    .execute();

  for (const row of allUsers) {
    if (row.email.endsWith(".test")) {
      await app.db.delete(users).where(eq(users.id, row.id));
    }
  }

  // Delete test cities (identified by name prefix)
  const allCities = await app.db
    .select({ id: cities.id, name: cities.name })
    .from(cities)
    .execute();

  for (const row of allCities) {
    if (row.name.startsWith("TestCity")) {
      await app.db.delete(cities).where(eq(cities.id, row.id));
    }
  }
}
