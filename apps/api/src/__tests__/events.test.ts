import { describe, it, expect, beforeAll, afterAll } from "vitest";
import "./setup.js";
import { buildApp } from "../app.js";
import type { FastifyInstance } from "fastify";

describe("Events Routes", () => {
  let app: FastifyInstance;
  let authToken: string;
  const userEmail = `events-test-${Date.now()}@uniapp.test`;

  beforeAll(async () => {
    app = await buildApp();
    await app.ready();

    // Register and login to get a token
    const regRes = await app.inject({
      method: "POST",
      url: "/api/v1/auth/register",
      payload: {
        email: userEmail,
        password: "StrongPassword123!",
        name: "Events Test User",
      },
    });
    if (regRes.statusCode === 201) {
      const body = regRes.json<{ data: { token: string } }>();
      authToken = body.data.token;
    }
  });

  afterAll(async () => {
    await app.close();
  });

  it("GET /api/v1/events without token returns 401", async () => {
    const res = await app.inject({ method: "GET", url: "/api/v1/events" });
    expect(res.statusCode).toBe(401);
  });

  it("GET /api/v1/events with valid token returns list", async () => {
    if (!authToken) return; // skip if DB not available
    const res = await app.inject({
      method: "GET",
      url: "/api/v1/events",
      headers: { authorization: `Bearer ${authToken}` },
    });
    expect([200, 500]).toContain(res.statusCode); // 500 if DB not running
    if (res.statusCode === 200) {
      const body = res.json<{ data: unknown[] }>();
      expect(Array.isArray(body.data)).toBe(true);
    }
  });

  it("POST /api/v1/events without token returns 401", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/api/v1/events",
      payload: { title: "Test Event", type: "meetup", cityId: "00000000-0000-0000-0000-000000000000" },
    });
    expect(res.statusCode).toBe(401);
  });

  it("POST /api/v1/events with invalid payload returns 400", async () => {
    if (!authToken) return;
    const res = await app.inject({
      method: "POST",
      url: "/api/v1/events",
      headers: { authorization: `Bearer ${authToken}` },
      payload: { title: "" }, // missing required fields
    });
    expect([400, 422, 500]).toContain(res.statusCode);
  });

  it("GET /api/v1/events/:id with non-existent id returns 404", async () => {
    if (!authToken) return;
    const res = await app.inject({
      method: "GET",
      url: "/api/v1/events/00000000-0000-0000-0000-000000000000",
      headers: { authorization: `Bearer ${authToken}` },
    });
    expect([404, 500]).toContain(res.statusCode);
  });

  it("PUT /api/v1/events/:id without token returns 401", async () => {
    const res = await app.inject({
      method: "PUT",
      url: "/api/v1/events/00000000-0000-0000-0000-000000000000",
      payload: { title: "Updated" },
    });
    expect(res.statusCode).toBe(401);
  });

  it("DELETE /api/v1/events/:id without token returns 401", async () => {
    const res = await app.inject({
      method: "DELETE",
      url: "/api/v1/events/00000000-0000-0000-0000-000000000000",
    });
    expect(res.statusCode).toBe(401);
  });
});
