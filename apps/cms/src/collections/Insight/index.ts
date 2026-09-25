import { editorialInOwnMarkets, rejectMarketsOutsideEditorScope } from "@/lib/access/marketScoped";
import { slugField } from "payload";
import type { CollectionConfig, TextField } from "payload";

import { anyone, editorial } from "@/lib/access";
import { getInsightHref } from "@/dal";
import { marketsField } from "@/lib/fields/marketsField";
import { redirectOnInsightSlugChange } from "@/lib/hooks/redirectOnSlugChange";
import { validateAuthorMarkets } from "@/lib/fields/validateAuthorMarkets";
import {
  MANUAL_SHORTCODE_PREFIX,
  editableUnlessSyncedFromPassle,
  isSyncedFromPassle,
} from "@/lib/passle/syncedFromPassle";
import { generatePreviewPath } from "@/lib/utils/generatePreviewPath";
import { generateRichText } from "@/lib/utils/generateRichText";

const addressField = slugField({
  localized: true,
  overrides: (field) => {
    const addressTextField = field.fields?.[1] as TextField | undefined;

    if (addressTextField) {
      addressTextField.label = {
        en: "Address",
        es: "Dirección",
      };
      addressTextField.admin = {
        ...addressTextField.admin,
        description: {
          en: "The web address for this article, generated automatically from the title. Changing it redirects the old address here automatically.",
          es: "La dirección web de este artículo, generada automáticamente a partir del título. Cambiarla redirige automáticamente la dirección antigua a esta.",
          fr: "L'adresse web de cet article, générée automatiquement à partir du titre. Si vous la modifiez, l'ancienne adresse redirige automatiquement vers la nouvelle.",
          ja: "この記事のウェブアドレスです。タイトルから自動生成されます。変更すると、以前のアドレスは自動的に新しいアドレスへリダイレクトされます。",
        },
      };
    }

    return field;
  },
  required: true,
  useAsSlug: "title",
});

const sidebarMarketsField = marketsField();
sidebarMarketsField.admin = {
  ...sidebarMarketsField.admin,
  position: "sidebar",
};

export const Insight: CollectionConfig<"insight"> = {
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
    defaultColumns: ["title", "author", "publishedDate", "updatedAt"],
    // Pages, insights and people are one job for an editor, so they sit in one group.
    group: "Content",
    livePreview: {
      url: async ({ data, locale }) =>
        generatePreviewPath({
          collection: "insight",
          path:
            (await getInsightHref({ slug: data?.slug }, locale.code ?? locale.fallbackLocale)) ??
            "",
          slug: data?.slug,
        }),
    },
    pagination: {
      limits: [20, 50, 100],
    },
    preview: async (data, { locale }) =>
      generatePreviewPath({
        collection: "insight",
        path: (await getInsightHref({ slug: data?.slug as string }, locale)) ?? "",
        slug: data?.slug as string,
      }),
    useAsTitle: "title",
  },
  fields: [
    {
      admin: {
        components: {
          Field: "@/components/admin/SyncedFromPassleNote#SyncedFromPassleNote",
        },
        condition: (data) => isSyncedFromPassle(data?.passleShortcode),
        position: "sidebar",
      },
      name: "syncedFromPassleNote",
      type: "ui",
    },
    {
      // The shortcode is how a re-sync finds this document, so it never changes once set.
      access: {
        update: () => false,
      },
      // Not shown to editors: it is the thought-leadership platform's own sync
      // key, set by the ingest route, and there is nothing an editor can do
      // with it directly. A hand-created Insight (no Passle origin) never gets
      // one from the ingest route, so it needs a generated default here or it
      // can never pass the required+unique validation and can never be saved.
      admin: {
        hidden: true,
      },
      defaultValue: () => `${MANUAL_SHORTCODE_PREFIX}${crypto.randomUUID()}`,
      index: true,
      label: "Passle Shortcode",
      name: "passleShortcode",
      required: true,
      type: "text",
      unique: true,
    },
    {
      access: {
        update: editableUnlessSyncedFromPassle,
      },
      admin: {
        description: {
          en: "The article's headline.",
          es: "El titular del artículo.",
        },
      },
      label: {
        en: "Title",
        es: "Título",
      },
      localized: true,
      name: "title",
      required: true,
      type: "text",
    },
    {
      access: {
        update: editableUnlessSyncedFromPassle,
      },
      admin: {
        description: {
          en: "The one- or two-sentence summary shown above the article and in listings.",
          es: "El resumen de una o dos frases mostrado sobre el artículo y en los listados.",
        },
      },
      label: {
        en: "Standfirst",
        es: "Entradilla",
      },
      localized: true,
      name: "standfirst",
      required: true,
      type: "textarea",
    },
    {
      access: {
        update: editableUnlessSyncedFromPassle,
      },
      admin: {
        description: {
          en: "The full text of the article.",
          es: "El texto completo del artículo.",
        },
      },
      editor: generateRichText("default"),
      label: {
        en: "Article",
        es: "Artículo",
      },
      localized: true,
      name: "body",
      required: true,
      type: "richText",
    },
    addressField,
    {
      access: {
        update: editableUnlessSyncedFromPassle,
      },
      admin: {
        date: {
          pickerAppearance: "dayAndTime",
        },
        description: {
          en: "When this article was first published.",
          es: "Cuándo se publicó este artículo por primera vez.",
        },
        position: "sidebar",
      },
      label: {
        en: "Published Date",
        es: "Fecha de publicación",
      },
      name: "publishedDate",
      required: true,
      type: "date",
    },
    {
      admin: {
        description: {
          en: "Who wrote this article. Matched automatically from the article's author email; set it by hand if nothing matched.",
          es: "Quién escribió este artículo. Se relaciona automáticamente a partir del correo electrónico del autor del artículo; asígnalo a mano si no se encontró ninguna coincidencia.",
        },
        position: "sidebar",
      },
      label: {
        en: "Author",
        es: "Autor",
      },
      hasMany: false,
      name: "author",
      relationTo: "person",
      type: "relationship",
      validate: validateAuthorMarkets,
    },
    {
      admin: {
        condition: (data) => !data?.author,
        description: {
          en: "The email address the thought-leadership platform sent for this article's author. Filled in automatically when no matching person is found, so the right person can be linked above by hand. Clears once Author is set.",
          es: "El correo electrónico que envió la plataforma de contenidos para el autor de este artículo. Se completa automáticamente cuando no se encuentra ninguna persona coincidente, para poder enlazar a la persona correcta arriba a mano. Se borra al establecer el autor.",
        },
        position: "sidebar",
      },
      label: {
        en: "Author Email (Unmatched)",
        es: "Correo del autor (sin relacionar)",
      },
      name: "unmatchedAuthorEmail",
      type: "email",
    },
    sidebarMarketsField,
  ],
  hooks: {
    afterChange: [redirectOnInsightSlugChange],
    beforeChange: [rejectMarketsOutsideEditorScope],
  },
  labels: {
    plural: {
      en: "Insights",
      es: "Insights",
    },
    singular: {
      en: "Insight",
      es: "Insight",
    },
  },
  slug: "insight",
};
