import { z } from "zod";

export const EventType = z.enum([
  "concert",
  "festival",
  "market",
  "conference",
  "workshop",
  "meetup",
  "sports",
  "parade",
  "fundraiser",
  "emergency",
  "other",
]);

export const EventVisibility = z.enum(["public", "private", "city_staff_only"]);

export const DateFlexibility = z.enum([
  "exact",
  "flexible_day",
  "flexible_week",
  "flexible_month",
  "tbd",
]);

export const LocationType = z.enum(["indoor", "outdoor", "hybrid"]);

export const EdlScheduleSchema = z.object({
  start: z.string().datetime().optional(),
  end: z.string().datetime().optional(),
  flexibility: DateFlexibility.default("tbd"),
  durationHours: z.number().min(0.5).max(168).optional(),
  setup_hours: z.number().min(0).max(24).default(2),
  teardown_hours: z.number().min(0).max(24).default(2),
});

export const EdlLocationSchema = z.object({
  type: LocationType.default("outdoor"),
  preferredCity: z.string().optional(),
  preferredArea: z.string().optional(),
  venueId: z.string().uuid().optional(),
  coordinates: z
    .object({ lat: z.number(), lng: z.number() })
    .optional(),
});

export const EdlAttendanceSchema = z.object({
  min: z.number().int().min(1).default(1),
  max: z.number().int().min(1),
  expected: z.number().int().min(1).optional(),
});

export const EdlBudgetSchema = z.object({
  totalCents: z.number().int().min(0),
  breakdown: z
    .record(
      z.string(),
      z.object({
        estimatedCents: z.number().int().min(0),
        confirmedCents: z.number().int().min(0).optional(),
      }),
    )
    .default({}),
  currency: z.string().length(3).default("USD"),
});

export const EdlRequirementsSchema = z.object({
  permitTypes: z.array(z.string()).default([]),
  permitNotes: z.string().optional(),
  vendors: z
    .array(
      z.object({
        category: z.string(),
        count: z.number().int().min(1).default(1),
        notes: z.string().optional(),
      }),
    )
    .default([]),
  volunteers: z
    .object({
      min: z.number().int().min(0).default(0),
      max: z.number().int().min(0).default(0),
      roles: z.array(z.string()).default([]),
    })
    .optional(),
  stages: z.number().int().min(0).default(0),
  equipment: z.array(z.string()).default([]),
  accessibility: z.array(z.string()).default([]),
  security: z.boolean().default(false),
  medicalStaff: z.boolean().default(false),
});

export const EdlSchema = z.object({
  edl_version: z.literal("1.0").default("1.0"),
  type: EventType,
  visibility: EventVisibility.default("public"),
  title: z.string().min(1).max(255),
  description: z.string().max(5000).optional(),
  schedule: EdlScheduleSchema,
  location: EdlLocationSchema,
  attendance: EdlAttendanceSchema,
  budget: EdlBudgetSchema.optional(),
  requirements: EdlRequirementsSchema.default({}),
  tags: z.array(z.string()).default([]),
  notes: z.string().max(2000).optional(),
  clarifications_needed: z.array(z.string()).default([]),
});

export const EdlPatchSchema = EdlSchema.deepPartial().extend({
  edl_version: z.literal("1.0").optional(),
});

export type Edl = z.infer<typeof EdlSchema>;
export type EdlPatch = z.infer<typeof EdlPatchSchema>;
export type EdlSchedule = z.infer<typeof EdlScheduleSchema>;
export type EdlLocation = z.infer<typeof EdlLocationSchema>;
export type EdlAttendance = z.infer<typeof EdlAttendanceSchema>;
export type EdlBudget = z.infer<typeof EdlBudgetSchema>;
export type EdlRequirements = z.infer<typeof EdlRequirementsSchema>;
