import { describe, it, expect, beforeAll, afterAll } from "vitest";
import "./setup.js";
import { buildApp } from "../app.js";
import type { FastifyInstance } from "fastify";

describe("Auth Routes", () => {
  let app: FastifyInstance;
  const testEmail = `auth-test-${Date.now()}@uniapp.test`;

  beforeAll(async () => {
    app = await buildApp();
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  it("POST /api/v1/auth/register with valid data returns 201", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/api/v1/auth/register",
      payload: {
        email: testEmail,
        password: "StrongPassword123!",
        name: "Auth Test User",
      },
    });
    expect(res.statusCode).toBe(201);
    const body = res.json<{ data: { token: string; user: { email: string } } }>();
    expect(body.data.token).toBeTruthy();
    expect(body.data.user.email).toBe(testEmail);
  });

  it("POST /api/v1/auth/register with duplicate email returns 409", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/api/v1/auth/register",
      payload: {
        email: testEmail,
        password: "StrongPassword123!",
        name: "Duplicate User",
      },
    });
    expect(res.statusCode).toBe(409);
  });

  it("POST /api/v1/auth/register with missing fields returns 400", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/api/v1/auth/register",
      payload: { email: "bad-email" },
    });
    expect(res.statusCode).toBe(400);
  });

  it("POST /api/v1/auth/login with valid credentials returns token", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/api/v1/auth/login",
      payload: {
        email: testEmail,
        password: "StrongPassword123!",
      },
    });
    expect(res.statusCode).toBe(200);
    const body = res.json<{ data: { token: string; refreshToken: string } }>();
    expect(body.data.token).toBeTruthy();
    expect(body.data.refreshToken).toBeTruthy();
  });

  it("POST /api/v1/auth/login with wrong password returns 401", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/api/v1/auth/login",
      payload: {
        email: testEmail,
        password: "wrongpassword",
      },
    });
    expect(res.statusCode).toBe(401);
  });

  it("POST /api/v1/auth/login with unknown email returns 401", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/api/v1/auth/login",
      payload: {
        email: "nobody@uniapp.test",
        password: "SomePassword123!",
      },
    });
    expect(res.statusCode).toBe(401);
  });

  it("POST /api/v1/auth/refresh with invalid token returns 401", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/api/v1/auth/refresh",
      payload: { refreshToken: "not-a-real-token" },
    });
    expect(res.statusCode).toBe(401);
  });
});
