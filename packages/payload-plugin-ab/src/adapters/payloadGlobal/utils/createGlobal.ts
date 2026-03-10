import type { GlobalConfig } from "payload";

export function createGlobal(slug: string, debug: boolean): GlobalConfig {
  return {
    slug,
    access: {
      read: () => true,
    },
    admin: {
      hidden: !debug,
      group: "System",
    },
    fields: [
      {
        name: "manifest",
        type: "json",
        admin: {
          description: "A/B testing manifest. Managed automatically — do not edit manually.",
        },
      },
    ],
  };
}
