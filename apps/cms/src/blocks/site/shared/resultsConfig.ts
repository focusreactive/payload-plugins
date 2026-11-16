import type { Block, Field, GroupField } from "payload";

import { headingRichText } from "@/lib/fields/site/richText";
import { siteButton } from "@/lib/fields/site/siteLink";

import { rowTitle, siteBlock } from "../shared";

type Words = Record<"en" | "es", string>;

interface FieldOptions {
  required?: boolean;
  /** Share of a row, for fields set side by side. */
  width?: string;
}

const textField = (
  name: string,
  label: Words,
  description: Words,
  { required = false, width }: FieldOptions = {}
): Field => ({
  admin: { description, width },
  label,
  name,
  required,
  type: "text",
});

const imageField = (
  name: string,
  label: Words,
  description: Words,
  { required = false, width }: FieldOptions = {}
): Field => ({
  admin: { description, width },
  label,
  name,
  relationTo: "media",
  required,
  type: "upload",
});

const resultFields: Field[] = [
  {
    admin: {
      ...rowTitle("name", "Symptom"),
      description: {
        en: "The symptoms listed beside the review, each with its round icon.",
        es: "Los síntomas que aparecen junto a la reseña, cada uno con su icono redondo.",
      },
    },
    fields: [
      imageField(
        "icon",
        { en: "Icon", es: "Icono" },
        { en: "The round drawing beside the symptom.", es: "El dibujo redondo junto al síntoma." }
      ),
      textField(
        "name",
        { en: "Symptom", es: "Síntoma" },
        { en: "For example Cramping Legs.", es: "Por ejemplo Calambres en las piernas." },
        { required: true }
      ),
    ],
    label: { en: "Symptoms", es: "Síntomas" },
    labels: {
      plural: { en: "Symptoms", es: "Síntomas" },
      singular: { en: "Symptom", es: "Síntoma" },
    },
    name: "symptoms",
    type: "array",
  },
  {
    admin: {
      description: {
        en: "The patient's own words, without quotation marks.",
        es: "Las palabras del paciente, sin comillas.",
      },
    },
    label: { en: "Review", es: "Reseña" },
    name: "quote",
    required: true,
    type: "textarea",
  },
  {
    fields: [
      textField(
        "author",
        { en: "Patient", es: "Paciente" },
        { en: "The name under the review.", es: "El nombre bajo la reseña." },
        { required: true, width: "50%" }
      ),
      textField(
        "place",
        { en: "Place", es: "Lugar" },
        {
          en: "The clinic or town. Empty hides it.",
          es: "La clínica o ciudad. Vacío no se muestra.",
        },
        { width: "50%" }
      ),
    ],
    type: "row",
  },
  {
    fields: [
      {
        admin: {
          description: { en: "Stars shown, 1 to 5.", es: "Estrellas, de 1 a 5." },
          width: "50%",
        },
        defaultValue: 5,
        label: { en: "Rating", es: "Valoración" },
        max: 5,
        min: 1,
        name: "rating",
        type: "number",
      },
      imageField(
        "sourceLogo",
        { en: "Review site logo", es: "Logo del sitio de reseñas" },
        {
          en: "The logo of the site the review was left on, for example Google. Empty shows no logo.",
          es: "El logo del sitio donde se dejó la reseña, por ejemplo Google. Vacío no muestra logo.",
        },
        { width: "50%" }
      ),
    ],
    type: "row",
  },
  {
    fields: [
      imageField(
        "before",
        { en: "Before picture", es: "Imagen de antes" },
        { en: "Taken before treatment.", es: "Tomada antes del tratamiento." },
        { required: true, width: "50%" }
      ),
      imageField(
        "after",
        { en: "After picture", es: "Imagen de después" },
        { en: "Taken after treatment.", es: "Tomada después del tratamiento." },
        { required: true, width: "50%" }
      ),
    ],
    type: "row",
  },
];

const sectionButton: GroupField = {
  ...(siteButton() as GroupField),
  admin: {
    description: {
      en: "The button beside the heading, repeated under the slider on phones. Empty text hides it.",
      es: "El botón junto al título, repetido bajo el carrusel en el móvil. Sin texto no se muestra.",
    },
    hideGutter: true,
  },
  label: { en: "Button", es: "Botón" },
};

export const ResultsSliderBlock: Block = {
  ...siteBlock({
    fields: [
      textField(
        "eyebrow",
        { en: "Eyebrow", es: "Antetítulo" },
        {
          en: "The small line above the heading, for example Real Patient Reviews. Empty hides it.",
          es: "La línea pequeña sobre el título, por ejemplo Resultados reales en pacientes. Vacío no se muestra.",
        }
      ),
      {
        ...headingRichText({ description: "", label: "Heading", name: "heading" }),
        admin: {
          description: {
            en: "The section's heading.",
            es: "El título de la sección.",
          },
        },
        label: { en: "Heading", es: "Título" },
      },
      textField(
        "note",
        { en: "Small print", es: "Letra pequeña" },
        {
          en: "A small italic line under the heading, for example Individual results may vary. Empty hides it.",
          es: "Una línea pequeña en cursiva bajo el título, por ejemplo Los resultados individuales pueden variar. Vacío no se muestra.",
        }
      ),
      sectionButton,
      {
        admin: {
          description: {
            en: "Where the results sit. Centred suits a single result.",
            es: "Dónde se colocan los resultados. Centrado conviene a un único resultado.",
          },
        },
        defaultValue: "start",
        label: { en: "Slider position", es: "Posición del carrusel" },
        name: "align",
        options: [
          { label: { en: "From the left", es: "Desde la izquierda" }, value: "start" },
          { label: { en: "Centred", es: "Centrado" }, value: "center" },
        ],
        type: "select",
      },
      {
        fields: [
          textField(
            "symptomsLabel",
            { en: "Symptoms label", es: "Etiqueta de síntomas" },
            {
              en: "Above each list of symptoms, for example Symptoms.",
              es: "Sobre cada lista de síntomas, por ejemplo Síntomas.",
            },
            { width: "33%" }
          ),
          textField(
            "beforeLabel",
            { en: "Before label", es: "Etiqueta de antes" },
            {
              en: "On the first picture, for example Before.",
              es: "En la primera imagen, por ejemplo Antes.",
            },
            { width: "33%" }
          ),
          textField(
            "afterLabel",
            { en: "After label", es: "Etiqueta de después" },
            {
              en: "On the second picture, for example After.",
              es: "En la segunda imagen, por ejemplo Después.",
            },
            { width: "33%" }
          ),
        ],
        type: "row",
      },
      {
        admin: {
          ...rowTitle("author", "Result"),
          description: {
            en: "One slide per patient: symptoms, review and before and after pictures.",
            es: "Una diapositiva por paciente: síntomas, reseña e imágenes de antes y después.",
          },
        },
        fields: resultFields,
        label: { en: "Results", es: "Resultados" },
        labels: {
          plural: { en: "Results", es: "Resultados" },
          singular: { en: "Result", es: "Resultado" },
        },
        name: "items",
        type: "array",
      },
    ],
    interfaceName: "ResultsSliderBlock",
    label: "Patient results slider",
    slug: "results",
  }),
  labels: {
    plural: { en: "Patient results slider", es: "Carrusel de resultados de pacientes" },
    singular: { en: "Patient results slider", es: "Carrusel de resultados de pacientes" },
  },
};
