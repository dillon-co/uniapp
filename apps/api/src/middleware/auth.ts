import type { FastifyRequest, FastifyReply } from "fastify";
import type { Role } from "@uniapp/shared";

export async function authenticate(request: FastifyRequest, reply: FastifyReply) {
  try {
    await request.jwtVerify();
    request.jwtPayload = request.user as typeof request.jwtPayload;
  } catch {
    reply.status(401).send({
      type: "https://uniapp.dev/errors/unauthorized",
      title: "Unauthorized",
      status: 401,
      detail: "Invalid or expired token",
    });
  }
}

export function requireRoles(...roles: Role[]) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    await authenticate(request, reply);
    if (reply.sent) return;

    const userRoles = request.jwtPayload.roles as Role[];
    const hasRole = roles.some((role) => userRoles.includes(role));

    if (!hasRole) {
      reply.status(403).send({
        type: "https://uniapp.dev/errors/forbidden",
        title: "Forbidden",
        status: 403,
        detail: `Requires one of: ${roles.join(", ")}`,
      });
    }
  };
}
