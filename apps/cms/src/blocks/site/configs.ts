import type { Block, Condition, Field, TextFieldSingleValidation } from "payload";

import { bodyRichText, headingRichText } from "@/lib/fields/site/richText";
import { siteButton } from "@/lib/fields/site/siteLink";

import {
  backgroundField,
  imageField,
  rowTitle,
  sectionEyebrow,
  sectionHeading,
  siteBlock,
} from "./shared";

const sectionText = (description = "The text under the heading.") =>
  bodyRichText({ description, label: "Text", name: "text" });

const anchorPattern = /^[a-z][a-z0-9-]*$/u;

const validateAnchor: TextFieldSingleValidation = (value) =>
  !value || anchorPattern.test(value)
    ? true
    : "Use lowercase letters, digits and hyphens, starting with a letter, for example as-seen-in.";

const sectionAnchor: Field = {
  admin: {
    description: {
      en: "The section's name in links that jump to it, for example as-seen-in. Some names carry their own style on the site. Empty leaves it out.",
      es: "El nombre de la sección en los enlaces que saltan a ella, por ejemplo as-seen-in. Algunos nombres tienen su propio estilo en el sitio. Vacío lo omite.",
    },
  },
  label: { en: "Anchor", es: "Ancla" },
  name: "anchor",
  type: "text",
  validate: validateAnchor,
};

const withIconListImage: Condition = (_data, siblingData) =>
  (siblingData as { layout?: string })?.layout === "image";

export const HeroVideoBlock: Block = siteBlock({
  fields: [
    headingRichText({
      description: "The page's main heading. Set words in italics to give them the accent style.",
      label: "Heading",
      name: "heading",
      required: true,
    }),
    sectionText("The paragraph under the heading."),
    siteButton(),
    {
      admin: {
        description:
          "The phone number under the button, for example 888-555-0100. Empty hides the line.",
      },
      label: "Phone",
      name: "phone",
      type: "text",
    },
    {
      admin: {
        description: "The words before the phone number, for example Or Call:.",
      },
      label: "Phone line text",
      name: "phoneLabel",
      type: "text",
    },
    {
      admin: {
        description:
          "The full URL of the looping video beside the heading (an .mp4 file). After the migration this becomes a video stored in the CMS.",
      },
      label: "Video URL",
      name: "videoUrl",
      type: "text",
    },
    imageField(
      "poster",
      "Video still",
      "Shown while the video loads, and instead of it when no video is set."
    ),
  ],
  interfaceName: "HeroVideoBlock",
  label: "Hero with video",
  slug: "heroVideo",
});

export const LogoStripBlock: Block = siteBlock({
  fields: [
    sectionEyebrow,
    {
      admin: { ...rowTitle("image.filename", "Logo"), description: "The logos, left to right." },
      fields: [imageField("image", "Logo", "A logo on a transparent or white background.", true)],
      label: "Logos",
      labels: { plural: "Logos", singular: "Logo" },
      name: "logos",
      type: "array",
    },
    backgroundField(),
    {
      admin: {
        description: {
          en: "How the logos sit on small screens. Rotate shows one logo at a time on phones; Wrap puts them in rows of three on phones and centred rows on small tablets; Wrap on tablets keeps the rotation on phones and centres the rows on small tablets.",
          es: "Cómo se colocan los logotipos en pantallas pequeñas. Rotar muestra un logotipo a la vez en móviles; Filas los coloca en filas de tres en móviles y en filas centradas en tabletas pequeñas; Filas en tabletas mantiene la rotación en móviles y centra las filas en tabletas pequeñas.",
        },
      },
      defaultValue: "rotate",
      label: { en: "On small screens", es: "En pantallas pequeñas" },
      name: "arrangement",
      options: [
        { label: { en: "Rotate", es: "Rotar" }, value: "rotate" },
        { label: { en: "Wrap", es: "Filas" }, value: "wrap" },
        { label: { en: "Wrap on tablets", es: "Filas en tabletas" }, value: "wrapTablet" },
      ],
      type: "select",
    },
    sectionAnchor,
  ],
  interfaceName: "LogoStripBlock",
  label: "Logo strip",
  slug: "logoStrip",
});

