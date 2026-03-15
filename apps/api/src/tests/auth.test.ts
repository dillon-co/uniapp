import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { buildApp } from "../app.js";
import type { FastifyInstance } from "fastify";

describe("Auth Routes", () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await buildApp();
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  it("GET /health returns 200", async () => {
    const res = await app.inject({ method: "GET", url: "/health" });
    expect(res.statusCode).toBe(200);
    const body = res.json<{ status: string }>();
    expect(body.status).toBe("ok");
  });

  it("POST /api/v1/auth/register with missing fields returns 400", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/api/v1/auth/register",
      payload: { email: "bad" },
    });
    expect(res.statusCode).toBe(400);
  });

  it("POST /api/v1/auth/login with wrong credentials returns 401", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/api/v1/auth/login",
      payload: { email: "nobody@uniapp.dev", password: "wrongpassword" },
    });
    expect(res.statusCode).toBe(401);
  });

  it("GET /api/v1/auth/me without token returns 401", async () => {
    const res = await app.inject({ method: "GET", url: "/api/v1/auth/me" });
    expect(res.statusCode).toBe(401);
  });
});
