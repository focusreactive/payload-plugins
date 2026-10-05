import type { Field } from "payload";

export function abTestingRulesFields(): Field[] {
  return [
    {
      admin: {
        description:
          "Percentage of visitors routed to this variant. All variants for the same page must sum to ≤ 100%; the remainder is served the original page.",
      },
      defaultValue: 50,
      label: "Pass Percentage (%)",
      max: 99,
      min: 1,
      name: "passPercentage",
      required: true,
      type: "number",
    },
  ];
}
