import type { Field } from "payload";

export function abTestingRulesFields(): Field[] {
  return [
    {
      admin: {
        description: {
          en: "Percentage of visitors routed to this variant. All variants for the same page must sum to ≤ 100%; the remainder is served the original page.",
          es: "Porcentaje de visitantes enrutados a esta variante. Todas las variantes de la misma página deben sumar ≤ 100%; el resto recibe la página original.",
        },
      },
      defaultValue: 50,
      label: { en: "Pass Percentage (%)", es: "Porcentaje de Tráfico (%)" },
      max: 99,
      min: 1,
      name: "passPercentage",
      required: true,
      type: "number",
    },
  ];
}
