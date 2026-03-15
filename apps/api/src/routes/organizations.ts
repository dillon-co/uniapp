import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { eq, and } from "drizzle-orm";
import { organizations, orgMembers } from "@uniapp/db";
import { authenticate } from "../middleware/auth.js";

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

const createOrgSchema = z.object({
  type: z.enum(["venue_owner", "event_company", "vendor", "nonprofit", "government", "other"]),
  name: z.string().min(1).max(255),
  cityId: z.string().uuid().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

const updateOrgSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

const inviteMemberSchema = z.object({
  userId: z.string().uuid(),
  role: z.enum(["admin", "member"]).default("member"),
});

export const organizationRoutes: FastifyPluginAsync = async (app) => {
  // POST /api/v1/organizations
  app.post("/", { onRequest: [authenticate] }, async (request, reply) => {
    const body = createOrgSchema.parse(request.body);

    let slug = slugify(body.name);
    // Ensure slug uniqueness
    const existing = await app.db.query.organizations.findFirst({
      where: eq(organizations.slug, slug),
      columns: { id: true },
    });
    if (existing) slug = `${slug}-${Date.now()}`;

    const [org] = await app.db
      .insert(organizations)
      .values({
        type: body.type,
        name: body.name,
        slug,
        cityId: body.cityId ?? request.jwtPayload.cityId,
        metadata: body.metadata ?? {},
      })
      .returning();

    // Add creator as owner
    await app.db.insert(orgMembers).values({
      orgId: org!.id,
      userId: request.jwtPayload.userId,
      role: "owner",
      acceptedAt: new Date(),
    });

    reply.status(201).send({ data: org });
  });

  // GET /api/v1/organizations/:id
  app.get<{ Params: { id: string } }>(
    "/:id",
    { onRequest: [authenticate] },
    async (request) => {
      const org = await app.db.query.organizations.findFirst({
        where: eq(organizations.id, request.params.id),
      });

      if (!org) throw app.httpErrors.notFound("Organization not found");
      return { data: org };
    },
  );

  // PATCH /api/v1/organizations/:id
  app.patch<{ Params: { id: string } }>(
    "/:id",
    { onRequest: [authenticate] },
    async (request) => {
      const body = updateOrgSchema.parse(request.body);
      await assertOrgMember(app, request.params.id, request.jwtPayload.userId, ["owner", "admin"]);

      const [updated] = await app.db
        .update(organizations)
        .set({ ...body, updatedAt: new Date() })
        .where(eq(organizations.id, request.params.id))
        .returning();

      return { data: updated };
    },
  );

  // GET /api/v1/organizations/:id/members
  app.get<{ Params: { id: string } }>(
    "/:id/members",
    { onRequest: [authenticate] },
    async (request) => {
      await assertOrgMember(app, request.params.id, request.jwtPayload.userId, ["owner", "admin", "member"]);

      const members = await app.db.query.orgMembers.findMany({
        where: eq(orgMembers.orgId, request.params.id),
      });

      return { data: members };
    },
  );

  // POST /api/v1/organizations/:id/members
  app.post<{ Params: { id: string } }>(
    "/:id/members",
    { onRequest: [authenticate] },
    async (request, reply) => {
      const body = inviteMemberSchema.parse(request.body);
      await assertOrgMember(app, request.params.id, request.jwtPayload.userId, ["owner", "admin"]);

      const [member] = await app.db
        .insert(orgMembers)
        .values({
          orgId: request.params.id,
          userId: body.userId,
          role: body.role,
          invitedBy: request.jwtPayload.userId,
          // In production: set acceptedAt only after user accepts invitation
          acceptedAt: new Date(),
        })
        .returning();

      reply.status(201).send({ data: member });
    },
  );

  // DELETE /api/v1/organizations/:id/members/:userId
  app.delete<{ Params: { id: string; userId: string } }>(
    "/:id/members/:userId",
    { onRequest: [authenticate] },
    async (request, reply) => {
      await assertOrgMember(app, request.params.id, request.jwtPayload.userId, ["owner", "admin"]);

      await app.db
        .delete(orgMembers)
        .where(
          and(
            eq(orgMembers.orgId, request.params.id),
            eq(orgMembers.userId, request.params.userId),
          ),
        );

      reply.status(204).send();
    },
  );
};

async function assertOrgMember(
  app: Parameters<FastifyPluginAsync>[0],
  orgId: string,
  userId: string,
  allowedRoles: string[],
) {
  const member = await app.db.query.orgMembers.findFirst({
    where: and(eq(orgMembers.orgId, orgId), eq(orgMembers.userId, userId)),
  });

  if (!member || !allowedRoles.includes(member.role)) {
    throw app.httpErrors.forbidden("Insufficient organization permissions");
  }
}