export const IconListBlock: Block = siteBlock({
  fields: [
    {
      admin: {
        description: {
          en: "What sits beside the points: the heading and button, or a large picture with the heading above the points.",
          es: "Qué va junto a los puntos: el encabezado y el botón, o una imagen grande con el encabezado sobre los puntos.",
        },
      },
      defaultValue: "list",
      label: { en: "Layout", es: "Diseño" },
      name: "layout",
      options: [
        {
          label: { en: "Heading beside the points", es: "Encabezado junto a los puntos" },
          value: "list",
        },
        {
          label: { en: "Picture beside the points", es: "Imagen junto a los puntos" },
          value: "image",
        },
      ],
      type: "select",
    },
    sectionEyebrow,
    sectionHeading("The section's heading. Underline a word to give it the accent style."),
    {
      ...bodyRichText({
        description: "The line under the heading.",
        label: "Introduction",
        name: "intro",
      }),
      admin: {
        condition: withIconListImage,
        description: {
          en: "The line under the heading, for example We treat people, not symptoms. Empty hides it.",
          es: "La línea bajo el encabezado, por ejemplo Tratamos personas, no síntomas. Vacío la oculta.",
        },
      },
      label: { en: "Introduction", es: "Introducción" },
    },
    {
      admin: {
        condition: withIconListImage,
        description: {
          en: "The large picture beside the points. Phones show it under the introduction.",
          es: "La imagen grande junto a los puntos. Los móviles la muestran bajo la introducción.",
        },
      },
      label: { en: "Picture", es: "Imagen" },
      name: "image",
      relationTo: "media",
      type: "upload",
    },
    siteButton({
      description:
        "Empty text hides the button. With the picture layout it sits under the last point.",
    }),
    {
      admin: {
        ...rowTitle("title", "Point"),
        description: "The points listed beside the heading.",
      },
      fields: [
        imageField("icon", "Icon", "The round drawing beside the point."),
        {
          admin: { description: "The point's name, for example Patient-Centered Care." },
          label: "Title",
          name: "title",
          required: true,
          type: "text",
        },
        {
          ...headingRichText({
            description: "The title with accent words.",
            label: "Title with accent",
            name: "accentTitle",
          }),
          admin: {
            description: {
              en: "Optional: the title again with some words in italics, which the site shows in the accent style, for example State-of-the-Art, Non-Invasive Technology. Shown instead of Title.",
              es: "Opcional: el título otra vez con algunas palabras en cursiva, que el sitio muestra con el estilo de acento. Se muestra en lugar del Título.",
            },
          },
          label: { en: "Title with accent", es: "Título con acento" },
        },
        {
          admin: { description: "One or two sentences under the title." },
          label: "Text",
          name: "text",
          type: "textarea",
        },
      ],
      label: "Points",
      labels: { plural: "Points", singular: "Point" },
      name: "items",
      type: "array",
    },
  ],
  interfaceName: "IconListBlock",
  label: "Icon list",
  slug: "iconList",
});

export const MediaTextBlock: Block = siteBlock({
  fields: [
    {
      admin: {
        description: {
          en: "The small capitals line above the heading, for example Highest Industry Recognition. Empty hides it.",
          es: "La línea pequeña en mayúsculas sobre el encabezado. Vacío la oculta.",
        },
      },
      label: { en: "Eyebrow", es: "Antetítulo" },
      name: "eyebrow",
      type: "text",
    },
    sectionHeading(),
    sectionText(),
    siteButton(),
    {
      fields: [
        {
          admin: { description: "Which side the picture or video sits on.", width: "50%" },
          defaultValue: "left",
          label: "Text side",
          name: "side",
          options: [
            { label: "Text on the left", value: "left" },
            { label: "Text on the right", value: "right" },
          ],
          type: "select",
        },
        {
          admin: { description: "How much room the section takes.", width: "50%" },
          defaultValue: "regular",
          label: "Size",
          name: "size",
          options: [
            { label: "Regular", value: "regular" },
            { label: "Full width", value: "full" },
            { label: "Small", value: "small" },
          ],
          type: "select",
        },
      ],
      type: "row",
    },
    backgroundField(),
    imageField(
      "image",
      "Picture",
      "The picture beside the text. With a video set, it is the still shown before play."
    ),
    {
      admin: {
        description: {
          en: "Framed fills a rounded frame and crops the picture. Whole picture shows all of it at its own shape, for logos and badges, and shows the button once, under the text.",
          es: "Enmarcada llena un marco redondeado y recorta la imagen. Imagen completa la muestra entera con su forma, para logotipos e insignias, y muestra el botón una vez, bajo el texto.",
        },
      },
      defaultValue: "framed",
      label: { en: "Picture style", es: "Estilo de imagen" },
      name: "imageStyle",
      options: [
        { label: { en: "Framed", es: "Enmarcada" }, value: "framed" },
        { label: { en: "Whole picture", es: "Imagen completa" }, value: "plain" },
      ],
      type: "select",
    },
    {
      admin: {
        description:
          "The full URL of a video (an .mp4 file) played when the picture is clicked. Empty shows the picture only. After the migration this becomes a video stored in the CMS.",
      },
      label: "Video URL",
      name: "videoUrl",
      type: "text",
    },
    sectionAnchor,
  ],
  interfaceName: "MediaTextBlock",
  label: "Media and text",
  slug: "mediaText",
});

