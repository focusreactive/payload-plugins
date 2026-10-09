import { describe, it, expect } from "vitest";

import type { EnqueueAssignment } from "../task-runner/types.js";
import { taskFromAssignment } from "./taskMapping.js";

describe("taskFromAssignment", () => {
  it("maps every field the host is shown, and adds none", () => {
    const assignment: EnqueueAssignment = {
      collectionSlug: "posts",
      collectionId: "doc-1",
      sourceLng: "en",
      targetLng: "de",
      strategy: "skip_existing",
      handle: "run-9",
    };

    expect(taskFromAssignment(assignment)).toEqual({
      collection: "posts",
      id: "doc-1",
      sourceLng: "en",
      targetLng: "de",
      strategy: "skip_existing",
      handle: "run-9",
    });
  });
});
