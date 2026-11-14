import { describe, it, expectTypeOf } from "vitest";

import type { AuthorisedHandle, AuthorisedWork } from "../authorised.js";
import type { TaskInput } from "../../../modules/task-runner/types.js";

describe("AuthorisedWork", () => {
  it("is not assignable from a task nobody asked about", () => {
    expectTypeOf<TaskInput>().not.toExtend<AuthorisedWork>();
  });

  it("cannot be forged by guessing the brand", () => {
    expectTypeOf<TaskInput & { __brand: "AuthorisedWork" }>().not.toExtend<AuthorisedWork>();
  });

  it("is still a task, so the runner reads it as one", () => {
    expectTypeOf<AuthorisedWork>().toExtend<TaskInput>();
  });
});

describe("AuthorisedHandle", () => {
  it("is not assignable from a bare string", () => {
    expectTypeOf<string>().not.toExtend<AuthorisedHandle>();
  });

  it("cannot be forged by guessing the brand", () => {
    expectTypeOf<string & { __brand: "AuthorisedHandle" }>().not.toExtend<AuthorisedHandle>();
  });

  it("is not authorised work: a job's name is not the work itself", () => {
    expectTypeOf<AuthorisedHandle>().not.toExtend<AuthorisedWork>();
  });
});
