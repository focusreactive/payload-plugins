# Examples

## Full Example

Configuration with all main options.

```ts
// payload.config.ts
import { commentsPlugin } from "@focus-reactive/payload-plugin-comments";

export default buildConfig({
  plugins: [
    commentsPlugin({
      enabled: true,
      collections: [
        { slug: "pages", titleField: "title" },
        { slug: "posts", titleField: "title" },
        { slug: "products", titleField: "name" },
      ],
      usernameFieldPath: "name",
      tenant: {
        enabled: true,
        collectionSlug: "tenants",
        documentTenantField: "tenant",
      },
      overrides: {
        access: {
          read: ({ req }) => !!req.user,
          create: ({ req }) => !!req.user,
          update: ({ req }) => !!req.user,
          delete: ({ req }) => req.user?.role === "admin",
        },
        fields: (defaultFields) => [
          ...defaultFields,
          {
            name: "priority",
            type: "select",
            options: ["low", "medium", "high"],
          },
        ],
      },
      translations: {
        fr: {
          label: "Commentaires",
          add: "Ajouter un commentaire",
          comment: "Commenter",
          resolve: "Résoudre",
          reopen: "Rouvrir",
          delete: "Supprimer",
          cancel: "Annuler",
        },
      },
    }),
  ],
});
```

---

## Stylesheet Import

In your admin's custom global CSS file (e.g. `app/(payload)/custom.scss`):

```css
@import "@focus-reactive/payload-plugin-comments/styles.css";
```

Or in a TypeScript entry point:

```ts
import "@focus-reactive/payload-plugin-comments/styles.css";
```

---

## Nested Username Field

When the display name lives inside a nested object on the users collection.

```ts
// Users collection has: { profile: { displayName: string } }
commentsPlugin({
  usernameFieldPath: "profile.displayName",
});
```

---

## Multi-tenant Setup

```ts
import { multiTenantPlugin } from "@payloadcms/plugin-multi-tenant";
import { commentsPlugin } from "@focus-reactive/payload-plugin-comments";

export default buildConfig({
  plugins: [
    multiTenantPlugin({
      collections: { pages: {}, posts: {} },
    }),
    commentsPlugin({
      tenant: {
        enabled: true,
        collectionSlug: "tenants",
        documentTenantField: "tenant",
      },
    }),
  ],
});
```
