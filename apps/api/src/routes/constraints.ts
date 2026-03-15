import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { ConstraintSolver } from "@uniapp/agents";
import { authenticate } from "../middleware/auth.js";

const constraintSchema = z.object({
  type: z.enum(["hard", "soft"]),
  category: z.enum(["date", "budget", "capacity", "vendor", "permit", "location", "other"]),
  description: z.string().min(1).max(500),
  value: z.unknown().optional(),
  priority: z.number().int().min(1).max(10).optional(),
});

const solveSchema = z.object({
  eventTitle: z.string().min(1).max(255),
  eventId: z.string().uuid(),
  conflictDescription: z.string().min(1).max(2000),
  constraints: z.array(constraintSchema).min(1).max(20),
  availableAlternatives: z.array(z.string()).max(10).optional(),
});

const budgetCheckSchema = z.object({
  eventTitle: z.string(),
  eventId: z.string().uuid(),
  budgetCents: z.number().int().min(0),
  proposedSpendCents: z.number().int().min(0),
  breakdownByCategory: z.record(z.string(), z.number()),
});

export const constraintRoutes: FastifyPluginAsync = async (app) => {
  // POST /api/v1/constraints/solve
  app.post(
    "/solve",
    { onRequest: [authenticate] },
    async (request) => {
      if (!process.env.ANTHROPIC_API_KEY) {
        throw app.httpErrors.serviceUnavailable("AI service not configured");
      }

      const body = solveSchema.parse(request.body);
      const solver = new ConstraintSolver();
      const resolution = await solver.solve(body);

      return { data: resolution };
    },
  );

  // POST /api/v1/constraints/budget-check
  app.post(
    "/budget-check",
    { onRequest: [authenticate] },
    async (request) => {
      if (!process.env.ANTHROPIC_API_KEY) {
        throw app.httpErrors.serviceUnavailable("AI service not configured");
      }

      const body = budgetCheckSchema.parse(request.body);
      const solver = new ConstraintSolver();
      const resolution = await solver.checkBudgetConstraint(body);

      return { data: resolution };
    },
  );
};
