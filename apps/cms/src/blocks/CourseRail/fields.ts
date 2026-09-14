import type { Field } from "payload";

import { imageField } from "@/lib/fields/imageField";
import { link } from "@/lib/fields/link";
import { createLocalizedDefault } from "@/lib/utils/createLocalizedDefault";

/**
 * The picture on a course card needs its own guidance, and `imageField` takes no description
 * argument - so the group it returns is re-wrapped with one here rather than forked.
 */
const courseImageField: Field = {
  ...imageField("image", { required: false, withAspectRatio: false }),
  admin: {
    description: {
      en: "The picture on the card. It is cropped to a wide rectangle, so keep the subject near the middle. Left empty, one of the standing pictures is shown instead.",
      es: "La imagen de la tarjeta. Se recorta a un rectángulo ancho, así que deja el motivo cerca del centro. Si la dejas vacía, se muestra una de las imágenes de reserva.",
    },
  },
};

export const courseRailFields: Field[] = [
  {
    admin: {
      description: {
        en: "The short line above the headline, beside the green star. Leave it empty and that line is not shown.",
        es: "La línea corta encima del titular, junto a la estrella verde. Déjala vacía y esa línea no se muestra.",
      },
    },
    defaultValue: createLocalizedDefault({
      en: "7,000+ unique seminars over 30 years",
      es: "Más de 7.000 seminarios únicos en 30 años",
    }),
    label: { en: "Intro line", es: "Línea de introducción" },
    localized: true,
    name: "eyebrow",
    type: "text",
  },
  {
    admin: {
      description: {
        en: "The large headline that opens this row of courses. It wraps onto two or three lines on its own, so write it as one thought.",
        es: "El titular grande que abre esta fila de cursos. Se reparte solo en dos o tres líneas, así que escríbelo como una sola idea.",
      },
    },
    defaultValue: createLocalizedDefault({
      en: "Guidance for what you’re going through",
      es: "Orientación para lo que estás viviendo",
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
        en: "The small capitalised buttons above the courses. When more are added than fit on one line, the row slides sideways.",
        es: "Los botones pequeños en mayúsculas encima de los cursos. Si añades más de los que caben en una línea, la fila se desplaza de lado.",
      },
      initCollapsed: true,
    },
    defaultValue: createLocalizedDefault({
      en: [
        { isSelected: true, label: "Letting Go" },
        { isSelected: false, label: "Fear and Anxiety" },
        { isSelected: false, label: "Relationships" },
        { isSelected: false, label: "Self-Knowledge" },
        { isSelected: false, label: "Inner Peace" },
        { isSelected: false, label: "Starting Over" },
      ],
      es: [
        { isSelected: true, label: "Soltar" },
        { isSelected: false, label: "Miedo y ansiedad" },
        { isSelected: false, label: "Relaciones" },
        { isSelected: false, label: "Autoconocimiento" },
        { isSelected: false, label: "Paz interior" },
        { isSelected: false, label: "Empezar de nuevo" },
      ],
    }),
    fields: [
      {
        admin: {
          description: {
            en: "What this button says. Two or three words read best, because the text is set in capitals.",
            es: "Lo que dice este botón. Dos o tres palabras se leen mejor, porque el texto va en mayúsculas.",
          },
        },
        label: { en: "Button text", es: "Texto del botón" },
        localized: true,
        name: "label",
        required: true,
        type: "text",
      },
      link({
        appearances: false,
        disableLabel: true,
        overrides: {
          admin: {
            description: {
              en: "The page someone lands on after choosing this topic. Leave it unset and the button is still shown, but it cannot be clicked.",
              es: "La página a la que llega alguien tras elegir este tema. Si no eliges ninguna, el botón se sigue mostrando, pero no se puede pulsar.",
            },
          },
          label: { en: "Where it goes", es: "A dónde lleva" },
        },
        required: false,
      }),
      {
        admin: {
          description: {
            en: "Fills this button green so a visitor can see which topic the courses below belong to. Tick it on one button at most.",
            es: "Rellena este botón de verde para que se vea a qué tema pertenecen los cursos de abajo. Márcalo en un botón como máximo.",
          },
        },
        label: { en: "Show as the chosen topic", es: "Mostrar como el tema elegido" },
        name: "isSelected",
        type: "checkbox",
      },
    ],
    label: { en: "Topic buttons", es: "Botones de tema" },
    localized: true,
    maxRows: 8,
    name: "topics",
    type: "array",
  },
  {
    admin: {
      description: {
        en: "The last button in the topic row, the one with the small arrow.",
        es: "El último botón de la fila de temas, el que lleva la flecha pequeña.",
      },
    },
    defaultValue: createLocalizedDefault({ en: "All topics", es: "Todos los temas" }),
    label: { en: "All-topics button text", es: "Texto del botón de todos los temas" },
    localized: true,
    name: "allTopicsLabel",
    type: "text",
  },
  link({
    appearances: false,
    disableLabel: true,
    overrides: {
      admin: {
        description: {
          en: "Where that last button sends people, normally the page listing every topic. With nothing chosen the button is not shown.",
          es: "A dónde envía ese último botón, normalmente la página que lista todos los temas. Si no eliges nada, el botón no se muestra.",
        },
      },
      defaultValue: { newTab: false, type: "custom", url: "/browse-topics" },
      label: { en: "All-topics button link", es: "Enlace del botón de todos los temas" },
      name: "allTopicsLink",
    },
    required: false,
  }),
  {
    admin: {
      description: {
        en: "The green button to the right, above the courses.",
        es: "El botón verde de la derecha, encima de los cursos.",
      },
    },
    defaultValue: createLocalizedDefault({
      en: "View all courses",
      es: "Ver todos los cursos",
    }),
    label: { en: "Green button text", es: "Texto del botón verde" },
    localized: true,
    name: "viewAllLabel",
    type: "text",
  },
  link({
    appearances: false,
    disableLabel: true,
    overrides: {
      admin: {
        description: {
          en: "Where the green button sends people. With nothing chosen the button is not shown.",
          es: "A dónde envía el botón verde. Si no eliges nada, el botón no se muestra.",
        },
      },
      defaultValue: { newTab: false, type: "custom", url: "/talks" },
      label: { en: "Green button link", es: "Enlace del botón verde" },
      name: "viewAllLink",
    },
    required: false,
  }),
  {
    admin: {
      description: {
        en: "The cards in the sideways-scrolling row. About three show at a time on a wide screen and the rest are one swipe or one arrow click away, so more than three is fine.",
        es: "Las tarjetas de la fila que se desplaza de lado. En una pantalla ancha se ven unas tres a la vez y el resto quedan a un deslizamiento o a un clic de flecha, así que más de tres está bien.",
      },
      initCollapsed: true,
    },
    defaultValue: createLocalizedDefault({
      en: [
        {
          dateLabel: "MAR 2026",
          description:
            "Why the mind clings to what hurts it, and the quiet moment where that grip lets go.",
          price: "$49",
          priceBefore: "$79",
          rating: 4.9,
          title: "Letting Go of the Fear of Change",
        },
        {
          dateLabel: "APR 2026",
          description:
            "A practical look at the noise we mistake for thinking, and what is left once it settles.",
          price: "$49",
          rating: 4.8,
          title: "Finding Stillness in a Restless Mind",
        },
        {
          dateLabel: "MAY 2026",
          description:
            "Seeing yourself clearly costs nothing and changes everything about how you meet a hard day.",
          price: "$59",
          priceBefore: "$89",
          rating: 4.9,
          title: "The Quiet Strength of Self-Knowledge",
        },
        {
          dateLabel: "JUN 2026",
          description:
            "What we are really asking of the people closest to us, and why the asking never works.",
          price: "$49",
          rating: 4.7,
          title: "Relationships Without Resentment",
        },
        {
          dateLabel: "JUL 2026",
          description:
            "Beginning again is not lost time. It is the only way anyone has ever arrived anywhere.",
          price: "$39",
          priceBefore: "$69",
          rating: 4.8,
          title: "Starting Over, at Any Age",
        },
        {
          dateLabel: "AUG 2026",
          description:
            "The struggle is what keeps the feeling alive. Here is the alternative, step by step.",
          price: "$59",
          rating: 4.9,
          title: "Meeting Anxiety Without Fighting It",
        },
      ],
      es: [
        {
          dateLabel: "MAR 2026",
          description:
            "Por qué la mente se aferra a lo que le duele, y el momento tranquilo en que ese agarre cede.",
          price: "$49",
          priceBefore: "$79",
          rating: 4.9,
          title: "Soltar el miedo al cambio",
        },
        {
          dateLabel: "ABR 2026",
          description:
            "Una mirada práctica al ruido que confundimos con pensar, y lo que queda cuando se asienta.",
          price: "$49",
          rating: 4.8,
          title: "Encontrar calma en una mente inquieta",
        },
        {
          dateLabel: "MAY 2026",
          description:
            "Verte con claridad no cuesta nada y cambia todo en la forma de afrontar un día difícil.",
          price: "$59",
          priceBefore: "$89",
          rating: 4.9,
          title: "La fuerza serena del autoconocimiento",
        },
        {
          dateLabel: "JUN 2026",
          description:
            "Lo que de verdad pedimos a quienes tenemos más cerca, y por qué pedirlo nunca funciona.",
          price: "$49",
          rating: 4.7,
          title: "Relaciones sin resentimiento",
        },
        {
          dateLabel: "JUL 2026",
          description:
            "Empezar de nuevo no es tiempo perdido. Es la única forma en que alguien ha llegado a algún sitio.",
          price: "$39",
          priceBefore: "$69",
          rating: 4.8,
          title: "Empezar de nuevo, a cualquier edad",
        },
        {
          dateLabel: "AGO 2026",
          description:
            "La lucha es lo que mantiene viva la sensación. Aquí está la alternativa, paso a paso.",
          price: "$59",
          rating: 4.9,
          title: "Recibir la ansiedad sin pelear con ella",
        },
      ],
    }),
    fields: [
      courseImageField,
      {
        admin: {
          description: {
            en: "The name on the card. Two lines fit comfortably; a longer title pushes the price down.",
            es: "El nombre en la tarjeta. Dos líneas caben bien; un título más largo empuja el precio hacia abajo.",
          },
        },
        label: { en: "Course title", es: "Título del curso" },
        localized: true,
        name: "title",
        required: true,
        type: "text",
      },
      {
        admin: {
          description: {
            en: "One or two sentences under the title. Keeping them a similar length across the cards keeps the row even.",
            es: "Una o dos frases debajo del título. Si tienen una longitud parecida en todas las tarjetas, la fila queda pareja.",
          },
        },
        label: { en: "Short description", es: "Descripción breve" },
        localized: true,
        name: "description",
        type: "textarea",
      },
      {
        type: "row",
        fields: [
          {
            admin: {
              description: {
                en: "How many of the five stars are filled, and the figure printed beside them. One decimal reads best, such as 4.8.",
                es: "Cuántas de las cinco estrellas se rellenan, y la cifra que se imprime al lado. Un decimal se lee mejor, por ejemplo 4,8.",
              },
              width: "50%",
            },
            label: { en: "Star rating", es: "Valoración" },
            max: 5,
            min: 0,
            name: "rating",
            type: "number",
          },
          {
            admin: {
              description: {
                en: "The small note at the top right of the card, such as the month the course runs. Leave it empty to show nothing there.",
                es: "La nota pequeña arriba a la derecha de la tarjeta, por ejemplo el mes en que se imparte el curso. Déjala vacía para no mostrar nada ahí.",
              },
              width: "50%",
            },
            label: { en: "Date note", es: "Nota de fecha" },
            localized: true,
            name: "dateLabel",
            type: "text",
          },
        ],
      },
      {
        type: "row",
        fields: [
          {
            admin: {
              description: {
                en: "Shown in green. Write it exactly as it should read, currency sign included.",
                es: "Se muestra en verde. Escríbelo exactamente como debe leerse, con el símbolo de moneda incluido.",
              },
              width: "50%",
            },
            label: { en: "Price", es: "Precio" },
            localized: true,
            name: "price",
            type: "text",
          },
          {
            admin: {
              description: {
                en: "Shown crossed out beside the price. Leave it empty when nothing is discounted.",
                es: "Se muestra tachado junto al precio. Déjalo vacío cuando no haya descuento.",
              },
              width: "50%",
            },
            label: { en: "Price before discount", es: "Precio antes del descuento" },
            localized: true,
            name: "priceBefore",
            type: "text",
          },
        ],
      },
      link({
        appearances: false,
        disableLabel: true,
        overrides: {
          admin: {
            description: {
              en: "Clicking anywhere on the card opens this page. With nothing chosen the card is still shown, but it cannot be clicked.",
              es: "Al hacer clic en cualquier parte de la tarjeta se abre esta página. Si no eliges nada, la tarjeta se sigue mostrando, pero no se puede pulsar.",
            },
          },
          label: { en: "Where the card goes", es: "A dónde lleva la tarjeta" },
        },
        required: false,
      }),
    ],
    label: { en: "Courses", es: "Cursos" },
    localized: true,
    minRows: 1,
    name: "courses",
    type: "array",
  },
];
