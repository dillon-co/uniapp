import Fastify from "fastify";
import cors from "@fastify/cors";
import jwt from "@fastify/jwt";
import sensible from "@fastify/sensible";
import { createDb } from "@uniapp/db";
import { authRoutes } from "./routes/auth.js";
import { healthRoutes } from "./routes/health.js";
import type { Database } from "@uniapp/db";

declare module "fastify" {
  interface FastifyInstance {
    db: Database;
  }
  interface FastifyRequest {
    jwtPayload: {
      userId: string;
      email: string;
      roles: string[];
      cityId: string | null;
    };
  }
}

export async function buildApp() {
  const app = Fastify({
    logger: {
      level: process.env.NODE_ENV === "production" ? "info" : "debug",
    },
  });

  // Plugins
  await app.register(cors, {
    origin: process.env.NODE_ENV === "production"
      ? ["https://uniapp.dev"]
      : true,
    credentials: true,
  });

  await app.register(sensible);

  await app.register(jwt, {
    secret: process.env.JWT_SECRET ?? "dev-secret-change-me",
    sign: {
      expiresIn: process.env.JWT_EXPIRES_IN ?? "15m",
    },
  });

  // Database
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("DATABASE_URL environment variable is required");
  }
  const db = createDb(databaseUrl);
  app.decorate("db", db);

  // Error handler
  app.setErrorHandler((error, _request, reply) => {
    app.log.error(error);

    const statusCode = (error as { statusCode?: number }).statusCode ?? 500;
    reply.status(statusCode).send({
      type: "https://uniapp.dev/errors/" + (error instanceof Error ? error.name : "internal"),
      title: error instanceof Error ? error.name : "Internal Server Error",
      status: statusCode,
      detail: statusCode >= 500 ? "An unexpected error occurred" : (error instanceof Error ? error.message : "Unknown error"),
    });
  });

  // Routes
  await app.register(healthRoutes, { prefix: "/health" });
  await app.register(authRoutes, { prefix: "/api/v1/auth" });

  return app;
}
