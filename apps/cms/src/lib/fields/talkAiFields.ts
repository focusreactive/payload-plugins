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
      description:
        "Written from the recording, then yours to edit. This is what search engines and AI assistants read when someone asks a question this teaching answers.",
      initCollapsed: true,
    },
    fields: [
      {
        admin: {
          description:
            "Whether someone has read the text below and is happy with it. Readers see it either way - this is a note for your team.",
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
          description:
            "Two or three sentences, shown above the teaching. Also used as the search description when the SEO tab is left empty.",
        },
        label: "Summary",
        localized: true,
        name: "aiSummary",
        type: "textarea",
      },
      {
        admin: {
          description:
            "The few points a reader should come away with. Shown as a short list under the summary.",
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
          description:
            "Phrased the way a reader would actually ask them out loud, not as headings. These are the lines an AI assistant quotes when it answers with this teaching.",
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
          description:
            "Lines worth lifting out. Each one becomes a button that jumps the audio to the moment it was said.",
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
                  description: "Set automatically by finding the quote in the recording.",
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
          description:
            "The full text of the recording, word for word. Behind the same membership as the body.",
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
