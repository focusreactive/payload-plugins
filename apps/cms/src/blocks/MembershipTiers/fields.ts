import type { Field } from "payload";

import { createLocalizedDefault } from "@/lib/utils/createLocalizedDefault";
import { imageField } from "@/lib/fields/imageField";
import { link } from "@/lib/fields/link";

/**
 * Sample plans, in the shape the concept draws. The annual figures sit 20% under the monthly ones
 * so the saving tag beside the switch tells the truth against the defaults an editor first sees.
 */
const tierDefaults = createLocalizedDefault({
  en: [
    {
      emphasis: "standard",
      features: [
        { label: "A new talk every week" },
        { label: "The full archive of past sessions" },
        { label: "Guided practices you can start today" },
        { label: "The members-only newsletter" },
        { label: "Cancel any time" },
      ],
      featuresHeading: "What’s Included",
      link: { label: "Get Started", newTab: false, type: "custom", url: "#" },
      name: "Basic",
      priceAnnual: "$7.20",
      priceMonthly: "$9.00",
      tagline: "Great Start for Seekers",
    },
    {
      badge: "Most popular",
      emphasis: "featured",
      features: [
        { label: "Two live sessions every month" },
        { label: "Question and answer with the teacher" },
        { label: "Downloadable audio for offline listening" },
        { label: "The complete course library" },
        { label: "Study notes for every talk" },
        { label: "A private discussion circle" },
      ],
      featuresHeading: "All Included from Basic Plan Plus",
      link: { label: "Get Started", newTab: false, type: "custom", url: "#" },
      name: "Premium",
      priceAnnual: "$14.40",
      priceMonthly: "$18.00",
      tagline: "Go Deeper",
    },
    {
      emphasis: "standard",
      features: [
        { label: "Every retreat recorded and on demand" },
        { label: "Early access to new courses" },
        { label: "The full book and talk collection" },
        { label: "Small-group practice calls" },
        { label: "One-to-one guidance twice a year" },
      ],
      featuresHeading: "All Included from Premium Plan Plus",
      link: { label: "Get Started", newTab: false, type: "custom", url: "#" },
      name: "All Access",
      priceAnnual: "$23.20",
      priceMonthly: "$29.00",
      tagline: "Complete Immersion",
    },
  ],
  es: [
    {
      emphasis: "standard",
      features: [
        { label: "Una charla nueva cada semana" },
        { label: "El archivo completo de sesiones anteriores" },
        { label: "Prácticas guiadas para empezar hoy" },
        { label: "El boletín exclusivo para miembros" },
        { label: "Cancela cuando quieras" },
      ],
      featuresHeading: "Qué incluye",
      link: { label: "Empezar", newTab: false, type: "custom", url: "#" },
      name: "Básico",
      priceAnnual: "$7.20",
      priceMonthly: "$9.00",
      tagline: "Un gran comienzo para quien busca",
    },
    {
      badge: "Más popular",
      emphasis: "featured",
      features: [
        { label: "Dos sesiones en directo cada mes" },
        { label: "Preguntas y respuestas con el maestro" },
        { label: "Audio descargable para escuchar sin conexión" },
        { label: "La biblioteca completa de cursos" },
        { label: "Apuntes de estudio para cada charla" },
        { label: "Un círculo privado de conversación" },
      ],
      featuresHeading: "Todo lo del plan Básico, y además",
      link: { label: "Empezar", newTab: false, type: "custom", url: "#" },
      name: "Premium",
      priceAnnual: "$14.40",
      priceMonthly: "$18.00",
      tagline: "Ve más hondo",
    },
    {
      emphasis: "standard",
      features: [
        { label: "Todos los retiros grabados y a la carta" },
        { label: "Acceso anticipado a los cursos nuevos" },
        { label: "La colección completa de libros y charlas" },
        { label: "Llamadas de práctica en grupo reducido" },
        { label: "Orientación individual dos veces al año" },
      ],
      featuresHeading: "Todo lo del plan Premium, y además",
      link: { label: "Empezar", newTab: false, type: "custom", url: "#" },
      name: "Acceso Total",
      priceAnnual: "$23.20",
      priceMonthly: "$29.00",
      tagline: "Inmersión completa",
    },
  ],
});

