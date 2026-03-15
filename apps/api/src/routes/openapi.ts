import type { FastifyPluginAsync } from "fastify";

// Static OpenAPI 3.1 spec — hand-maintained for accuracy
// Full auto-generation via @fastify/swagger deferred to post-launch
const spec = {
  openapi: "3.1.0",
  info: {
    title: "UniApp API",
    version: "1.0.0",
    description:
      "AI-powered city coordination platform. Multi-agent orchestration for events, venues, vendors, and permits.",
    contact: { name: "UniApp Engineering", url: "https://uniapp.dev" },
    license: { name: "Proprietary" },
  },
  servers: [
    { url: "https://api.uniapp.dev", description: "Production" },
    { url: "http://localhost:3001", description: "Local Development" },
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: "http",
        scheme: "bearer",
        bearerFormat: "JWT",
        description: "JWT access token from POST /api/v1/auth/login",
      },
    },
    schemas: {
      ApiError: {
        type: "object",
        properties: {
          type: { type: "string", example: "https://uniapp.dev/errors/notfound" },
          title: { type: "string", example: "NotFoundError" },
          status: { type: "integer", example: 404 },
          detail: { type: "string", example: "Event not found" },
          instance: { type: "string", description: "Trace ID for debugging" },
        },
      },
      Event: {
        type: "object",
        properties: {
          id: { type: "string", format: "uuid" },
          title: { type: "string" },
          type: { type: "string", enum: ["concert", "festival", "market", "conference", "workshop", "meetup", "sports", "parade", "fundraiser", "emergency", "other"] },
          status: { type: "string", enum: ["draft", "planning", "negotiating", "confirmed", "live", "completed", "settled", "cancelled"] },
          cityId: { type: "string", format: "uuid" },
          edl: { type: "object", description: "Event Description Language payload" },
          startDate: { type: "string", format: "date-time", nullable: true },
          endDate: { type: "string", format: "date-time", nullable: true },
          attendanceMax: { type: "integer", nullable: true },
          budgetCents: { type: "integer", nullable: true },
          createdAt: { type: "string", format: "date-time" },
        },
      },
      Venue: {
        type: "object",
        properties: {
          id: { type: "string", format: "uuid" },
          name: { type: "string" },
          address: { type: "string" },
          capacity: { type: "integer" },
          venueType: { type: "array", items: { type: "string" } },
          pricing: { type: "object" },
          latitude: { type: "number" },
          longitude: { type: "number" },
        },
      },
      Booking: {
        type: "object",
        properties: {
          id: { type: "string", format: "uuid" },
          eventId: { type: "string", format: "uuid" },
          entityType: { type: "string", enum: ["venue", "vendor"] },
          entityId: { type: "string", format: "uuid" },
          status: { type: "string", enum: ["pending", "approved", "confirmed", "completed", "rejected", "cancelled"] },
          priceCents: { type: "integer" },
          startDate: { type: "string", format: "date-time" },
          endDate: { type: "string", format: "date-time" },
        },
      },
    },
  },
  security: [{ bearerAuth: [] }],
  tags: [
    { name: "Auth", description: "Authentication and user management" },
    { name: "Events", description: "Event lifecycle and AI orchestration" },
    { name: "Venues", description: "Venue discovery, booking, and reviews" },
    { name: "Bookings", description: "Booking management" },
    { name: "Vendors", description: "Vendor directory and bids" },
    { name: "Volunteers", description: "Volunteer registration and shifts" },
    { name: "Agents", description: "AI agent execution and monitoring" },
    { name: "Negotiations", description: "Multi-round negotiation protocol" },
    { name: "Notifications", description: "In-app notification management" },
    { name: "Constraints", description: "AI constraint resolution" },
    { name: "Memory", description: "Agent memory storage and retrieval" },
  ],
  paths: {
    "/health": {
      get: {
        tags: ["System"],
        summary: "Health check",
        security: [],
        responses: {
          "200": { description: "Service healthy", content: { "application/json": { schema: { type: "object", properties: { status: { type: "string", example: "ok" }, timestamp: { type: "string" } } } } } },
        },
      },
    },
    "/api/v1/auth/register": {
      post: {
        tags: ["Auth"],
        summary: "Register a new account",
        security: [],
        requestBody: { required: true, content: { "application/json": { schema: { type: "object", required: ["email", "password", "name"], properties: { email: { type: "string", format: "email" }, password: { type: "string", minLength: 8 }, name: { type: "string" }, cityId: { type: "string", format: "uuid" } } } } } },
        responses: { "201": { description: "Account created" }, "409": { description: "Email already registered" } },
      },
    },
    "/api/v1/auth/login": {
      post: {
        tags: ["Auth"],
        summary: "Login",
        security: [],
        requestBody: { required: true, content: { "application/json": { schema: { type: "object", required: ["email", "password"], properties: { email: { type: "string" }, password: { type: "string" } } } } } },
        responses: { "200": { description: "Login successful" }, "401": { description: "Invalid credentials" } },
      },
    },
    "/api/v1/events": {
      get: {
        tags: ["Events"],
        summary: "List events",
        parameters: [
          { name: "status", in: "query", schema: { type: "string" } },
          { name: "cityId", in: "query", schema: { type: "string", format: "uuid" } },
          { name: "limit", in: "query", schema: { type: "integer", default: 20 } },
        ],
        responses: { "200": { description: "Events list" } },
      },
      post: {
        tags: ["Events"],
        summary: "Create an event",
        responses: { "201": { description: "Event created" } },
      },
    },
    "/api/v1/events/parse": {
      post: {
        tags: ["Events"],
        summary: "Parse natural language into EDL",
        description: "Uses Claude Opus 4.6 to convert a natural language event description into a structured Event Description Language payload. No side effects.",
        requestBody: { required: true, content: { "application/json": { schema: { type: "object", required: ["input", "cityId"], properties: { input: { type: "string", description: "Natural language event description" }, cityId: { type: "string", format: "uuid" } } } } } },
        responses: { "200": { description: "Parsed EDL" }, "422": { description: "AI refused the request (safety violation)" } },
      },
    },
    "/api/v1/events/{id}/orchestrate": {
      post: {
        tags: ["Events", "Agents"],
        summary: "AI multi-agent event planning",
        description: "Spawns 4 specialist agents in parallel (venue-scout, vendor-coordinator, volunteer-coordinator, permit-processor) using Claude Opus 4.6. Creates an approval gate when complete.",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }],
        responses: { "200": { description: "Orchestration result with event plan and approval gate ID" } },
      },
    },
  },
};

export const openapiRoutes: FastifyPluginAsync = async (app) => {
  // GET /api/v1/openapi.json
  app.get("/openapi.json", { config: { noAuth: true } }, async (_req, reply) => {
    reply.type("application/json").send(spec);
  });

  // GET /api/docs — Scalar API Reference UI
  try {
    const scalarModule = await import("@scalar/fastify-api-reference").catch(() => null);
    if (scalarModule) {
      await app.register(scalarModule.default as Parameters<typeof app.register>[0], {
        routePrefix: "/api/docs",
        configuration: {
          spec: { url: "/api/v1/openapi.json" },
          title: "UniApp API Reference",
          theme: "purple",
        },
      });
    } else {
      app.log.warn("@scalar/fastify-api-reference not available — /api/docs disabled");
    }
  } catch {
    app.log.warn("@scalar/fastify-api-reference not available — /api/docs disabled");
  }
};
