import type { CollectionConfig } from "payload";

import { authenticated, onlySelf, or, superAdmin, user } from "@/lib/access";

export const Users: CollectionConfig<"users"> = {
  access: {
    admin: authenticated,
    create: or(superAdmin, user),
    delete: ({ req: { user }, id }) => {
      if (!user) {
        return false;
      }
      if (user.collection !== "users") {
        return true;
      }
      if (superAdmin({ req: { user } }) && id !== user.id) {
        return true;
      }

      if (user?.role === "admin") {
        if (id === user.id) {
          return false;
        }
        return true;
      }
      return false;
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
    group: "Settings",
    pagination: {
      limits: [20, 50, 100],
    },
    useAsTitle: "email",
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
          if (superAdmin({ req: { user } }) && user.id !== doc?.id) {
            return true;
          }
          if (user?.role === "admin" && user.id !== doc?.id) {
            return true;
          }

          return false;
        },
      },
      admin: {
        description: {
          en: "The role of the user",
          es: "El rol del usuario",
        },
        position: "sidebar",
      },
      defaultValue: "admin",
      label: {
        en: "Role",
        es: "Rol",
      },
      name: "role",
      options: [
        {
          label: {
            en: "Admin",
            es: "Admin",
          },
          value: "admin",
        },
        {
          label: {
            en: "Author",
            es: "Autor",
          },
          value: "author",
        },
        {
          label: {
            en: "User",
            es: "Usuario",
          },
          value: "user",
        },
      ],
      required: true,
      saveToJWT: true,
      type: "select",
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
