import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { cities } from "@uniapp/db";
import {
  parseEventFromNaturalLanguage,
  EventRefusalError,
  EventParseError,
} from "@uniapp/ai";
import { authenticate } from "../middleware/auth.js";
import { Anthropic } from "@uniapp/ai";

const parseSchema = z.object({
  input: z.string().min(1).max(5000),
  cityId: z.string().uuid(),
});

export const parseRoutes: FastifyPluginAsync = async (app) => {
  // POST /api/v1/events/parse
  // Natural language → EDL, no side effects
  app.post(
    "/",
    { onRequest: [authenticate] },
    async (request, reply) => {
      const body = parseSchema.parse(request.body);

      // Load city context for system prompt
      const city = await app.db.query.cities.findFirst({
        where: eq(cities.id, body.cityId),
        columns: {
          name: true,
          state: true,
          timezone: true,
          permitConfig: true,
          regulatoryConfig: true,
        },
      });

      if (!city) throw app.httpErrors.notFound("City not found");

      try {
        const result = await parseEventFromNaturalLanguage({
          input: body.input,
          city: {
            name: city.name,
            state: city.state,
            timezone: city.timezone,
            permitConfig: city.permitConfig as Record<string, unknown>,
            regulatoryConfig: city.regulatoryConfig as Record<string, unknown>,
          },
        });

        return reply.send({
          data: {
            edl: result.edl,
            usage: result.usage,
          },
        });
      } catch (err) {
        if (err instanceof EventRefusalError) {
          throw app.httpErrors.createError(422, err.message);
        }
        if (err instanceof EventParseError) {
          throw app.httpErrors.badRequest(err.message);
        }
        if (err instanceof Anthropic.RateLimitError) {
          throw app.httpErrors.tooManyRequests("AI service rate limit reached");
        }
        if (err instanceof Anthropic.APIError) {
          app.log.error({ err }, "Anthropic API error");
          throw app.httpErrors.serviceUnavailable("AI service temporarily unavailable");
        }
        throw err;
      }
    },
  );
};
