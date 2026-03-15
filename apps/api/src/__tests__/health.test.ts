import { describe, it, expect, beforeAll, afterAll } from "vitest";
import "./setup.js";
import { buildApp } from "../app.js";
import type { FastifyInstance } from "fastify";

describe("Health Endpoints", () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await buildApp();
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  it("GET /health returns 200 with status ok", async () => {
    const res = await app.inject({ method: "GET", url: "/health" });
    expect(res.statusCode).toBe(200);
    const body = res.json<{ status: string; timestamp: string; version: string }>();
    expect(body.status).toBe("ok");
    expect(body.timestamp).toBeTruthy();
    expect(body.version).toBeTruthy();
  });

  it("GET /health has correct content-type", async () => {
    const res = await app.inject({ method: "GET", url: "/health" });
    expect(res.headers["content-type"]).toContain("application/json");
  });

  it("GET /metrics returns metrics JSON", async () => {
    const res = await app.inject({ method: "GET", url: "/metrics" });
    expect(res.statusCode).toBe(200);
    const body = res.json<{ requests: unknown; errors: unknown; latency: unknown }>();
    expect(body).toHaveProperty("requests");
    expect(body).toHaveProperty("errors");
    expect(body).toHaveProperty("latency");
  });
});
