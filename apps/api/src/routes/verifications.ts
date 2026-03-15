import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { eq, and } from "drizzle-orm";
import { verifications } from "@uniapp/db";
import { authenticate, requireRoles } from "../middleware/auth.js";

const createSchema = z.object({
  entityType: z.enum(["user", "organization", "vendor", "venue"]),
  entityId: z.string().uuid(),
  verificationType: z.enum(["identity", "business", "insurance", "license"]),
  documents: z
    .array(
      z.object({
        name: z.string(),
        url: z.string().url(),
        uploadedAt: z.string().datetime().optional(),
      }),
    )
    .default([]),
  notes: z.string().optional(),
});

const updateSchema = z.object({
  status: z.enum(["pending", "under_review", "verified", "rejected", "expired"]).optional(),
  notes: z.string().optional(),
  documents: z
    .array(
      z.object({
        name: z.string(),
        url: z.string().url(),
        uploadedAt: z.string().datetime().optional(),
      }),
    )
    .optional(),
  expiresAt: z.string().datetime().optional(),
});

export const verificationRoutes: FastifyPluginAsync = async (app) => {
  // POST /api/v1/verifications — submit verification request
  app.post("/", { onRequest: [authenticate] }, async (request, reply) => {
    const body = createSchema.parse(request.body);

    const [verification] = await app.db
      .insert(verifications)
      .values({
        entityType: body.entityType,
        entityId: body.entityId,
        verificationType: body.verificationType,
        status: "pending",
        documents: body.documents,
        notes: body.notes ?? null,
      })
      .returning();

    reply.status(201).send({ data: verification });
  });

  // GET /api/v1/verifications — list verifications for an entity
  app.get("/", { onRequest: [authenticate] }, async (request) => {
    const query = z
      .object({ entityType: z.string().optional(), entityId: z.string().uuid().optional() })
      .parse(request.query);

    let rows;
    if (query.entityType && query.entityId) {
      rows = await app.db.query.verifications.findMany({
        where: and(
          eq(verifications.entityType, query.entityType),
          eq(verifications.entityId, query.entityId),
        ),
      });
    } else {
      rows = await app.db.query.verifications.findMany({ limit: 50 });
    }

    return { data: rows };
  });

  // GET /api/v1/verifications/:id
  app.get<{ Params: { id: string } }>(
    "/:id",
    { onRequest: [authenticate] },
    async (request) => {
      const row = await app.db.query.verifications.findFirst({
        where: eq(verifications.id, request.params.id),
      });
      if (!row) throw app.httpErrors.notFound("Verification not found");
      return { data: row };
    },
  );

  // PATCH /api/v1/verifications/:id — admin updates verification status
  app.patch<{ Params: { id: string } }>(
    "/:id",
    { onRequest: [requireRoles("platform_admin", "city_admin")] },
    async (request) => {
      const body = updateSchema.parse(request.body);
      const { userId } = request.jwtPayload;

      const existing = await app.db.query.verifications.findFirst({
        where: eq(verifications.id, request.params.id),
      });
      if (!existing) throw app.httpErrors.notFound("Verification not found");

      const updates: Partial<typeof existing> & { verifiedAt?: Date | null; verifiedBy?: string | null; expiresAt?: Date | null; updatedAt?: Date } = {
        updatedAt: new Date(),
      };

      if (body.status) {
        updates.status = body.status;
        if (body.status === "verified") {
          updates.verifiedAt = new Date();
          updates.verifiedBy = userId;
        }
      }
      if (body.notes !== undefined) updates.notes = body.notes;
      if (body.documents) updates.documents = body.documents;
      if (body.expiresAt) updates.expiresAt = new Date(body.expiresAt);

      const [updated] = await app.db
        .update(verifications)
        .set(updates)
        .where(eq(verifications.id, request.params.id))
        .returning();

      return { data: updated };
    },
  );
};
