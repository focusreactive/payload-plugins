import type { Access, CollectionConfig, FieldAccess } from "payload";

export const userRoles = ["admin", "editor", "drafter", "editorLimited"] as const;

export type UserRole = (typeof userRoles)[number];

const isAdmin = (user: unknown): boolean => (user as { role?: string } | null)?.role === "admin";

const adminOnly: Access = ({ req }) => isAdmin(req.user);
const adminOnlyField: FieldAccess = ({ req }) => isAdmin(req.user);

/** An admin updates any user; anyone else only their own record. */
const adminOrSelf: Access = ({ req }) => {
  if (!req.user) {
    return false;
  }

  return isAdmin(req.user) ? true : { id: { equals: req.user.id } };
};

export const Users: CollectionConfig = {
  slug: "users",
  // Without these a signed-in editor could make an admin of themselves: the role and the folder
  // limit decide what the plugin's access checks allow.
  access: { create: adminOnly, delete: adminOnly, update: adminOrSelf },
  admin: { useAsTitle: "email" },
  auth: true,
  fields: [
    {
      name: "role",
      type: "select",
      access: { create: adminOnlyField, update: adminOnlyField },
      defaultValue: "editor",
      options: [...userRoles],
      required: true,
      saveToJWT: true,
    },
    {
      // The folder an editorLimited user may work in, with everything beneath it.
      name: "limitedFolder",
      type: "relationship",
      access: { create: adminOnlyField, update: adminOnlyField },
      admin: { condition: (data) => data?.role === "editorLimited" },
      relationTo: "folders",
    },
  ],
};
