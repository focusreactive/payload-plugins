import type { z } from "zod";
import { describe, expectTypeOf, it } from "vitest";

import type { CancelInputSchema } from "../../../server/features/cancel/model.js";
import type {
  EnqueueAssignmentOutput,
  EnqueueDocumentInputSchema,
  EnqueueListInputSchema,
} from "../../../server/features/enqueue-translation/model.js";
import type { DismissStalenessInputSchema } from "../../../server/features/staleness/model.js";
import type { FieldTranslationInputSchema } from "../../../server/features/translate-field/model.js";
import type { DocumentId } from "../primitives.js";
import type {
  CancelRequest,
  DismissStalenessRequest,
  EnqueueAssignmentBody,
  EnqueueDocumentRequest,
  EnqueueListRequest,
  RuleFilterBody,
  TranslationFilterBody,
  FieldTranslationRequest,
} from "../ActionBodies.js";

describe("the action bodies the admin sends are the ones the routes accept", () => {
  it("enqueue", () => {
    expectTypeOf<EnqueueDocumentRequest>().toExtend<z.input<typeof EnqueueDocumentInputSchema>>();
  });

  it("enqueue-list", () => {
    expectTypeOf<EnqueueListRequest>().toExtend<z.input<typeof EnqueueListInputSchema>>();
  });

  it("cancel", () => {
    expectTypeOf<CancelRequest>().toExtend<z.input<typeof CancelInputSchema>>();
  });

  it("dismiss", () => {
    expectTypeOf<DismissStalenessRequest>().toExtend<z.input<typeof DismissStalenessInputSchema>>();
  });

  it("field", () => {
    expectTypeOf<FieldTranslationRequest>().toExtend<z.input<typeof FieldTranslationInputSchema>>();
  });

  it("a leaf address is not something a list of documents can be narrowed by", () => {
    expectTypeOf<TranslationFilterBody>().not.toExtend<RuleFilterBody>();
    expectTypeOf<NonNullable<EnqueueListRequest["filters"]>[number]>().toExtend<RuleFilterBody>();
    expectTypeOf<
      NonNullable<EnqueueDocumentRequest["filters"]>[number]
    >().toExtend<TranslationFilterBody>();
  });

  it("the single-document route takes one document, and the list route takes one or more", () => {
    expectTypeOf<EnqueueDocumentRequest["collection_id"]>().toEqualTypeOf<[DocumentId]>();
    expectTypeOf<[DocumentId, DocumentId]>().not.toExtend<
      EnqueueDocumentRequest["collection_id"]
    >();
    expectTypeOf<[DocumentId, DocumentId]>().toExtend<EnqueueListRequest["collection_id"]>();
  });

  it("an enqueue assignment reads back as the route writes it", () => {
    expectTypeOf<EnqueueAssignmentOutput>().toExtend<EnqueueAssignmentBody>();
  });
});
