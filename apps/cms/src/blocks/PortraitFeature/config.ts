import type { Block, Field } from "payload";

import { getBlockPreviewImage } from "@/lib/utils/blockPreviewImage";
import { createLocalizedDefault } from "@/lib/utils/createLocalizedDefault";
import { imageField } from "@/lib/fields/imageField";
import { injectSection } from "@/lib/fields/section/injectSection";
import { link } from "@/lib/fields/link";

const fields: Field[] = [
  {
    admin: {
      description: {
        en: "The small name that sits above the headline, beside the green star. A person's name reads best; anything longer than a few words crowds the star.",
        es: "El nombre pequeño que aparece sobre el titular, junto a la estrella verde. Funciona mejor con el nombre de una persona; más de unas pocas palabras aprieta la estrella.",
      },
    },
    defaultValue: createLocalizedDefault({ en: "Morgan Ellis", es: "Morgan Ellis" }),
    label: { en: "Name", es: "Nombre" },
    localized: true,
    name: "personName",
    required: true,
    type: "text",
  },
  {
    admin: {
      description: {
        en: "The large statement that says who this person is. It is set to about twenty characters a line, so roughly forty-five characters fills two lines and reads best. Put a word between asterisks to pick it out in green.",
        es: "La frase grande que dice quién es esta persona. Está pensada para unos veinte caracteres por línea, así que unos cuarenta y cinco caracteres llenan dos líneas y se leen mejor. Pon una palabra entre asteriscos para destacarla en verde.",
      },
    },
    defaultValue: createLocalizedDefault({
      en: "A Modern Voice for the Timeless Journey Within",
      es: "Una voz moderna para el viaje eterno hacia el interior",
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
        en: "One or two sentences under the headline, carrying the credentials that earn a reader's trust. It sits at the foot of the column against the bottom of the photograph, so two lines look best and four start to unbalance the pair.",
        es: "Una o dos frases bajo el titular, con las credenciales que ganan la confianza de quien lee. Se apoya al pie de la columna, a la altura del borde inferior de la fotografía, así que dos líneas quedan mejor y cuatro empiezan a desequilibrar el conjunto.",
      },
    },
    defaultValue: createLocalizedDefault({
      en: "Bestselling author, founder of the school behind this work, and a steady voice in modern practice.",
      es: "Autor superventas, fundador de la escuela que sostiene este trabajo y una voz serena en la práctica contemporánea.",
    }),
    label: { en: "Supporting text", es: "Texto de apoyo" },
    localized: true,
    name: "description",
    required: true,
    type: "textarea",
  },
  // The design has exactly one button style, so the appearance picker is switched off rather than
  // offering five variants an editor could pick a wrong-looking one from.
  link({
    appearances: false,
    overrides: {
      admin: {
        description: {
          en: "The button under the text. Leave the wording empty and no button is shown.",
          es: "El botón bajo el texto. Si dejas el texto vacío, no se muestra ningún botón.",
        },
      },
      defaultValue: createLocalizedDefault({
        en: { label: "Learn more", newTab: false, type: "custom", url: "#" },
        es: { label: "Más información", newTab: false, type: "custom", url: "#" },
      }),
    },
    required: false,
  }),
  {
    ...imageField("portrait", { required: false, withAspectRatio: false }),
    admin: {
      description: {
        en: "The photograph beside the text. It fills a tall rounded frame and is cropped from the centre, a little above the middle, so a face sits best in the upper half of the picture. Leave it empty and the photograph shown by default stays in place.",
        es: "La fotografía junto al texto. Llena un marco alto y redondeado y se recorta desde el centro, algo por encima de la mitad, así que una cara queda mejor en la mitad superior de la imagen. Si lo dejas vacío, se mantiene la fotografía que se muestra por defecto.",
      },
    },
    label: { en: "Photograph", es: "Fotografía" },
  },
];

export const PortraitFeatureBlock: Block = injectSection({
  slug: "portraitFeature",
  interfaceName: "PortraitFeatureBlock",
  ...getBlockPreviewImage("Portrait Feature"),
  labels: {
    plural: { en: "Portrait Features", es: "Retratos destacados" },
    singular: { en: "Portrait Feature", es: "Retrato destacado" },
  },
  fields,
});
