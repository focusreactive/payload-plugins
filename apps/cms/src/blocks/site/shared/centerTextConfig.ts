import type { Block, Condition, TextFieldSingleValidation } from "payload";

import { bodyRichText, headingRichText } from "@/lib/fields/site/richText";
import { siteButton } from "@/lib/fields/site/siteLink";

import { rowTitle, sectionEyebrow, siteBlock } from "../shared";
import { bilingual, bilingualBlock } from "./fieldText";

export const CENTER_TEXT_KINDS = ["text", "faq", "quote", "doctors"] as const;

export type CenterTextKind = (typeof CENTER_TEXT_KINDS)[number];

const anchorPattern = /^[a-z][a-z0-9-]*$/u;

const validateAnchor: TextFieldSingleValidation = (value) =>
  !value || anchorPattern.test(value)
    ? true
    : "Use lowercase letters, digits and hyphens, starting with a letter, for example faqs.";

const showFor =
  (kind: CenterTextKind): Condition =>
  (_data, siblingData) =>
    (siblingData as { kind?: CenterTextKind })?.kind === kind;

export const CenterTextBlock: Block = bilingualBlock(
  siteBlock({
    fields: [
      bilingual(
        sectionEyebrow,
        { en: "Eyebrow", es: "Antetítulo" },
        {
          en: "The small capitals line above the heading. Empty hides it.",
          es: "La línea pequeña en mayúsculas sobre el encabezado. Vacío la oculta.",
        }
      ),
      bilingual(
        headingRichText({
          description: "The section's heading.",
          label: "Heading",
          name: "heading",
        }),
        { en: "Heading", es: "Encabezado" },
        {
          en: "The section's heading. Underline a word to give it the accent style. Empty hides it.",
          es: "El encabezado de la sección. Subraye una palabra para darle el estilo de acento. Vacío lo oculta.",
        }
      ),
      bilingual(
        bodyRichText({ description: "The text under the heading.", label: "Text", name: "text" }),
        { en: "Text", es: "Texto" },
        {
          en: "The paragraphs under the heading.",
          es: "Los párrafos bajo el encabezado.",
        }
      ),
      {
        admin: {
          description: {
            en: "What the section shows under the text.",
            es: "Lo que muestra la sección bajo el texto.",
          },
        },
        defaultValue: "text",
        label: { en: "Section shows", es: "La sección muestra" },
        name: "kind",
        options: [
          { label: { en: "Text only", es: "Solo texto" }, value: "text" },
          { label: { en: "Questions and answers", es: "Preguntas y respuestas" }, value: "faq" },
          { label: { en: "A doctor's quote", es: "Una cita de un médico" }, value: "quote" },
          { label: { en: "Doctors by state", es: "Médicos por estado" }, value: "doctors" },
        ],
        type: "select",
      },
      {
        admin: {
          ...rowTitle("question", "Question"),
          condition: showFor("faq"),
          description: {
            en: "The questions, top to bottom. A visitor opens one answer at a time.",
            es: "Las preguntas, de arriba abajo. El visitante abre una respuesta a la vez.",
          },
        },
        fields: [
          {
            admin: {
              description: {
                en: "The question as the visitor reads it.",
                es: "La pregunta tal como la lee el visitante.",
              },
            },
            label: { en: "Question", es: "Pregunta" },
            name: "question",
            required: true,
            type: "text",
          },
          bilingual(
            bodyRichText({ description: "The answer.", label: "Answer", name: "answer" }),
            { en: "Answer", es: "Respuesta" },
            {
              en: "The answer shown when the question is opened.",
              es: "La respuesta que aparece al abrir la pregunta.",
            }
          ),
          {
            admin: {
              description: {
                en: "Articles shown as cards under the answer, in this order. Empty shows none.",
                es: "Artículos que se muestran como tarjetas bajo la respuesta, en este orden. Vacío no muestra ninguno.",
              },
            },
            hasMany: true,
            label: { en: "Related articles", es: "Artículos relacionados" },
            name: "posts",
            relationTo: "posts",
            type: "relationship",
          },
        ],
        label: { en: "Questions", es: "Preguntas" },
        labels: {
          plural: { en: "Questions", es: "Preguntas" },
          singular: { en: "Question", es: "Pregunta" },
        },
        name: "faqs",
        type: "array",
      },
      {
        admin: { condition: showFor("faq") },
        fields: [
          {
            admin: {
              description: {
                en: "Shows the first answer when the page opens.",
                es: "Muestra la primera respuesta al abrir la página.",
              },
              width: "50%",
            },
            defaultValue: false,
            label: { en: "First answer open", es: "Primera respuesta abierta" },
            name: "firstOpen",
            type: "checkbox",
          },
          {
            admin: {
              description: {
                en: "Marks the questions up for search engines. Turn off when another list on the page already does.",
                es: "Marca las preguntas para los buscadores. Desactívelo si otra lista de la página ya lo hace.",
              },
              width: "50%",
            },
            defaultValue: true,
            label: { en: "Search engine markup", es: "Marcado para buscadores" },
            name: "faqSchema",
            type: "checkbox",
          },
        ],
        type: "row",
      },
      {
        admin: {
          condition: showFor("quote"),
          description: {
            en: "The quote, with its quotation marks.",
            es: "La cita, con sus comillas.",
          },
        },
        label: { en: "Quote", es: "Cita" },
        name: "quote",
        type: "textarea",
      },
      {
        admin: {
          condition: showFor("quote"),
          description: {
            en: "The doctor named under the quote, with photo and job title. Empty uses the doctor whose page this is.",
            es: "El médico que firma la cita, con foto y cargo. Vacío usa el médico de esta página.",
          },
        },
        label: { en: "Quote by", es: "Cita de" },
        name: "quoteBy",
        relationTo: "doctors",
        type: "relationship",
      },
      {
        admin: {
          condition: showFor("doctors"),
          description: {
            en: "The doctors listed, in this order, each under every state they have a clinic in. Empty lists every doctor by name.",
            es: "Los médicos listados, en este orden, cada uno bajo cada estado donde tiene clínica. Vacío lista todos por nombre.",
          },
        },
        hasMany: true,
        label: { en: "Doctors", es: "Médicos" },
        name: "doctors",
        relationTo: "doctors",
        type: "relationship",
      },
      bilingual(
        bodyRichText({
          description: "The text under the list.",
          label: "Closing text",
          name: "closingText",
        }),
        { en: "Closing text", es: "Texto final" },
        {
          en: "Paragraphs under the questions, quote or doctors. Empty hides them.",
          es: "Párrafos bajo las preguntas, la cita o los médicos. Vacío los oculta.",
        }
      ),
      bilingual(
        siteButton(),
        { en: "Button", es: "Botón" },
        {
          en: "The button at the end. Empty text hides it.",
          es: "El botón al final. Sin texto no se muestra.",
        }
      ),
      {
        admin: {
          description: {
            en: "Filled for the usual button, outlined on a yellow section.",
            es: "Relleno para el botón habitual, con borde en una sección amarilla.",
          },
        },
        defaultValue: "filled",
        label: { en: "Button style", es: "Estilo del botón" },
        name: "buttonStyle",
        options: [
          { label: { en: "Filled", es: "Relleno" }, value: "filled" },
          { label: { en: "Outlined", es: "Con borde" }, value: "outline" },
        ],
        type: "select",
      },
      {
        fields: [
          {
            admin: {
              width: "33%",
              description: {
                en: "Large for a main section heading, small for a heading inside a longer page.",
                es: "Grande para un encabezado principal, pequeño para uno dentro de una página larga.",
              },
            },
            defaultValue: "h2",
            label: { en: "Heading size", es: "Tamaño del encabezado" },
            name: "headingLevel",
            options: [
              { label: { en: "Large (H2)", es: "Grande (H2)" }, value: "h2" },
              { label: { en: "Small (H3)", es: "Pequeño (H3)" }, value: "h3" },
            ],
            type: "select",
          },
          {
            admin: {
              description: {
                en: "The colour behind the section.",
                es: "El color detrás de la sección.",
              },
              width: "33%",
            },
            defaultValue: "bg",
            label: { en: "Background", es: "Fondo" },
            name: "background",
            options: [
              { label: { en: "Page tint", es: "Tono de página" }, value: "bg" },
              { label: { en: "White", es: "Blanco" }, value: "white" },
              { label: { en: "Light blue", es: "Azul claro" }, value: "light-blue" },
              { label: { en: "Yellow", es: "Amarillo" }, value: "yellow" },
            ],
            type: "select",
          },
          {
            admin: {
              description: {
                en: "The section's name in links that jump to it, for example faqs. The site gives insurance-center its large centred style and faqs a compact list on the vein disease guide.",
                es: "El nombre de la sección en los enlaces que saltan a ella, por ejemplo faqs. El sitio da a insurance-center su estilo grande centrado y a faqs una lista compacta en la guía de enfermedades venosas.",
              },
              width: "34%",
            },
            label: { en: "Anchor", es: "Ancla" },
            name: "anchor",
            type: "text",
            validate: validateAnchor,
          },
        ],
        type: "row",
      },
    ],
    interfaceName: "CenterTextBlock",
    label: "Centred text",
    slug: "centerText",
  }),
  { en: "Centred text", es: "Texto centrado" }
);
