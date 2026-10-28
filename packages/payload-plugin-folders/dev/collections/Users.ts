import type { CollectionConfig } from "payload";

export const userRoles = ["admin", "editor", "drafter", "editorLimited"] as const;

export type UserRole = (typeof userRoles)[number];

export const Users: CollectionConfig = {
  slug: "users",
  admin: { useAsTitle: "email" },
  auth: true,
  fields: [
    {
      name: "role",
      type: "select",
      defaultValue: "editor",
      options: [...userRoles],
      required: true,
      saveToJWT: true,
    },
  ],
};
