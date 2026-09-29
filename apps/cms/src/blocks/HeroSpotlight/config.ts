import type { Block, Field, GroupField } from "payload";

import { createLocalizedDefault } from "@/lib/utils/createLocalizedDefault";
import { getBlockPreviewImage } from "@/lib/utils/blockPreviewImage";
import { imageField } from "@/lib/fields/imageField";
import { injectSection } from "@/lib/fields/section/injectSection";
import { link } from "@/lib/fields/link";

const buttonTextDefault = createLocalizedDefault({
  en: "Browse the library",
  es: "Explorar la biblioteca",
});

/**
 * `link()` builds its label field inline inside a row, so the only way to ship the design's own
 * button text as a starting value is to walk the group it returns and set the default on the way
 * past. Merging a replacement `fields` array through `overrides` would drop every other link field.
 */
function withButtonTextDefault(groupFields: Field[]): Field[] {
  return groupFields.map((field) => {
    if (field.type !== "row") {
      return field;
    }

    return {
      ...field,
      fields: field.fields.map((rowField) =>
        rowField.type === "text" && rowField.name === "label"
          ? { ...rowField, defaultValue: buttonTextDefault }
          : rowField
      ),
    };
  });
}

const ctaLinkGroup = link({ appearances: false, required: false }) as GroupField;

const ctaLinkField: Field = {
  ...ctaLinkGroup,
  admin: {
    ...ctaLinkGroup.admin,
    description: {
      en: "The outlined button under the introduction. Clear the button text and no button is shown at all.",
      es: "El botón con contorno debajo de la introducción. Borra el texto del botón y no se mostrará ningún botón.",
    },
  },
  fields: withButtonTextDefault(ctaLinkGroup.fields),
  label: { en: "Button", es: "Botón" },
  name: "ctaLink",
};

const featuredCardLinkGroup = link({
  appearances: false,
  /**
   * Postgres caps an enum name at 63 characters and this select sits four levels deep, which lands
   * the derived name one character over. A `dbName` replaces the whole enum name rather than a
   * segment of it, so this one carries its own block prefix to stay unique across the schema.
   */
  customPageDbName: "hero_spotlight_card_link_custom_page",
  disableLabel: true,
  required: false,
}) as GroupField;

const featuredCardLinkField: Field = {
  ...featuredCardLinkGroup,
  admin: {
    ...featuredCardLinkGroup.admin,
    description: {
      en: "Where a visitor lands when they click the card.",
      es: "Adónde llega un visitante cuando hace clic en la tarjeta.",
    },
  },
  label: { en: "Card destination", es: "Destino de la tarjeta" },
};

const featuredCardFields: Field[] = [
  {
    admin: {
      description: {
        en: "The small line across the top of the card.",
        es: "La línea pequeña en la parte superior de la tarjeta.",
      },
    },
    defaultValue: createLocalizedDefault({
      en: "Featured teaching",
      es: "Enseñanza destacada",
    }),
    label: { en: "Card eyebrow", es: "Antetítulo de la tarjeta" },
    localized: true,
    name: "label",
    type: "text",
  },
  {
    ...imageField("image", { required: false, withAspectRatio: false }),
    admin: {
      description: {
        en: "The picture on the card. It is cropped to a wide rectangle, so keep the subject in the middle. Leave it empty and the flower picture is used.",
        es: "La imagen de la tarjeta. Se recorta en un rectángulo ancho, así que mantén el motivo en el centro. Déjala vacía y se usará la imagen de la flor.",
      },
    },
    label: { en: "Card picture", es: "Imagen de la tarjeta" },
  },
  {
    admin: {
      description: {
        en: "The name of the teaching the card points to.",
        es: "El nombre de la enseñanza a la que apunta la tarjeta.",
      },
    },
    defaultValue: createLocalizedDefault({
      en: "Fulfilling the True Purpose of Life",
      es: "Cumplir el verdadero propósito de la vida",
    }),
    label: { en: "Card title", es: "Título de la tarjeta" },
    localized: true,
    name: "title",
    required: true,
    type: "text",
  },
  {
    type: "row",
    fields: [
      {
        admin: {
          description: {
            en: "The score shown beside the green star. Leave it empty and the star disappears.",
            es: "La puntuación que aparece junto a la estrella verde. Déjala vacía y la estrella desaparece.",
          },
          width: "50%",
        },
        defaultValue: "4.9",
        label: { en: "Star score", es: "Puntuación" },
        name: "rating",
        type: "text",
      },
      {
        admin: {
          date: { displayFormat: "MMM d, yyyy", pickerAppearance: "dayOnly" },
          description: {
            en: "The date shown beside the score. It is written out in capitals to match the rest of the card.",
            es: "La fecha que aparece junto a la puntuación. Se escribe en mayúsculas para que coincida con el resto de la tarjeta.",
          },
          width: "50%",
        },
        defaultValue: "2026-08-24T00:00:00.000Z",
        label: { en: "Date", es: "Fecha" },
        name: "date",
        type: "date",
      },
    ],
  },
  {
    type: "row",
    fields: [
      {
        admin: {
          description: {
            en: "The price, shown in green. Type it exactly as it should appear, currency and all.",
            es: "El precio, en verde. Escríbelo exactamente como debe aparecer, incluida la moneda.",
          },
          width: "50%",
        },
        defaultValue: createLocalizedDefault({ en: "$3.99 USD", es: "3,99 USD" }),
        label: { en: "Price", es: "Precio" },
        localized: true,
        name: "price",
        type: "text",
      },
      {
        admin: {
          description: {
            en: "Shown struck through beside the price. Leave it empty when nothing is discounted.",
            es: "Se muestra tachado junto al precio. Déjalo vacío cuando no haya descuento.",
          },
          width: "50%",
        },
        defaultValue: createLocalizedDefault({ en: "$7.00 USD", es: "7,00 USD" }),
        label: { en: "Price before discount", es: "Precio anterior" },
        localized: true,
        name: "compareAtPrice",
        type: "text",
      },
    ],
  },
  featuredCardLinkField,
];

