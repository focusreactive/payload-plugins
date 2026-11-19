import type { Block } from "payload";

import type { SiteBlockComponents } from "@/blocks/site/types";
import { QuizDemo } from "@/components/site/condition/QuizDemo";
import { headingRichText } from "@/lib/fields/site/richText";
import { siteButton } from "@/lib/fields/site/siteLink";

import { siteBlock } from "../shared";

const QuizDemoBlock: Block = {
  ...siteBlock({
    fields: [
      {
        admin: {
          description: {
            en: "The small line above the heading, for example Quick check-up. Empty hides it.",
            es: "La línea pequeña sobre el título, por ejemplo Chequeo rápido. Vacío no se muestra.",
          },
        },
        label: { en: "Eyebrow", es: "Antetítulo" },
        name: "eyebrow",
        type: "text",
      },
      {
        ...headingRichText({ description: "", label: "Heading", name: "heading" }),
        admin: {
          description: {
            en: "The section's heading, for example How healthy are your legs?",
            es: "El título de la sección, por ejemplo ¿Qué tan sanas están sus piernas?",
          },
        },
        label: { en: "Heading", es: "Título" },
      },
      {
        admin: {
          description: {
            en: "One sentence under the heading. Empty hides it.",
            es: "Una frase bajo el título. Vacío no se muestra.",
          },
        },
        label: { en: "Text", es: "Texto" },
        name: "text",
        type: "textarea",
      },
      {
        admin: {
          description: {
            en: "The answers shown as a row of dots, in order, for example Mild, Moderate, Severe. A visitor can pick one; the quiz itself starts from the button.",
            es: "Las respuestas que se muestran como una fila de puntos, en orden, por ejemplo Leve, Moderado, Fuerte. El visitante puede elegir una; el cuestionario empieza desde el botón.",
          },
        },
        hasMany: true,
        label: { en: "Answers", es: "Respuestas" },
        name: "answers",
        type: "text",
      },
      siteButton({ description: "The button to the quiz. Empty text hides it." }),
    ],
    interfaceName: "QuizDemoBlock",
    label: "Quiz teaser",
    slug: "quizDemo",
  }),
  labels: {
    plural: { en: "Quiz teaser", es: "Avance del cuestionario" },
    singular: { en: "Quiz teaser", es: "Avance del cuestionario" },
  },
};

/** Sections that exist for the condition page template. Registered in `@/blocks/siteBlocks`. */
export const conditionBlocks: Block[] = [QuizDemoBlock];

export const conditionBlockComponents: SiteBlockComponents = {
  quizDemo: QuizDemo,
};
