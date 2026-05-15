import type { GlobalConfig } from "payload";

export function createGlobal(slug: string, debug: boolean): GlobalConfig {
  return {
    access: {
      read: () => true,
    },
    admin: {
      group: "System",
      hidden: !debug,
    },
    fields: [
      {
        name: "manifest",
        type: "json",
        admin: {
          description:
            "A/B testing manifest. Managed automatically — do not edit manually.",
        },
      },
    ],
    slug,
  };
}
