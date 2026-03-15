import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import bcrypt from "bcrypt";
import crypto from "node:crypto";
import { eq } from "drizzle-orm";
import { users } from "@uniapp/db";
import type { Role } from "@uniapp/shared";

const BCRYPT_ROUNDS = parseInt(process.env.BCRYPT_ROUNDS ?? "12", 10);

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(128),
  name: z.string().min(1).max(255),
  phone: z.string().optional(),
  cityId: z.string().uuid().optional(),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

const refreshSchema = z.object({
  refreshToken: z.string(),
});

const forgotPasswordSchema = z.object({
  email: z.string().email(),
});

const resetPasswordSchema = z.object({
  token: z.string(),
  password: z.string().min(8).max(128),
});

export const authRoutes: FastifyPluginAsync = async (app) => {
  // POST /api/v1/auth/register
  app.post("/register", async (request, reply) => {
    const body = registerSchema.parse(request.body);

    // Check if user exists
    const existing = await app.db.query.users.findFirst({
      where: eq(users.email, body.email),
    });
    if (existing) {
      throw app.httpErrors.conflict("Email already registered");
    }

    const passwordHash = await bcrypt.hash(body.password, BCRYPT_ROUNDS);
    const defaultRoles: Role[] = ["attendee"];

    const [user] = await app.db
      .insert(users)
      .values({
        email: body.email,
        passwordHash,
        name: body.name,
        phone: body.phone ?? null,
        roles: defaultRoles,
        cityId: body.cityId ?? null,
      })
      .returning({
        id: users.id,
        email: users.email,
        name: users.name,
        roles: users.roles,
        cityId: users.cityId,
      });

    const token = app.jwt.sign({
      userId: user!.id,
      email: user!.email,
      roles: user!.roles,
      cityId: user!.cityId,
    });

    const refreshToken = crypto.randomBytes(32).toString("hex");
    const refreshHash = crypto.createHash("sha256").update(refreshToken).digest("hex");
    await app.db
      .update(users)
      .set({ refreshTokenHash: refreshHash })
      .where(eq(users.id, user!.id));

    reply.status(201).send({
      data: {
        user: {
          id: user!.id,
          email: user!.email,
          name: user!.name,
          roles: user!.roles,
        },
        accessToken: token,
        refreshToken,
        expiresIn: 900,
      },
    });
  });

  // POST /api/v1/auth/login
  app.post("/login", async (request, reply) => {
    const body = loginSchema.parse(request.body);

    const user = await app.db.query.users.findFirst({
      where: eq(users.email, body.email),
    });
    if (!user) {
      throw app.httpErrors.unauthorized("Invalid credentials");
    }

    const valid = await bcrypt.compare(body.password, user.passwordHash);
    if (!valid) {
      throw app.httpErrors.unauthorized("Invalid credentials");
    }

    const token = app.jwt.sign({
      userId: user.id,
      email: user.email,
      roles: user.roles,
      cityId: user.cityId,
    });

    const refreshToken = crypto.randomBytes(32).toString("hex");
    const refreshHash = crypto.createHash("sha256").update(refreshToken).digest("hex");
    await app.db
      .update(users)
      .set({ refreshTokenHash: refreshHash })
      .where(eq(users.id, user.id));

    reply.send({
      data: {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          roles: user.roles,
        },
        accessToken: token,
        refreshToken,
        expiresIn: 900,
      },
    });
  });

  // POST /api/v1/auth/refresh
  app.post("/refresh", async (request, reply) => {
    const body = refreshSchema.parse(request.body);

    const refreshHash = crypto.createHash("sha256").update(body.refreshToken).digest("hex");
    const user = await app.db.query.users.findFirst({
      where: eq(users.refreshTokenHash, refreshHash),
    });

    if (!user) {
      throw app.httpErrors.unauthorized("Invalid refresh token");
    }

    const token = app.jwt.sign({
      userId: user.id,
      email: user.email,
      roles: user.roles,
      cityId: user.cityId,
    });

    const newRefreshToken = crypto.randomBytes(32).toString("hex");
    const newRefreshHash = crypto.createHash("sha256").update(newRefreshToken).digest("hex");
    await app.db
      .update(users)
      .set({ refreshTokenHash: newRefreshHash })
      .where(eq(users.id, user.id));

    reply.send({
      data: {
        accessToken: token,
        refreshToken: newRefreshToken,
        expiresIn: 900,
      },
    });
  });

  // POST /api/v1/auth/forgot-password
  app.post("/forgot-password", async (request, reply) => {
    const body = forgotPasswordSchema.parse(request.body);

    const user = await app.db.query.users.findFirst({
      where: eq(users.email, body.email),
    });

    // Always return success to prevent email enumeration
    if (user) {
      const resetToken = crypto.randomBytes(32).toString("hex");
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

      await app.db
        .update(users)
        .set({
          resetToken: crypto.createHash("sha256").update(resetToken).digest("hex"),
          resetTokenExpiresAt: expiresAt,
        })
        .where(eq(users.id, user.id));

      // TODO: Send email with reset link containing resetToken
      app.log.info({ resetToken, userId: user.id }, "Password reset requested");
    }

    reply.send({
      data: { message: "If an account exists, a reset link has been sent." },
    });
  });

  // POST /api/v1/auth/reset-password
  app.post("/reset-password", async (request, reply) => {
    const body = resetPasswordSchema.parse(request.body);

    const tokenHash = crypto.createHash("sha256").update(body.token).digest("hex");
    const user = await app.db.query.users.findFirst({
      where: eq(users.resetToken, tokenHash),
    });

    if (!user || !user.resetTokenExpiresAt || user.resetTokenExpiresAt < new Date()) {
      throw app.httpErrors.badRequest("Invalid or expired reset token");
    }

    const passwordHash = await bcrypt.hash(body.password, BCRYPT_ROUNDS);
    await app.db
      .update(users)
      .set({
        passwordHash,
        resetToken: null,
        resetTokenExpiresAt: null,
        refreshTokenHash: null,
      })
      .where(eq(users.id, user.id));

    reply.send({
      data: { message: "Password has been reset successfully." },
    });
  });

  // GET /api/v1/auth/me (protected)
  app.get("/me", {
    onRequest: [async (request) => {
      try {
        await request.jwtVerify();
        request.jwtPayload = request.user as typeof request.jwtPayload;
      } catch {
        throw app.httpErrors.unauthorized("Invalid or expired token");
      }
    }],
  }, async (request) => {
    const user = await app.db.query.users.findFirst({
      where: eq(users.id, request.jwtPayload.userId),
      columns: {
        id: true,
        email: true,
        name: true,
        phone: true,
        roles: true,
        cityId: true,
        trustScore: true,
        createdAt: true,
      },
    });

    if (!user) {
      throw app.httpErrors.notFound("User not found");
    }

    return { data: user };
  });
};
