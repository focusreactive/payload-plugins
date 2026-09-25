import { editorialInOwnMarkets, rejectMarketsOutsideEditorScope } from "@/lib/access/marketScoped";
import type { CollectionConfig } from "payload";

import { anyone, editorial } from "@/lib/access";
import { getPersonHref } from "@/dal";
import { marketsField } from "@/lib/fields/marketsField";
import { redirectOnPersonSlugChange } from "@/lib/hooks/redirectOnSlugChange";
import { generatePreviewPath } from "@/lib/utils/generatePreviewPath";

export const Person: CollectionConfig<"person"> = {
  access: {
    create: editorial,
    delete: editorialInOwnMarkets,
    read: anyone,
    update: editorialInOwnMarkets,
  },
  admin: {
    components: {
      edit: {
        PreviewButton: "/components/admin/VisualPreviewButton#VisualPreviewButton",
      },
    },
    defaultColumns: ["photo", "name", "jobTitle", "office", "email", "updatedAt"],
    group: "Content",
    livePreview: {
      url: async ({ data, locale }) =>
        generatePreviewPath({
          collection: "person",
          path:
            (await getPersonHref({ name: data?.name }, locale.code ?? locale.fallbackLocale)) ?? "",
          slug: data?.name,
        }),
    },
    pagination: {
      limits: [20, 50, 100],
    },
    preview: async (data, { locale }) =>
      generatePreviewPath({
        collection: "person",
        path: (await getPersonHref({ name: data?.name as string }, locale)) ?? "",
        slug: data?.name as string,
      }),
    useAsTitle: "name",
  },
  fields: [
    {
      admin: {
        description: {
          en: "This person's public web address is generated from their name. Changing it redirects the old address here automatically.",
          es: "La dirección web pública de esta persona se genera a partir de su nombre. Cambiarlo redirige automáticamente la dirección antigua a esta.",
          fr: "L'adresse web publique de cette personne est générée à partir de son nom. Si vous le modifiez, l'ancienne adresse redirige automatiquement vers la nouvelle.",
          ja: "この人物の公開ウェブアドレスは名前から生成されます。名前を変更すると、以前のアドレスは自動的に新しいアドレスへリダイレクトされます。",
        },
      },
      label: {
        en: "Name",
        es: "Nombre",
      },
      name: "name",
      required: true,
      type: "text",
    },
    {
      label: {
        en: "Job Title",
        es: "Cargo",
      },
      name: "jobTitle",
      required: true,
      type: "text",
    },
    {
      admin: {
        description: {
          en: "Used to match this person to an article's author automatically.",
          es: "Se usa para relacionar automáticamente a esta persona con el autor de un artículo.",
        },
      },
      label: {
        en: "Email",
        es: "Correo electrónico",
      },
      name: "email",
      required: true,
      type: "email",
      unique: true,
    },
    {
      label: {
        en: "Office",
        es: "Oficina",
      },
      name: "office",
      type: "text",
    },
    {
      label: {
        en: "Photo",
        es: "Foto",
      },
      name: "photo",
      relationTo: "media",
      type: "upload",
    },
    {
      label: {
        en: "Biography",
        es: "Biografía",
      },
      name: "biography",
      type: "textarea",
    },
    marketsField(),
  ],
  hooks: {
    afterChange: [redirectOnPersonSlugChange],
    beforeChange: [rejectMarketsOutsideEditorScope],
  },
  labels: {
    plural: {
      en: "People",
      es: "Personas",
    },
    singular: {
      en: "Person",
      es: "Persona",
    },
  },
  slug: "person",
};
