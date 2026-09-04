/**
 * STAGED SOURCE - not yet applied. Destination on the sandbox branch:
 *   apps/cms/src/blocks/TalkGrid/config.ts
 *
 * Lists Talks. The nearest existing pattern for "a section that references a thing" is
 * TestimonialsList, but this block resolves its items by QUERY rather than by hand-picked
 * relationships, because that is the behaviour the client needs: a topic page cannot be
 * maintained by an editor re-picking rows every time a talk is added to a 14,000-item archive.
 * `source: "selected"` keeps the hand-picked mode available for a curated homepage row.
 */

import type { Block } from "payload";

import { injectSection } from "@/lib/fields/section/injectSection";
import { getBlockPreviewImage } from "@/lib/utils/blockPreviewImage";
import { talkGridFields } from "@/lib/fields/talkGridFields";

export const TalkGridBlock: Block = injectSection({
  ...getBlockPreviewImage("Talk Grid"),
  fields: [...talkGridFields],
  interfaceName: "TalkGridBlock",
  labels: {
    plural: { en: "Talk Grids", es: "Cuadrículas de charlas" },
    singular: { en: "Talk Grid", es: "Cuadrícula de charlas" },
  },
  slug: "talkGrid",
});
