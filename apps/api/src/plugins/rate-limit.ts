import fp from "fastify-plugin";
import rateLimit from "@fastify/rate-limit";
import type { FastifyPluginAsync } from "fastify";

const rateLimitPlugin: FastifyPluginAsync = async (app) => {
  await app.register(rateLimit, {
    global: true,
    max: 1000,
    timeWindow: "1 minute",
    keyGenerator: (request) => {
      // Per-user rate limit when authenticated, fall back to IP
      const payload = request.jwtPayload as { userId?: string } | undefined;
      return payload?.userId ?? request.ip;
    },
    errorResponseBuilder: (_request, context) => ({
      type: "https://uniapp.dev/errors/rate_limit",
      title: "Too Many Requests",
      status: 429,
      detail: `Rate limit exceeded. Retry in ${Math.ceil(context.ttl / 1000)} seconds.`,
    }),
    // Auth endpoints have stricter limits
    addHeadersOnExceeding: {
      "x-ratelimit-limit": true,
      "x-ratelimit-remaining": true,
      "x-ratelimit-reset": true,
    },
  });
};

export const rateLimitPlugin_ = fp(rateLimitPlugin, { name: "rate-limit" });
