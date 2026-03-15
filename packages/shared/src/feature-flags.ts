/**
 * Feature flags — controlled via environment variables.
 * All flags are OFF by default; enable in .env or K8s ConfigMap.
 *
 * Usage:
 *   import { flags } from "@uniapp/shared/feature-flags";
 *   if (flags.AI_ORCHESTRATION) { ... }
 */

function flag(name: string, defaultValue = false): boolean {
  const val = process.env[`FEATURE_${name}`];
  if (val === undefined) return defaultValue;
  return val === "1" || val.toLowerCase() === "true";
}

export const flags = {
  // Core AI features
  AI_ORCHESTRATION: flag("AI_ORCHESTRATION", true),
  AI_NEGOTIATION: flag("AI_NEGOTIATION", true),
  AI_CONSTRAINT_SOLVER: flag("AI_CONSTRAINT_SOLVER", true),
  AI_DEMAND_FORECASTING: flag("AI_DEMAND_FORECASTING", false),
  AI_DYNAMIC_PRICING: flag("AI_DYNAMIC_PRICING", false),
  AI_RISK_ASSESSMENT: flag("AI_RISK_ASSESSMENT", false),

  // Payments
  STRIPE_PAYMENTS: flag("STRIPE_PAYMENTS", false),

  // Platform features
  VOLUNTEER_MATCHING: flag("VOLUNTEER_MATCHING", true),
  SPONSOR_MATCHING: flag("SPONSOR_MATCHING", false),
  PERMIT_GENERATION: flag("PERMIT_GENERATION", false),

  // Real-time
  WEBSOCKET: flag("WEBSOCKET", true),
  PUSH_NOTIFICATIONS: flag("PUSH_NOTIFICATIONS", false),

  // Multi-city
  MULTI_CITY: flag("MULTI_CITY", false),
} as const;

export type FeatureFlag = keyof typeof flags;

export function isEnabled(flag: FeatureFlag): boolean {
  return flags[flag];
}
