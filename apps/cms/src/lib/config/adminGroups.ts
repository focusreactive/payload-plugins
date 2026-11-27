// Sidebar groups shared by several collections. Payload groups nav entries by the resolved label,
// so every member must use the same object to land in one group.
export const ADMIN_GROUPS = {
  visualSections: { en: "Visual sections", es: "Secciones visuales" },
} as const satisfies Record<string, Record<"en" | "es", string>>;
