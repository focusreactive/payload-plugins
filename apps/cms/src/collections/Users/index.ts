import { MARKET_OPTIONS } from "@/lib/fields/marketsField";
import type { CollectionConfig } from "payload";

import { authenticated, onlySelf, superAdmin } from "@/lib/access";

export const Users: CollectionConfig<"users"> = {
  access: {
    admin: authenticated,
    create: superAdmin,
    delete: ({ req: { user }, id }) => {
      if (!user) {
        return false;
      }
      if (user.collection !== "users") {
        return true;
      }
      return superAdmin({ req: { user } }) && id !== user.id;
    },
    read: ({ req: { user } }) => {
      if (!user) {
        return false;
      }
      return true;
    },
    update: ({ req: { user } }) => {
      if (!user) {
        return false;
      }
      if (user.collection !== "users") {
        return true;
      }
      if (superAdmin({ req: { user } })) {
        return true;
      }

      return onlySelf({ req: { user } } as { req: { user: typeof user } });
    },
  },
  admin: {
    defaultColumns: ["name", "role", "email", "updatedAt"],
    group: "Administration",
    pagination: {
      limits: [20, 50, 100],
    },
    useAsTitle: "name",
  },
  auth: true,
  fields: [
    {
      admin: {
        description: {
          en: "The name of the user",
          es: "El nombre del usuario",
        },
      },
      defaultValue: "",
      label: {
        en: "Name",
        es: "Nombre",
      },
      name: "name",
      required: true,
      type: "text",
    },
    {
      access: {
        update: ({ req: { user }, doc }) => {
          if (!user) {
            return false;
          }
          if (user.collection !== "users") {
            return false;
          }
          return superAdmin({ req: { user } }) && user.id !== doc?.id;
        },
      },
      admin: {
        description: {
          en: "Administrator: everything, including users and settings. Global editor: content in every market, and approves fee-earners' profile changes. Market editor: content and profile approvals only in the markets set below, and cannot create or delete pages. Fee-earner: only their own linked profile, and every change waits for an editor's approval.",
          es: "Administrador: todo. Editor global: todos los mercados. Editor de mercado: solo sus mercados. Abogado: solo su propio perfil, con aprobación.",
        },
        position: "sidebar",
      },
      defaultValue: "feeEarner",
      label: {
        en: "Role",
        es: "Rol",
      },
      name: "role",
      options: [
        { label: { en: "Administrator", es: "Administrador" }, value: "administrator" },
        { label: { en: "Global editor", es: "Editor global" }, value: "globalEditor" },
        { label: { en: "Market editor", es: "Editor de mercado" }, value: "marketEditor" },
        { label: { en: "Fee-earner", es: "Abogado" }, value: "feeEarner" },
      ],
      required: true,
      saveToJWT: true,
      type: "select",
    },
    {
      name: "markets",
      type: "select",
      hasMany: true,
      options: [...MARKET_OPTIONS],
      admin: {
        position: "sidebar",
        description: {
          en: "The markets this editor may change articles and people in. With none set, they can change nothing market-scoped.",
          es: "Los mercados en los que este editor puede cambiar contenido.",
        },
        condition: (data) => data?.role === "marketEditor",
      },
      access: {
        // Only an admin decides which markets an editor may publish to.
        update: ({ req: { user } }) =>
          Boolean(user && "role" in user && user.role === "administrator"),
      },
      label: { en: "Markets this editor looks after", es: "Mercados de este editor" },
      saveToJWT: true,
    },
    {
      name: "person",
      type: "relationship",
      relationTo: "person",
      admin: {
        position: "sidebar",
        description: {
          en: "The profile this fee-earner may edit. Their changes are saved as drafts for an editor to publish.",
          es: "El perfil que este usuario puede editar.",
        },
        condition: (data) => data?.role === "feeEarner",
      },
      access: {
        // Only an admin decides whose profile a fee-earner may edit.
        update: ({ req: { user } }) =>
          Boolean(user && "role" in user && user.role === "administrator"),
      },
      label: { en: "Profile", es: "Perfil" },
    },
  ],
  labels: {
    plural: {
      en: "Users",
      es: "Usuarios",
    },
    singular: {
      en: "User",
      es: "Usuario",
    },
  },
  slug: "users",
};
