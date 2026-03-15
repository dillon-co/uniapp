import type { FastifyPluginAsync } from "fastify";
import { sql } from "drizzle-orm";

export const healthRoutes: FastifyPluginAsync = async (app) => {
  app.get("/", async () => {
    return {
      status: "ok",
      timestamp: new Date().toISOString(),
      version: "0.0.1",
    };
  });

  app.get("/ready", async () => {
    try {
      await app.db.execute(sql`SELECT 1`);
      return { status: "ready", database: "connected" };
    } catch {
      throw app.httpErrors.serviceUnavailable("Database not available");
    }
  });
};
