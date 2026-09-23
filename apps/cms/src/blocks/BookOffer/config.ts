import type { Block, Field } from "payload";

import { getBlockPreviewImage } from "@/lib/utils/blockPreviewImage";
import { createLocalizedDefault } from "@/lib/utils/createLocalizedDefault";
import { imageField } from "@/lib/fields/imageField";
import { injectSection } from "@/lib/fields/section/injectSection";

const fields: Field[] = [
  {
    admin: {
      description: {
        en: "The short line beside the star, above the title. It is the first thing people read, so say what they get and that it costs them nothing.",
        es: "La línea corta junto a la estrella, encima del título. Es lo primero que se lee, así que di qué reciben y que no les cuesta nada.",
      },
    },
    defaultValue: createLocalizedDefault({
      en: "Get our bestselling ebook, free",
      es: "Consigue gratis nuestro ebook más vendido",
    }),
    label: { en: "Offer line", es: "Línea de oferta" },
    localized: true,
    name: "eyebrow",
    type: "text",
  },
  {
    admin: {
      description: {
        en: "The name of the book, set in the largest type on the panel. It is also the wording read aloud to describe the cover picture, so write it exactly as it appears on the book.",
        es: "El nombre del libro, en el texto más grande del panel. También es lo que se lee en voz alta para describir la imagen de la portada, así que escríbelo tal y como aparece en el libro.",
      },
    },
    defaultValue: createLocalizedDefault({
      en: "A Field Guide to Beginning Again",
      es: "Guía práctica para volver a empezar",
    }),
    label: { en: "Book title", es: "Título del libro" },
    localized: true,
    name: "heading",
    required: true,
    type: "text",
  },
  {
    admin: {
      description: {
        en: "One line under the title telling people what they have to do to receive the book.",
        es: "Una línea bajo el título que explica qué hay que hacer para recibir el libro.",
      },
    },
    defaultValue: createLocalizedDefault({
      en: "Simply by Joining Our Newsletter List!",
      es: "¡Solo con unirte a nuestra lista de correo!",
    }),
    label: { en: "Supporting line", es: "Línea de apoyo" },
    localized: true,
    name: "description",
    type: "text",
  },
  {
    type: "row",
    fields: [
      {
        admin: {
          description: {
            en: "The faint wording shown inside the empty email box before anyone types. It is also what is read aloud to someone using a screen reader, so keep it plain.",
            es: "El texto tenue que aparece dentro del campo de correo vacío antes de escribir. También es lo que se lee en voz alta a quien usa un lector de pantalla, así que mantenlo sencillo.",
          },
          width: "50%",
        },
        defaultValue: createLocalizedDefault({
          en: "Enter your email address",
          es: "Introduce tu correo electrónico",
        }),
        label: { en: "Email box prompt", es: "Texto guía del campo de correo" },
        localized: true,
        name: "emailPlaceholder",
        required: true,
        type: "text",
      },
      {
        admin: {
          description: {
            en: "The words on the white button people press to ask for the book. Two or three words keep it on one line.",
            es: "Las palabras del botón blanco que se pulsa para pedir el libro. Con dos o tres palabras cabe en una sola línea.",
          },
          width: "50%",
        },
        defaultValue: createLocalizedDefault({
          en: "Subscribe Now",
          es: "Suscríbete ahora",
        }),
        label: { en: "Button wording", es: "Texto del botón" },
        localized: true,
        name: "submitLabel",
        required: true,
        type: "text",
      },
    ],
  },
  {
    admin: {
      description: {
        en: "What appears in place of the email box once someone has signed up, so they know it worked.",
        es: "Lo que aparece en lugar del campo de correo cuando alguien se apunta, para que sepa que ha funcionado.",
      },
    },
    defaultValue: createLocalizedDefault({
      en: "Thank you. Your copy is on its way to your inbox.",
      es: "Gracias. Tu ejemplar va camino de tu bandeja de entrada.",
    }),
    label: { en: "Thank-you message", es: "Mensaje de agradecimiento" },
    localized: true,
    name: "successMessage",
    required: true,
    type: "text",
  },
  {
    ...imageField("cover", { required: false, withAspectRatio: false }),
    admin: {
      description: {
        en: "A picture of the book, standing upright and breaking out past the top and bottom of the panel. Upload it with the background removed so nothing shows as a rectangle behind it. Leave it empty and the panel runs as text only.",
        es: "Una imagen del libro, en vertical, que sobresale por arriba y por abajo del panel. Súbela con el fondo recortado para que no se vea ningún rectángulo detrás. Si lo dejas vacío, el panel se muestra solo con texto.",
      },
    },
    label: { en: "Book picture", es: "Imagen del libro" },
  },
];

export const BookOfferBlock: Block = injectSection({
  slug: "bookOffer",
  interfaceName: "BookOfferBlock",
  ...getBlockPreviewImage("Book Offer"),
  labels: {
    plural: { en: "Book Offers", es: "Ofertas de libro" },
    singular: { en: "Book Offer", es: "Oferta de libro" },
  },
  fields,
});