export const InsuranceBlock: Block = siteBlock({
  fields: [
    sectionHeading(),
    sectionText(),
    siteButton(),
    {
      admin: {
        ...rowTitle("image.filename", "Logo"),
        description: "The insurance plan logos shown beside the text.",
      },
      fields: [imageField("image", "Logo", "The plan's logo.", true)],
      label: "Plan logos",
      labels: { plural: "Logos", singular: "Logo" },
      name: "logos",
      type: "array",
    },
  ],
  interfaceName: "InsuranceBlock",
  label: "Insurance plans",
  slug: "insurance",
});

export const DoctorSliderBlock: Block = siteBlock({
  fields: [
    sectionHeading(),
    sectionText(),
    siteButton(),
    {
      admin: {
        description:
          "The words on the last slide, which links where the button does, for example See All Reviews. Empty leaves that slide out.",
      },
      label: "Last slide text",
      name: "seeAllText",
      type: "text",
    },
    siteButton({
      description: "The button under the slider. Empty text hides it.",
      label: "Button under the slider",
      name: "bottomButton",
    }),
    imageField("image", "Background picture", "The wide picture behind the section."),
    {
      admin: {
        description:
          "The doctors in the slider, in this order. Empty shows the doctors of the page's own clinic or state, or every doctor on other pages.",
      },
      hasMany: true,
      label: "Doctors",
      name: "doctors",
      relationTo: "doctors",
      type: "relationship",
    },
  ],
  interfaceName: "DoctorSliderBlock",
  label: "Doctors slider",
  slug: "docSlider",
});

export const ReviewSliderBlock: Block = siteBlock({
  fields: [
    sectionEyebrow,
    sectionHeading(),
    siteButton(),
    {
      admin: {
        description:
          "The words on the last slide, which links where the button does, for example See All Reviews. Empty leaves that slide out.",
      },
      label: "Last slide text",
      name: "seeAllText",
      type: "text",
    },
    {
      admin: {
        description:
          "The reviews in the slider, in this order. Empty shows the reviews of the page's own clinic or doctor, or the newest reviews on other pages.",
      },
      hasMany: true,
      label: "Reviews",
      name: "reviews",
      relationTo: "testimonials",
      type: "relationship",
    },
    {
      admin: {
        description:
          "A small italic line under the heading, for example Individual results may vary. Empty hides it.",
      },
      label: "Small print",
      name: "note",
      type: "text",
    },
    {
      admin: {
        description:
          "How many reviews show when none are picked. Empty shows 12 on a clinic or doctor page and 8 elsewhere.",
      },
      label: "Number of reviews",
      min: 1,
      name: "limit",
      type: "number",
    },
    {
      admin: {
        description:
          "The heading's level: large on a clinic or doctor page, smaller on the homepage.",
      },
      defaultValue: "h3",
      label: "Heading size",
      name: "headingLevel",
      options: [
        { label: "Large (h2)", value: "h2" },
        { label: "Smaller (h3)", value: "h3" },
      ],
      type: "select",
    },
  ],
  interfaceName: "ReviewSliderBlock",
  label: "Reviews slider",
  slug: "revSlider",
});

