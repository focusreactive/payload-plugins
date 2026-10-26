import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Payload, PayloadRequest } from "payload";

import type { JobAssignment, TaskRunner } from "../../../modules/task-runner/index.js";

vi.mock("../../../shared/access/refusedTargets.js", () => ({
  refusedTargets: vi.fn().mockResolvedValue(new Set<string>()),
}));

const { CancelHandler } = await import("../handler.js");
const { refusedTargets } = await import("../../../shared/access/refusedTargets.js");

const ANNA = { id: "anna", collection: "users" };

const job = (handle: string, collectionId: string): JobAssignment => ({
  handle,
  collectionSlug: "posts" as never,
  collectionId,
  startedBy: { id: "anna", collection: "users" },
});

describe("DELETE /cancel asks about the documents behind the handles", () => {
  let runner: TaskRunner;
  let handler: InstanceType<typeof CancelHandler>;

  const request = (ids: string[]): PayloadRequest =>
    ({
      payload: {} as Payload,
      user: ANNA,
      json: vi.fn().mockResolvedValue({ ids }),
    }) as unknown as PayloadRequest;

  beforeEach(() => {
    vi.clearAllMocks();
    (refusedTargets as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(new Set<string>());
    runner = {
      enqueue: vi.fn(),
      cancel: vi.fn().mockResolvedValue(undefined),
      run: vi.fn(),
      findByCollection: vi.fn(),
      assignmentsOf: vi.fn().mockResolvedValue([job("mine", "d1"), job("theirs", "d2")]),
    } as unknown as TaskRunner;
    handler = new CancelHandler({ create: vi.fn().mockReturnValue(runner) });
  });

  it("cancels only the handles whose document the caller may change", async () => {
    (refusedTargets as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(new Set(["d2"]));

    await handler.handle(request(["mine", "theirs"]));

    expect(runner.cancel).toHaveBeenCalledWith(["mine"]);
  });

  it("names the refused handles", async () => {
    (refusedTargets as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(new Set(["d2"]));

    const body = await (await handler.handle(request(["mine", "theirs"]))).json();

    expect(body).toMatchObject({ data: { refused: ["theirs"] } });
  });

  it("answers 204 with no body when nothing was refused", async () => {
    const response = await handler.handle(request(["mine", "theirs"]));

    expect(response.status).toBe(204);
    expect(runner.cancel).toHaveBeenCalledWith(["mine", "theirs"]);
  });

  it("never cancels a handle the runner could not place", async () => {
    (runner.assignmentsOf as ReturnType<typeof vi.fn>).mockResolvedValue([job("mine", "d1")]);

    await handler.handle(request(["mine", "unplaceable"]));

    expect(runner.cancel).toHaveBeenCalledWith(["mine"]);
  });

  it("cancels nothing when the runner cannot answer what the handles stand for", async () => {
    (runner.assignmentsOf as ReturnType<typeof vi.fn>).mockRejectedValue(
      new Error("store is down")
    );

    await expect(handler.handle(request(["mine", "theirs"]))).rejects.toThrow("store is down");

    expect(runner.cancel).not.toHaveBeenCalled();
  });

  it("keeps two collections apart when they hold the same document id", async () => {
    (runner.assignmentsOf as ReturnType<typeof vi.fn>).mockResolvedValue([
      { ...job("in-posts", "shared"), collectionSlug: "posts" as never },
      { ...job("in-pages", "shared"), collectionSlug: "pages" as never },
    ]);
    (refusedTargets as unknown as ReturnType<typeof vi.fn>).mockImplementation(
      ({ collection }: { collection: string }) =>
        Promise.resolve(collection === "pages" ? new Set(["shared"]) : new Set<string>())
    );

    await handler.handle(request(["in-posts", "in-pages"]));

    expect(runner.cancel).toHaveBeenCalledWith(["in-posts"]);
  });
});
