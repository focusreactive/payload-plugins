import { z } from "zod";

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

const PresetSchema = z.object({
  preset: z.enum(["today", "yesterday", "last-7d", "last-30d", "last-90d"]),
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

export const TopNQuerySchema = AnalyticsQuerySchema.extend({
  limit: z.number().int().min(1).max(100).default(10),
});

export const SessionsListQuerySchema = AnalyticsQuerySchema.extend({
  limit: z.number().int().min(1).max(250).default(50),
  cursor: z.string().optional(),
  hadLeadAction: z.boolean().optional(),
});

export function formatZodIssues(issues: z.core.$ZodIssue[]) {
  return issues
    .map((i) => {
      const path = i.path.length ? `${i.path.join(".")}: ` : "";

      return `${path}${i.message}`;
    })
    .join("; ");
}