const tierRowFields: Field[] = [
  {
    type: "row",
    fields: [
      {
        admin: {
          description: {
            en: "The name at the top of the card.",
            es: "El nombre en la parte superior de la tarjeta.",
          },
          width: "60%",
        },
        label: { en: "Plan Name", es: "Nombre del plan" },
        localized: true,
        name: "name",
        required: true,
        type: "text",
      },
      {
        admin: {
          description: {
            en: "Highlighted lifts one plan onto a white card so the eye lands on it first. Use it on one plan only.",
            es: "Destacado eleva un plan sobre una tarjeta blanca para que la mirada se detenga en él. Úsalo en un solo plan.",
          },
          width: "40%",
        },
        defaultValue: "standard",
        label: { en: "Card Style", es: "Estilo de tarjeta" },
        name: "emphasis",
        options: [
          { label: { en: "Standard", es: "Estándar" }, value: "standard" },
          { label: { en: "Highlighted", es: "Destacado" }, value: "featured" },
        ],
        type: "select",
      },
    ],
  },
  {
    admin: {
      description: {
        en: "One short line under the plan name saying who the plan suits.",
        es: "Una línea breve bajo el nombre del plan que indique a quién le conviene.",
      },
    },
    label: { en: "Tagline", es: "Lema" },
    localized: true,
    name: "tagline",
    type: "text",
  },
  {
    admin: {
      condition: (_, siblingData) => siblingData?.emphasis === "featured",
      description: {
        en: "The small green tag beside the plan name. It only appears on the highlighted plan.",
        es: "La pequeña etiqueta verde junto al nombre del plan. Solo aparece en el plan destacado.",
      },
    },
    label: { en: "Highlight Tag", es: "Etiqueta destacada" },
    localized: true,
    name: "badge",
    type: "text",
  },
  {
    type: "row",
    fields: [
      {
        admin: {
          description: {
            en: "Shown while the switch is on monthly. Type it exactly as it should read, currency sign and all.",
            es: "Se muestra cuando el conmutador está en mensual. Escríbelo tal como debe leerse, con símbolo de moneda incluido.",
          },
          width: "50%",
        },
        label: { en: "Monthly Price", es: "Precio mensual" },
        localized: true,
        name: "priceMonthly",
        required: true,
        type: "text",
      },
      {
        admin: {
          description: {
            en: "Shown while the switch is on annual. Leave it empty and the monthly price is used on both sides of the switch.",
            es: "Se muestra cuando el conmutador está en anual. Déjalo vacío y se usará el precio mensual en ambos lados del conmutador.",
          },
          width: "50%",
        },
        label: { en: "Annual Price", es: "Precio anual" },
        localized: true,
        name: "priceAnnual",
        type: "text",
      },
    ],
  },
  // Appearance is switched off on purpose: the button's look follows Card Style, so a second
  // control would let an editor ask for a combination the design has no state for.
  link({
    appearances: false,
    required: false,
    overrides: {
      admin: {
        description: {
          en: "Where the button sends someone, and the words on it. Point it at the page where they sign up.",
          es: "A dónde lleva el botón y las palabras que muestra. Apúntalo a la página donde se registran.",
        },
      },
      label: { en: "Button", es: "Botón" },
    },
  }),
  {
    admin: {
      description: {
        en: "The small heading above the list of what the plan includes.",
        es: "El encabezado pequeño sobre la lista de lo que incluye el plan.",
      },
    },
    label: { en: "List Heading", es: "Encabezado de la lista" },
    localized: true,
    name: "featuresHeading",
    type: "text",
  },
  {
    admin: {
      description: {
        en: "One line for each thing the plan includes. Keep each to a short phrase so the cards stay close in height.",
        es: "Una línea por cada cosa que incluye el plan. Manténlas breves para que las tarjetas queden a alturas parecidas.",
      },
      initCollapsed: true,
    },
    fields: [
      {
        admin: {
          description: {
            en: "One thing the plan includes, written as a short phrase.",
            es: "Una cosa que incluye el plan, escrita como una frase breve.",
          },
        },
        label: { en: "Item", es: "Elemento" },
        localized: true,
        name: "label",
        required: true,
        type: "text",
      },
    ],
    labels: {
      plural: { en: "Included", es: "Incluye" },
      singular: { en: "Item", es: "Elemento" },
    },
    localized: true,
    minRows: 1,
    name: "features",
    type: "array",
  },
];

