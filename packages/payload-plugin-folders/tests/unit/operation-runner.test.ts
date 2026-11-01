import { describe, expect, it } from "vitest";

import { createOperationRunner } from "../../src/admin/Operations/operationRunner.js";
import type { OperationProgress } from "../../src/core/operations.js";

type Answer = OperationProgress | Error;

const setup = (answers: Answer[], { isActive = () => true } = {}) => {
  const calls: Array<number | string> = [];
  const seen: Array<{ id: number | string; progress: OperationProgress }> = [];
  const remaining = [...answers];
  const runner = createOperationRunner({
    isActive,
    onProgress: (id, progress) => seen.push({ id, progress }),
    step: async (id) => {
      calls.push(id);
      const answer = remaining.shift();
      if (answer === undefined) {
        throw new Error("no answer left");
      }
      if (answer instanceof Error) {
        throw answer;
      }

      return answer;
    },
  });

  return { calls, runner, seen };
};

describe("createOperationRunner", () => {
  it("steps until the operation is done and reports every answer", async () => {
    const { calls, runner, seen } = setup([
      { done: 200, status: "running", total: 500 },
      { done: 400, status: "running", total: 500 },
      { done: 500, status: "done", total: 500 },
    ]);

    await runner.run(7);

    expect(calls).toEqual([7, 7, 7]);
    expect(seen.map((entry) => entry.progress.done)).toEqual([200, 400, 500]);
    expect(runner.isRunning(7)).toBe(false);
  });

  it("stops at a failed step and keeps the place, and a second run goes on from there", async () => {
    const { calls, runner, seen } = setup([
      { done: 200, status: "running", total: 500 },
      { done: 200, error: "boom", status: "failed", total: 500 },
      { done: 500, status: "done", total: 500 },
    ]);

    await runner.run(7);
    expect(seen.at(-1)?.progress).toMatchObject({ done: 200, error: "boom", status: "failed" });
    expect(calls).toHaveLength(2);

    await runner.run(7);
    expect(seen.at(-1)?.progress).toMatchObject({ done: 500, status: "done" });
  });

  it("counts a thrown step (the network) as a failed one and reports where it stood", async () => {
    const { runner, seen } = setup([new Error("network down")]);

    await runner.run(7, { done: 400, total: 980 });

    expect(seen).toEqual([
      {
        id: 7,
        progress: { done: 400, error: "network down", status: "failed", total: 980 },
      },
    ]);
  });

  it("starts no second loop for an operation that is being stepped", async () => {
    const { calls, runner } = setup([
      { done: 200, status: "running", total: 400 },
      { done: 400, status: "done", total: 400 },
    ]);

    await Promise.all([runner.run(7), runner.run(7), runner.run("7")]);

    expect(calls).toEqual([7, 7]);
  });

  it("steps two operations independently", async () => {
    const { calls, runner } = setup([
      { done: 5, status: "done", total: 5 },
      { done: 3, status: "done", total: 3 },
    ]);

    await Promise.all([runner.run(1), runner.run(2)]);

    expect(calls.toSorted()).toEqual([1, 2]);
  });

  it("stops stepping once the page that owns it is gone", async () => {
    let active = true;
    const calls: number[] = [];
    const runner = createOperationRunner({
      isActive: () => active,
      onProgress: () => {
        // The page unmounts after the first answer.
        active = false;
      },
      step: async () => {
        calls.push(1);

        return { done: 200, status: "running", total: 500 };
      },
    });

    await runner.run(1);

    expect(calls).toHaveLength(1);
    expect(runner.isRunning(1)).toBe(false);
  });
});
