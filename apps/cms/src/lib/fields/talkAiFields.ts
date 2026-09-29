/**
 * The derived layer on a Talk: a transcript with real timings, and the sections the archive does
 * not have today. Field shape follows projects/ai-council-demo/studio/src/schemaTypes/documents/
 * talk.ts, which is Sanity - so it is a reference for the shape, not code to lift.
 *
 * `aiQuestions` is the field aimed at answer engines, which is what the evaluation asked about, and
 * "questions this talk answers" is the shape an answer engine can actually quote.
 *
 * Every description here is written for the person editing, not for us. The reasons a field exists,
 * the failure modes we designed around and the numbers behind a storage choice are comments, which
 * is where they belong - a description is panel UI and gets read out loud on a screen share.
 *
 * Field labels below stay bare strings, not { en, es } objects - this array is spliced into the
 * Talk collection, and Talk.ts (lines 6-9) explains why an object label breaks there. Descriptions
 * are unaffected and are localized as everywhere else.
 */

import type { Field } from "payload";

export const talkAiFields: Field[] = [
  {
    // A collapsible in the main body, NOT a sidebar group: a `group` positioned in the sidebar
    // renders its heading above an empty field list in Payload 3.84 (client-sandboxes.md).
    //
    // Collapsed on open. Expanded, the seven fields below - two of them a transcript and a list of
    // timed quotes - push the SEO tab and everything under it off a laptop screen, and the document
    // reads as a form with no end.
    admin: {
      description: {
        en: "Written from the recording, then yours to edit. This is what search engines and AI assistants read when someone asks a question this teaching answers.",
        es: "Se redacta a partir de la grabación y después es tuyo para editar. Esto es lo que los buscadores y los asistentes de IA leen cuando alguien hace una pregunta que esta enseñanza responde.",
      },
      initCollapsed: true,
    },
    fields: [
      {
        admin: {
          description: {
            en: "Whether someone has read the text below and is happy with it. Readers see it either way - this is a note for your team.",
            es: "Indica si alguien ha leído el texto de abajo y está conforme con él. Los lectores lo ven de todos modos - esto es una nota para tu equipo.",
          },
        },
        defaultValue: "awaiting-review",
        label: "Checked by a person",
        name: "aiStatus",
        options: [
          { label: "Not checked yet", value: "awaiting-review" },
          { label: "Checked and approved", value: "approved" },
        ],
        type: "select",
      },
      {
        admin: {
          description: {
            en: "Two or three sentences, shown above the teaching. Also used as the search description when the SEO tab is left empty.",
            es: "Dos o tres frases que se muestran encima de la enseñanza. También se usa como descripción de búsqueda cuando la pestaña de SEO se deja vacía.",
          },
        },
        label: "Summary",
        localized: true,
        name: "aiSummary",
        type: "textarea",
      },
      {
        admin: {
          description: {
            en: "The few points a reader should come away with. Shown as a short list under the summary.",
            es: "Los pocos puntos con los que un lector debería quedarse. Se muestran como una lista breve debajo del resumen.",
          },
          initCollapsed: true,
        },
        fields: [{ label: "Takeaway", name: "takeaway", required: true, type: "textarea" }],
        label: "Key takeaways",
        localized: true,
        name: "aiTakeaways",
        type: "array",
      },
      {
        admin: {
          description: {
            en: "Phrased the way a reader would actually ask them out loud, not as headings. These are the lines an AI assistant quotes when it answers with this teaching.",
            es: "Formuladas tal como un lector las diría en voz alta, no como titulares. Son las frases que un asistente de IA cita cuando responde con esta enseñanza.",
          },
          initCollapsed: true,
        },
        fields: [{ label: "Question", name: "question", required: true, type: "text" }],
        label: "Questions this talk answers",
        localized: true,
        name: "aiQuestions",
        type: "array",
      },
      {
        admin: {
          description: {
            en: "Lines worth lifting out. Each one becomes a button that jumps the audio to the moment it was said.",
            es: "Frases que merece la pena destacar. Cada una se convierte en un botón que salta el audio al momento en que se dijo.",
          },
          initCollapsed: true,
        },
        fields: [
          { label: "Quote", name: "quote", required: true, type: "textarea" },
          {
            type: "row",
            fields: [
              { admin: { width: "50%" }, label: "Speaker", name: "speakerName", type: "text" },
              {
                // Derived by locating the quote in the transcript segments - never entered by hand
                // and never produced by a model. A model asked for a plausible timecode returns a
                // round number wrong by 16 to 400 seconds, and this value is rendered as a seek
                // link into real audio, so a wrong one is audible.
                admin: {
                  description: {
                    en: "Set automatically by finding the quote in the recording.",
                    es: "Se calcula automáticamente al localizar la cita dentro de la grabación.",
                  },
                  readOnly: true,
                  width: "50%",
                },
                label: "Starts at, in seconds",
                min: 0,
                name: "startSeconds",
                type: "number",
              },
            ],
          },
        ],
        label: "Pull quotes",
        name: "aiPullQuotes",
        type: "array",
      },
      {
        admin: {
          description: {
            en: "The full text of the recording, word for word. Behind the same membership as the body.",
            es: "El texto completo de la grabación, palabra por palabra. Está protegido por la misma membresía que el cuerpo.",
          },
        },
        label: "Transcript",
        localized: true,
        name: "transcript",
        type: "textarea",
      },
      {
        // Hidden rather than read-only. It is [{start, end, text}] from the speech-to-text pass,
        // stored because it is what makes a pull-quote timestamp derivable, and nothing renders it.
        // A read-only version would put roughly 8,000 rows per hour of audio in front of an editor
        // who can never act on any of them. Hidden keeps it on the document and out of the panel.
        admin: { hidden: true },
        label: "Transcript segments",
        name: "transcriptSegments",
        type: "json",
      },
    ],
    label: "AI",
    // Unnamed on purpose: a collapsible is presentational, so every field inside it is stored at
    // the top level of the document. That is what the seed script and the renderer both expect -
    // `talk.aiSummary`, not `talk.ai.aiSummary`.
    type: "collapsible",
  },
];