export const ConditionGridBlock: Block = siteBlock({
  fields: [
    sectionHeading(),
    sectionText(),
    {
      admin: {
        description: "The small heading above the conditions, for example Symptoms We Treat.",
      },
      label: "List heading",
      name: "listHeading",
      type: "text",
    },
    {
      admin: {
        description: {
          en: "The size of the list heading. Small (H3) on the homepage, the H2 style on treatment pages.",
          es: "El tamaño del título de la lista. Pequeño (H3) en la página de inicio, el estilo H2 en las páginas de tratamientos.",
        },
      },
      defaultValue: "h3",
      label: { en: "List heading size", es: "Tamaño del título de la lista" },
      name: "listHeadingLevel",
      options: [
        { label: { en: "Small (H3)", es: "Pequeño (H3)" }, value: "h3" },
        { label: { en: "Section heading (H2)", es: "Título de sección (H2)" }, value: "h2" },
      ],
      type: "select",
    },
    {
      admin: {
        description: {
          en: "The conditions shown, in this order. Empty shows the conditions of the treatment whose page this is, or every condition on other pages.",
          es: "Las condiciones mostradas, en este orden. Vacío muestra las condiciones del tratamiento de esta página, o todas las condiciones en otras páginas.",
        },
      },
      hasMany: true,
      label: "Conditions",
      name: "conditions",
      relationTo: "conditions",
      type: "relationship",
    },
    {
      admin: {
        description:
          "The words shown when a visitor points at a condition, for example Learn More.",
      },
      label: "Link text",
      name: "linkText",
      type: "text",
    },
    {
      admin: {
        description: {
          en: "The size of each condition's name. Small suits the homepage, large the vein disease guide.",
          es: "El tamaño del nombre de cada condición. Pequeño conviene a la página de inicio, grande a la guía de enfermedades venosas.",
        },
      },
      defaultValue: "h5",
      label: { en: "Name size", es: "Tamaño del nombre" },
      name: "titleLevel",
      options: [
        { label: { en: "Small (H5)", es: "Pequeño (H5)" }, value: "h5" },
        { label: { en: "Large (H3)", es: "Grande (H3)" }, value: "h3" },
      ],
      type: "select",
    },
    {
      fields: [
        {
          admin: {
            description: {
              en: "The words on the button that shows the rest of the list on phones, for example Show More. Empty shows the whole list.",
              es: "Las palabras del botón que muestra el resto de la lista en teléfonos, por ejemplo Ver más. Vacío muestra la lista completa.",
            },
            width: "50%",
          },
          label: { en: "Show more text", es: "Texto de ver más" },
          name: "showMoreText",
          type: "text",
        },
        {
          admin: {
            description: {
              en: "The words on the same button once the list is open, for example Show Less.",
              es: "Las palabras del mismo botón con la lista abierta, por ejemplo Ver menos.",
            },
            width: "50%",
          },
          label: { en: "Show less text", es: "Texto de ver menos" },
          name: "showLessText",
          type: "text",
        },
      ],
      type: "row",
    },
    siteButton({
      description: "The button under the list. It shows only when it has both text and a link.",
    }),
    {
      admin: {
        description: {
          en: "A YouTube video in the section. Empty shows no video.",
          es: "Un video de YouTube en la sección. Vacío no muestra video.",
        },
        initCollapsed: true,
      },
      fields: [
        {
          admin: {
            description: {
              en: "The video's YouTube address, for example https://www.youtube.com/watch?v=abc123.",
              es: "La dirección del video en YouTube, por ejemplo https://www.youtube.com/watch?v=abc123.",
            },
          },
          label: { en: "YouTube URL", es: "URL de YouTube" },
          name: "videoUrl",
          type: "text",
        },
        {
          admin: {
            description: {
              en: "Under the text, the video sits behind a still with a play button and its own small heading. Under the list, it plays in place without a still.",
              es: "Bajo el texto, el video está detrás de una imagen con botón de reproducir y su propio título pequeño. Bajo la lista, se reproduce en su sitio sin imagen.",
            },
          },
          defaultValue: "afterText",
          label: { en: "Video position", es: "Posición del video" },
          name: "videoPosition",
          options: [
            { label: { en: "Under the text", es: "Bajo el texto" }, value: "afterText" },
            { label: { en: "Under the list", es: "Bajo la lista" }, value: "afterList" },
          ],
          type: "select",
        },
        {
          admin: {
            condition: (_data, siblingData) =>
              (siblingData as { videoPosition?: string })?.videoPosition !== "afterList",
            description: {
              en: "The small heading above the video, for example See It in Action. Empty hides it.",
              es: "El título pequeño sobre el video, por ejemplo Véalo en acción. Vacío no se muestra.",
            },
          },
          label: { en: "Video heading", es: "Título del video" },
          name: "videoHeading",
          type: "text",
        },
        {
          admin: {
            condition: (_data, siblingData) =>
              (siblingData as { videoPosition?: string })?.videoPosition !== "afterList",
            description: {
              en: "The still shown over the video until the visitor presses play.",
              es: "La imagen que se muestra sobre el video hasta que el visitante pulsa reproducir.",
            },
          },
          label: { en: "Video still", es: "Imagen del video" },
          name: "videoCover",
          relationTo: "media",
          type: "upload",
        },
      ],
      label: { en: "Video", es: "Video" },
      type: "collapsible",
    },
    backgroundField("white"),
  ],
  interfaceName: "ConditionGridBlock",
  label: "Conditions grid",
  slug: "condGrid",
});

