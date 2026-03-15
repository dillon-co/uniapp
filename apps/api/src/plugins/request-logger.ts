import fp from "fastify-plugin";
import type { FastifyPluginAsync } from "fastify";

const SENSITIVE_HEADERS = new Set([
  "authorization",
  "cookie",
  "set-cookie",
  "x-api-key",
  "x-auth-token",
  "proxy-authorization",
]);

function redactHeaders(headers: Record<string, string | string[] | undefined>): Record<string, string | string[] | undefined> {
  const redacted: Record<string, string | string[] | undefined> = {};
  for (const [key, value] of Object.entries(headers)) {
    redacted[key] = SENSITIVE_HEADERS.has(key.toLowerCase()) ? "[REDACTED]" : value;
  }
  return redacted;
}

const requestLoggerImpl: FastifyPluginAsync = async (app) => {
  const isDev = process.env.NODE_ENV !== "production";

  app.addHook("onRequest", async (request) => {
    // Store start time on the request for duration tracking
    (request as unknown as { _logStart: number })._logStart = Date.now();
  });

  app.addHook("onResponse", async (request, reply) => {
    const start = (request as unknown as { _logStart?: number })._logStart;
    const durationMs = start !== undefined ? Date.now() - start : 0;

    const logData: Record<string, unknown> = {
      requestId: request.id,
      method: request.method,
      path: request.url,
      status: reply.statusCode,
      durationMs,
      ip: request.ip,
      userAgent: request.headers["user-agent"],
    };

    // Include redacted headers at debug level
    if (isDev) {
      logData.headers = redactHeaders(request.headers as Record<string, string | string[] | undefined>);
    }

    // Log request bodies for non-GET requests in development only
    if (isDev && request.method !== "GET" && request.body) {
      try {
        // Shallow clone to avoid mutating; redact password fields
        const body = typeof request.body === "object" && request.body !== null
          ? { ...(request.body as Record<string, unknown>) }
          : request.body;
        if (typeof body === "object" && body !== null) {
          const b = body as Record<string, unknown>;
          if ("password" in b) b["password"] = "[REDACTED]";
          if ("currentPassword" in b) b["currentPassword"] = "[REDACTED]";
          if ("newPassword" in b) b["newPassword"] = "[REDACTED]";
          if ("token" in b) b["token"] = "[REDACTED]";
          if ("secret" in b) b["secret"] = "[REDACTED]";
        }
        logData.body = body;
      } catch {
        logData.body = "[unserializable]";
      }
    }

    const level = reply.statusCode >= 500 ? "error" : reply.statusCode >= 400 ? "warn" : "info";
    app.log[level](logData, `${request.method} ${request.url} ${reply.statusCode}`);
  });

  app.addHook("onError", async (request, _reply, error) => {
    app.log.error(
      {
        requestId: request.id,
        method: request.method,
        path: request.url,
        error: {
          name: error.name,
          message: error.message,
          stack: process.env.NODE_ENV !== "production" ? error.stack : undefined,
        },
      },
      "Request error",
    );
  });

  app.log.info("Request logger plugin loaded (structured JSON, header redaction)");
};

export const requestLoggerPlugin = fp(requestLoggerImpl, { name: "request-logger" });
