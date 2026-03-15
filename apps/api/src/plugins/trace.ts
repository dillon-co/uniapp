import fp from "fastify-plugin";
import type { FastifyPluginAsync } from "fastify";
import crypto from "node:crypto";

declare module "fastify" {
  interface FastifyRequest {
    traceId: string;
  }
}

const tracePlugin: FastifyPluginAsync = async (app) => {
  app.decorateRequest("traceId", "");

  app.addHook("onRequest", async (request) => {
    request.traceId =
      (request.headers["x-trace-id"] as string) ??
      (request.headers["x-request-id"] as string) ??
      crypto.randomUUID();
  });

  app.addHook("onSend", async (request, reply) => {
    void reply.header("x-trace-id", request.traceId);
    void reply.header("x-request-id", request.traceId);
  });
};

export const trace = fp(tracePlugin, { name: "trace" });
