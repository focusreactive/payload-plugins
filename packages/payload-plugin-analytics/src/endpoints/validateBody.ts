import { z } from "zod";

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/u;

const PresetSchema = z.object({
  preset: z.enum(["today", "yesterday", "last-7d", "last-14d", "last-30d", "last-90d"]),
});
const CustomDateRangeSchema = z
  .object({
    from: z.string().regex(ISO_DATE, "must be YYYY-MM-DD"),
    to: z.string().regex(ISO_DATE, "must be YYYY-MM-DD"),
  })
  .refine((v) => v.from <= v.to, {
    message: "from must be on or before to",
    path: ["from"],
  });

const DateRangeSchema = z.union([PresetSchema, CustomDateRangeSchema]);
const ComparisonSchema = z.union([
  z.object({ kind: z.literal("none") }),
  z.object({ kind: z.literal("previous-period") }),
]);

export const AnalyticsQuerySchema = z.object({
  dateRange: DateRangeSchema,
  comparison: ComparisonSchema.optional(),
});

export const AbExperimentQuerySchema = AnalyticsQuerySchema.extend({
  manifestKey: z.string().min(1).max(512),
});

export const TopNQuerySchema = AnalyticsQuerySchema.extend({
  limit: z.number().int().min(1).max(100).default(10),
});

export const TopCountriesQuerySchema = TopNQuerySchema.extend({
  dimension: z.enum(["country", "city"]).default("country"),
});

const DeviceCategorySchema = z.enum(["desktop", "mobile", "tablet", "other"]);

export const SessionsListQuerySchema = AnalyticsQuerySchema.extend({
  limit: z.number().int().min(1).max(250).default(50),
  cursor: z.string().optional(),
  hadLeadAction: z.boolean().optional(),
  source: z.string().min(1).max(200).optional(),
  device: DeviceCategorySchema.optional(),
  country: z.string().min(1).max(200).optional(),
});

export const JourneysQuerySchema = AnalyticsQuerySchema.extend({
  limit: z.number().int().min(1).max(100).default(20),
  maxSteps: z.number().int().min(2).max(16).default(8),
  sampleLimit: z.number().int().min(100).max(250_000).default(50_000),
});

export function formatZodIssues(issues: z.core.$ZodIssue[]) {
  return issues
    .map((i) => {
      const path = i.path.length ? `${i.path.join(".")}: ` : "";

      return `${path}${i.message}`;
    })
    .join("; ");
}
