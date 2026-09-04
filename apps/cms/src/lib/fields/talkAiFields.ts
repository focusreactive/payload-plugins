/**
 * STAGED SOURCE - not yet applied. Destination on the sandbox branch:
 *   apps/cms/src/lib/fields/talkAiFields.ts
 *
 * The derived layer on a Talk: a transcript with real timings, and the sections the client does
 * not have today. Field shape follows projects/ai-council-demo/studio/src/schemaTypes/documents/
 * talk.ts, which is Sanity - so it is a reference for the shape, not code to lift.
 *
 * `aiQuestions` is the field aimed at Jeff. Answer engines are what he asked about by name, and
 * "questions this talk answers" is the shape an answer engine can actually quote.
 */

import type { Field } from "payload";

export const talkAiFields: Field[] = [
  {
    // A collapsible in the main body, NOT a sidebar group: a `group` positioned in the sidebar
    // renders its heading above an empty field list in Payload 3.84 (client-sandboxes.md).
    admin: { initCollapsed: false },
    fields: [
      {
        admin: {
          description:
            "Advisory, not a gate. A first batch is worth eyeballing, but hand-reviewing 7,000 items is not a workflow a two-person office can run, and the client has never asked for one.",
        },
        defaultValue: "awaiting-review",
        label: "AI status",
        name: "aiStatus",
        options: [
          { label: "Awaiting review", value: "awaiting-review" },
          { label: "Approved", value: "approved" },
        ],
        type: "select",
      },
      {
        admin: {
          description:
            "Two or three sentences. Rendered above the body and used as the meta description fallback.",
        },
        label: "Summary",
        localized: true,
        name: "aiSummary",
        type: "textarea",
      },
      {
        fields: [{ label: "Takeaway", name: "takeaway", required: true, type: "textarea" }],
        label: "Key takeaways",
        localized: true,
        name: "aiTakeaways",
        type: "array",
      },
      {
        admin: {
          description:
            "Phrase these as a reader would actually ask them, not as headings. This is what an answer engine lifts.",
        },
        fields: [{ label: "Question", name: "question", required: true, type: "text" }],
        label: "Questions this talk answers",
        localized: true,
        name: "aiQuestions",
        type: "array",
      },
      {
        admin: {
          description:
            "startSeconds is DERIVED by locating the quote in the transcript segments - never entered by hand and never produced by a model. A model asked for a plausible timecode returns a round number that is wrong by 16 to 400 seconds, and this field is rendered as a seek link into the client's own audio.",
        },
        fields: [
          { label: "Quote", name: "quote", required: true, type: "textarea" },
          {
            type: "row",
            fields: [
              { admin: { width: "50%" }, label: "Speaker", name: "speakerName", type: "text" },
              {
                admin: { readOnly: true, width: "50%" },
                label: "Start (seconds)",
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
        admin: { description: "Full ASR text. Rendered behind the same tier as the body." },
        label: "Transcript",
        localized: true,
        name: "transcript",
        type: "textarea",
      },
      {
        admin: {
          description:
            "[{start, end, text}] from the ASR pass. This is what makes a pull-quote timestamp derivable, so it is stored even though nothing renders it directly. JSON rather than an array field: 113 segments on a 7-minute talk means roughly 8,000 rows per hour of audio, and an array field would make the admin document unusable.",
        },
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