export const membershipTiersFields: Field[] = [
  {
    admin: {
      description: {
        en: "The small line above the headline, next to the star. Leave it empty and both the line and the star disappear.",
        es: "La línea pequeña sobre el titular, junto a la estrella. Déjala vacía y desaparecen la línea y la estrella.",
      },
    },
    defaultValue: createLocalizedDefault({
      en: "Membership",
      es: "Membresía",
    }),
    label: { en: "Eyebrow", es: "Antetítulo" },
    localized: true,
    name: "eyebrow",
    type: "text",
  },
  {
    admin: {
      description: {
        en: "The large headline across the top of the panel. A few words read best; anything longer runs to three lines on a phone.",
        es: "El titular grande en la parte superior del panel. Unas pocas palabras funcionan mejor; algo más largo ocupa tres líneas en el móvil.",
      },
    },
    defaultValue: createLocalizedDefault({
      en: "Go deeper, together",
      es: "Profundicemos, juntos",
    }),
    label: { en: "Heading", es: "Encabezado" },
    localized: true,
    name: "heading",
    required: true,
    type: "text",
  },
  {
    ...imageField("backgroundImage", { required: false, withAspectRatio: false }),
    admin: {
      description: {
        en: "The photograph behind the whole panel. A dark tint is laid over it so the white writing stays readable, so choose something calm rather than busy. Leave it empty to keep the meadow photograph.",
        es: "La fotografía detrás de todo el panel. Se le aplica un velo oscuro para que el texto blanco siga siendo legible, así que elige una imagen serena. Déjala vacía para conservar la fotografía del prado.",
      },
    },
    label: { en: "Background Image", es: "Imagen de fondo" },
  },
  {
    fields: [
      {
        admin: {
          description: {
            en: "Turn this off when every plan has one price. The switch disappears and only the monthly price is shown.",
            es: "Desactívalo cuando cada plan tenga un único precio. El conmutador desaparece y solo se muestra el precio mensual.",
          },
        },
        defaultValue: true,
        label: {
          en: "Show the monthly and annual switch",
          es: "Mostrar el conmutador mensual y anual",
        },
        name: "showBillingToggle",
        type: "checkbox",
      },
      {
        admin: {
          description: {
            en: "Which price someone sees before they touch the switch.",
            es: "Qué precio ve una persona antes de tocar el conmutador.",
          },
        },
        defaultValue: "monthly",
        label: { en: "Price shown first", es: "Precio que se muestra primero" },
        name: "defaultPeriod",
        options: [
          { label: { en: "Monthly", es: "Mensual" }, value: "monthly" },
          { label: { en: "Annually", es: "Anual" }, value: "annual" },
        ],
        type: "select",
      },
      {
        type: "row",
        fields: [
          {
            admin: {
              description: {
                en: "The word on the left half of the switch.",
                es: "La palabra en la mitad izquierda del conmutador.",
              },
              width: "50%",
            },
            defaultValue: createLocalizedDefault({ en: "Monthly", es: "Mensual" }),
            label: { en: "Monthly Button", es: "Botón mensual" },
            localized: true,
            name: "monthlyLabel",
            type: "text",
          },
          {
            admin: {
              description: {
                en: "The word on the right half of the switch.",
                es: "La palabra en la mitad derecha del conmutador.",
              },
              width: "50%",
            },
            defaultValue: createLocalizedDefault({ en: "Annually", es: "Anual" }),
            label: { en: "Annual Button", es: "Botón anual" },
            localized: true,
            name: "annualLabel",
            type: "text",
          },
        ],
      },
      {
        admin: {
          description: {
            en: "The small green tag on the annual half of the switch. Leave it empty to show no tag.",
            es: "La pequeña etiqueta verde en la mitad anual del conmutador. Déjala vacía para no mostrar ninguna.",
          },
        },
        defaultValue: createLocalizedDefault({ en: "Save 20%", es: "Ahorra 20%" }),
        label: { en: "Saving Tag", es: "Etiqueta de ahorro" },
        localized: true,
        name: "savingsBadge",
        type: "text",
      },
      {
        type: "row",
        fields: [
          {
            admin: {
              description: {
                en: "The small text printed after every monthly price, for example / month.",
                es: "El texto pequeño que se imprime tras cada precio mensual, por ejemplo / mes.",
              },
              width: "50%",
            },
            defaultValue: createLocalizedDefault({ en: "/ month", es: "/ mes" }),
            label: { en: "Monthly Price Suffix", es: "Sufijo del precio mensual" },
            localized: true,
            name: "monthlyPeriodSuffix",
            type: "text",
          },
          {
            admin: {
              description: {
                en: "The small text printed after every annual price. Say how the charge is taken, so nobody is surprised at checkout.",
                es: "El texto pequeño que se imprime tras cada precio anual. Indica cómo se cobra para que nadie se lleve una sorpresa al pagar.",
              },
              width: "50%",
            },
            defaultValue: createLocalizedDefault({
              en: "/ month, billed annually",
              es: "/ mes, facturado anualmente",
            }),
            label: { en: "Annual Price Suffix", es: "Sufijo del precio anual" },
            localized: true,
            name: "annualPeriodSuffix",
            type: "text",
          },
        ],
      },
    ],
    admin: {
      description: {
        en: "The monthly and annual switch shown above the plans below, and the words printed on it.",
        es: "El conmutador mensual y anual que se muestra encima de los planes de abajo, y las palabras impresas en él.",
      },
    },
    label: { en: "Billing Options", es: "Opciones de facturación" },
    name: "billing",
    type: "group",
  },
  {
    admin: {
      description: {
        en: "Each plan becomes one card. Three fit across the row.",
        es: "Cada plan se convierte en una tarjeta. Tres caben en la fila.",
      },
      initCollapsed: true,
    },
    defaultValue: tierDefaults,
    fields: tierRowFields,
    labels: {
      plural: { en: "Plans", es: "Planes" },
      singular: { en: "Plan", es: "Plan" },
    },
    localized: true,
    maxRows: 3,
    minRows: 1,
    name: "tiers",
    required: true,
    type: "array",
  },
];