export const BeforeAfterBlock: Block = siteBlock({
  fields: [
    sectionHeading(),
    sectionText(),
    siteButton(),
    {
      admin: {
        description:
          "The words on the last slide, which links where the button does, for example See All Reviews. Empty leaves that slide out.",
      },
      label: "Last slide text",
      name: "seeAllText",
      type: "text",
    },
    {
      fields: [
        {
          admin: {
            description: "The label on the first picture, for example Before.",
            width: "50%",
          },
          label: "Before label",
          name: "beforeLabel",
          type: "text",
        },
        {
          admin: {
            description: "The label on the second picture, for example After.",
            width: "50%",
          },
          label: "After label",
          name: "afterLabel",
          type: "text",
        },
      ],
      type: "row",
    },
    {
      admin: {
        ...rowTitle("before.filename", "Result"),
        description: "One row per patient result.",
      },
      fields: [
        imageField("before", "Before picture", "The picture taken before treatment.", true),
        imageField("after", "After picture", "The picture taken after treatment.", true),
      ],
      label: "Results",
      labels: { plural: "Results", singular: "Result" },
      name: "pairs",
      type: "array",
    },
  ],
  interfaceName: "BeforeAfterBlock",
  label: "Before and after slider",
  slug: "beforeAfter",
});

export const TreatmentCardsBlock: Block = siteBlock({
  fields: [
    sectionHeading(),
    {
      admin: {
        description: {
          en: "Where the heading sits above the cards.",
          es: "Dónde se coloca el encabezado sobre las tarjetas.",
        },
      },
      defaultValue: "left",
      label: { en: "Heading position", es: "Posición del encabezado" },
      name: "headingAlign",
      options: [
        { label: { en: "Left", es: "Izquierda" }, value: "left" },
        { label: { en: "Centred", es: "Centrado" }, value: "center" },
      ],
      type: "select",
    },
    {
      ...sectionText(),
      admin: {
        description: {
          en: "The paragraph under the heading. Empty hides it.",
          es: "El párrafo bajo el encabezado. Vacío lo oculta.",
        },
      },
      label: { en: "Text", es: "Texto" },
    },
    {
      admin: {
        description:
          "Short selling points shown with a tick, one per entry, for example FDA-Approved.",
      },
      hasMany: true,
      label: "Checklist",
      name: "checklist",
      type: "text",
    },
    {
      admin: {
        description: "The treatments shown, in this order. Empty shows every treatment.",
      },
      hasMany: true,
      label: "Treatments",
      name: "treatments",
      relationTo: "treatments",
      type: "relationship",
    },
    {
      admin: { description: "The words on each card's button, for example Learn More." },
      label: "Card button text",
      name: "linkText",
      type: "text",
    },
    siteButton({ description: "The button under the cards. Empty text hides it." }),
  ],
  interfaceName: "TreatmentCardsBlock",
  label: "Treatment cards",
  slug: "treatCards",
});

export const PostSliderBlock: Block = siteBlock({
  fields: [
    imageField("logo", "Blog logo", "The small logo above the heading. Empty hides it."),
    sectionHeading(),
    siteButton(),
    {
      admin: {
        description: "The articles shown, in this order. Empty shows the newest articles.",
      },
      hasMany: true,
      label: "Articles",
      name: "posts",
      relationTo: "posts",
      type: "relationship",
    },
    {
      admin: { description: "How many of the newest articles to show when none are picked." },
      defaultValue: 6,
      label: "Number of articles",
      max: 12,
      min: 1,
      name: "limit",
      type: "number",
    },
  ],
  interfaceName: "PostSliderBlock",
  label: "Articles slider",
  slug: "postSlider",
});

export const SiteCtaBlock: Block = siteBlock({
  fields: [
    {
      admin: { description: "The large line, for example Take the Vein Health Quiz." },
      label: "Title",
      name: "title",
      required: true,
      type: "text",
    },
    {
      admin: { description: "One sentence under the title." },
      label: "Text",
      name: "text",
      type: "text",
    },
    siteButton(),
  ],
  interfaceName: "SiteCtaBlock",
  label: "Call to action band",
  slug: "siteCta",
});

export const HeroBannerBlock: Block = siteBlock({
  fields: [
    headingRichText({
      description: "The page's main heading.",
      label: "Heading",
      name: "heading",
      required: true,
    }),
    {
      admin: { description: "The smaller line under the heading. Empty hides it." },
      label: "Subheading",
      name: "subheading",
      type: "text",
    },
    sectionText("The paragraph under the heading."),
    siteButton(),
    imageField(
      "image",
      "Picture",
      "The picture beside the heading. Empty shows the heading on a plain band."
    ),
  ],
  interfaceName: "HeroBannerBlock",
  label: "Hero with picture",
  slug: "heroBanner",
});

/** The top sections a page can open with, in the site's own design. */
export const siteHeroBlocks: Block[] = [HeroVideoBlock, HeroBannerBlock];