const fields: Field[] = [
  {
    admin: {
      description: {
        en: "The short line above the headline, with a green dot in front of it. A few words read best, because it sits on top of the photograph.",
        es: "La línea corta encima del titular, con un punto verde delante. Unas pocas palabras funcionan mejor, porque se lee sobre la fotografía.",
      },
    },
    defaultValue: createLocalizedDefault({
      en: "10,000+ teachings",
      es: "Más de 10.000 enseñanzas",
    }),
    label: { en: "Eyebrow", es: "Antetítulo" },
    localized: true,
    name: "eyebrow",
    type: "text",
  },
  {
    admin: {
      description: {
        en: "The first thing a visitor reads. It wraps onto two lines over the photograph, so keep it to one sentence.",
        es: "Lo primero que lee un visitante. Ocupa dos líneas sobre la fotografía, así que limítalo a una sola frase.",
      },
    },
    defaultValue: createLocalizedDefault({
      en: "Find wisdom for the moment you’re in",
      es: "Encuentra sabiduría para el momento que estás viviendo",
    }),
    label: { en: "Headline", es: "Titular" },
    localized: true,
    name: "heading",
    required: true,
    type: "text",
  },
  {
    admin: {
      description: {
        en: "One or two sentences under the headline saying what the library holds.",
        es: "Una o dos frases debajo del titular que cuentan qué contiene la biblioteca.",
      },
    },
    defaultValue: createLocalizedDefault({
      en: "Explore decades of practical teaching through talks, writings, courses, and live classes.",
      es: "Explora décadas de enseñanza práctica a través de charlas, escritos, cursos y clases en directo.",
    }),
    label: { en: "Introduction", es: "Introducción" },
    localized: true,
    name: "introText",
    type: "textarea",
  },
  ctaLinkField,
  {
    ...imageField("backgroundImage", { required: false, withAspectRatio: false }),
    admin: {
      description: {
        en: "The photograph filling the whole panel. Choose a wide, calm picture, because the white headline sits over its top left corner. Leave it empty and the meadow photograph is used.",
        es: "La fotografía que llena todo el panel. Elige una imagen amplia y serena, porque el titular blanco se sitúa sobre su esquina superior izquierda. Déjala vacía y se usará la fotografía del prado.",
      },
    },
    label: { en: "Background photo", es: "Foto de fondo" },
  },
  {
    type: "row",
    fields: [
      {
        admin: {
          description: {
            en: "Which part of the photograph stays in view when it is cropped to the panel. Move it if a face or a horizon gets cut off.",
            es: "Qué parte de la fotografía permanece visible cuando se recorta al panel. Cámbialo si se corta una cara o el horizonte.",
          },
          width: "50%",
        },
        defaultValue: "upper-middle",
        label: { en: "Photo focus", es: "Enfoque de la foto" },
        name: "backgroundFocalPoint",
        options: [
          { label: { en: "Top", es: "Parte superior" }, value: "top" },
          { label: { en: "Upper middle", es: "Zona superior" }, value: "upper-middle" },
          { label: { en: "Center", es: "Centro" }, value: "centre" },
          { label: { en: "Lower middle", es: "Zona inferior" }, value: "lower-middle" },
          { label: { en: "Bottom", es: "Parte inferior" }, value: "bottom" },
        ],
        type: "select",
      },
      {
        admin: {
          description: {
            en: "Darkens the photograph by this percentage so the white text stays readable. Raise it only if your own picture is too bright.",
            es: "Oscurece la fotografía en este porcentaje para que el texto blanco siga siendo legible. Súbelo solo si tu imagen es demasiado clara.",
          },
          step: 5,
          width: "50%",
        },
        defaultValue: 0,
        label: { en: "Extra shade", es: "Sombra adicional" },
        max: 60,
        min: 0,
        name: "photoDarkening",
        type: "number",
      },
    ],
  },
  {
    admin: {
      description: {
        en: "Turn this off to leave the photograph and headline on their own, with no card in the corner.",
        es: "Desactívalo para dejar solo la fotografía y el titular, sin tarjeta en la esquina.",
      },
    },
    defaultValue: true,
    label: { en: "Show the featured card", es: "Mostrar la tarjeta destacada" },
    name: "showFeaturedCard",
    type: "checkbox",
  },
  {
    admin: {
      condition: (_, siblingData) => Boolean(siblingData?.showFeaturedCard),
      description: {
        en: "The small white card in the bottom corner of the photograph.",
        es: "La pequeña tarjeta blanca en la esquina inferior de la fotografía.",
      },
      hideGutter: true,
    },
    fields: featuredCardFields,
    label: { en: "Featured card", es: "Tarjeta destacada" },
    name: "featuredCard",
    type: "group",
  },
];

export const HeroSpotlightBlock: Block = injectSection({
  slug: "heroSpotlight",
  interfaceName: "HeroSpotlightBlock",
  ...getBlockPreviewImage("Hero Spotlight"),
  labels: {
    plural: { en: "Hero Spotlights", es: "Heros destacados" },
    singular: { en: "Hero Spotlight", es: "Hero destacado" },
  },
  fields,
});
