import type { z } from "zod";
import { describe, expectTypeOf, it } from "vitest";

import type { CancelInputSchema } from "../../../server/features/cancel/model.js";
import type {
  EnqueueAssignmentOutput,
  EnqueueInputSchema,
} from "../../../server/features/enqueue-translation/model.js";
import type { DismissStalenessInputSchema } from "../../../server/features/staleness/model.js";
import type { FieldTranslationInputSchema } from "../../../server/features/translate-field/model.js";
import type {
  CancelRequest,
  DismissStalenessRequest,
  EnqueueAssignmentBody,
  EnqueueRequest,
  FieldTranslationRequest,
} from "../ActionBodies.js";

describe("the action bodies the admin sends are the ones the routes accept", () => {
  it("enqueue", () => {
    expectTypeOf<EnqueueRequest>().toExtend<z.input<typeof EnqueueInputSchema>>();
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

  it("an enqueue assignment reads back as the route writes it", () => {
    expectTypeOf<EnqueueAssignmentOutput>().toExtend<EnqueueAssignmentBody>();
  });
});
