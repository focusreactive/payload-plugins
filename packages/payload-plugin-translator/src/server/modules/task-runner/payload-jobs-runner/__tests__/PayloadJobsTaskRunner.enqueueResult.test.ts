import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Payload, CollectionSlug } from "payload";

import { PayloadJobsTaskRunner } from "../PayloadJobsTaskRunner.js";
import type { PayloadJobsRunnerConfig, PayloadJob } from "../types.js";
import type { TaskInput } from "../../types.js";

describe("PayloadJobsTaskRunner.enqueue answers with the jobs it created or extended", () => {
  let mockPayload: {
    find: ReturnType<typeof vi.fn>;
    delete: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
    db: { updateOne: ReturnType<typeof vi.fn> };
    config: { jobs?: { enableConcurrencyControl?: boolean } };
    jobs: { queue: ReturnType<typeof vi.fn>; cancel: ReturnType<typeof vi.fn> };
  };
  let runner: PayloadJobsTaskRunner;

  const config: PayloadJobsRunnerConfig = {
    taskName: "translate_document",
    workflowName: "translate_document_locales",
    queueName: "translations",
    jobsCollection: "payload-jobs",
    autoRun: { cron: "* * * * *", limit: 50 },
    staleJobTimeoutMs: 300_000,
  };

  const input = (overrides: Partial<TaskInput> = {}): TaskInput => ({
    collectionSlug: "posts" as CollectionSlug,
    collectionId: "doc-123",
    sourceLng: "en",
    targetLng: "de",
    strategy: "overwrite",
    publishOnTranslation: false,
    ...overrides,
  });

  const planSeesThenRereadSees = (atPlan: PayloadJob, atReread: PayloadJob) =>
    mockPayload.find
      .mockResolvedValueOnce({ docs: [atPlan] })
      .mockResolvedValue({ docs: [atReread] });

  const liveJob = (targetLngs: string[]) => {
    const stored = {
      collection_slug: "posts",
      collection_id: "doc-123",
      source_lng: "en",
      target_lngs: targetLngs,
      strategy: "overwrite",
      publish_on_translation: false,
      requester_id: null,
      requester_collection: null,
    };
    const job: PayloadJob = {
      id: "job-live",
      createdAt: "2026-01-01T00:00:00Z",
      updatedAt: "2026-01-01T00:00:00Z",
      processing: false,
      input: stored,
    };
    return { job, absorb: (locale: string) => stored.target_lngs.push(locale) };
  };

  beforeEach(() => {
    mockPayload = {
      find: vi.fn().mockResolvedValue({ docs: [] }),
      delete: vi.fn().mockResolvedValue(undefined),
      update: vi.fn().mockResolvedValue({ docs: [] }),
      db: { updateOne: vi.fn().mockResolvedValue(undefined) },
      config: { jobs: {} },
      jobs: {
        queue: vi.fn().mockResolvedValue({ id: "job-new" }),
        cancel: vi.fn().mockResolvedValue(undefined),
      },
    };
    runner = new PayloadJobsTaskRunner(mockPayload as unknown as Payload, config);
  });

  it("names the newly queued job for every locale it covers", async () => {
    const result = await runner.enqueue([input({ targetLng: "de" }), input({ targetLng: "fr" })]);

    expect(result).toEqual([
      { collectionSlug: "posts", collectionId: "doc-123", targetLng: "de", jobId: "job-new" },
      { collectionSlug: "posts", collectionId: "doc-123", targetLng: "fr", jobId: "job-new" },
    ]);
  });

  it("names the LIVE job for a locale that joined it, not a new one", async () => {
    const { job, absorb } = liveJob(["de"]);
    mockPayload.find.mockResolvedValue({ docs: [job] });
    mockPayload.db.updateOne.mockImplementation(async () => absorb("fr"));

    const result = await runner.enqueue([input({ targetLng: "fr" })]);

    expect(
      result,
      "the caller asked for fr and it went into the live job — reporting a new id would be a lie"
    ).toEqual([
      { collectionSlug: "posts", collectionId: "doc-123", targetLng: "fr", jobId: "job-live" },
    ]);
    expect(mockPayload.jobs.queue, "nothing new was queued").not.toHaveBeenCalled();
  });

  it("names the live job for a locale it ALREADY covers, since that job is what will run it", async () => {
    const { job } = liveJob(["de"]);
    mockPayload.find.mockResolvedValue({ docs: [job] });

    const result = await runner.enqueue([input({ targetLng: "de" })]);

    expect(
      result,
      "nothing was appended and nothing was queued, but de is still going to be translated — by job-live"
    ).toEqual([
      { collectionSlug: "posts", collectionId: "doc-123", targetLng: "de", jobId: "job-live" },
    ]);
    expect(mockPayload.jobs.queue).not.toHaveBeenCalled();
    expect(mockPayload.db.updateOne, "there is nothing to append").not.toHaveBeenCalled();
  });

  it("names the running job under an exclusive queue, where it cannot be extended but still runs the locale", async () => {
    const { job } = liveJob(["de"]);
    job.processing = true;
    mockPayload.config.jobs = { enableConcurrencyControl: true };
    mockPayload.find.mockResolvedValue({ docs: [job] });

    const result = await runner.enqueue([input({ targetLng: "de" })]);

    expect(
      result,
      "an exclusive queue stops us extending the job, not the job from translating de"
    ).toEqual([
      { collectionSlug: "posts", collectionId: "doc-123", targetLng: "de", jobId: "job-live" },
    ]);
    expect(
      mockPayload.db.updateOne,
      "and nothing may be written to a running job"
    ).not.toHaveBeenCalled();
  });

  it("answers once per locale even if the caller asked for one twice", async () => {
    const { job } = liveJob(["de"]);
    mockPayload.find.mockResolvedValue({ docs: [job] });

    const result = await runner.enqueue([input({ targetLng: "de" }), input({ targetLng: "de" })]);

    expect(result, "planEnqueue dedupes; the answer must agree with it").toHaveLength(1);
  });

  it("reports a numeric row id as a string, like the queued path does", async () => {
    const { job, absorb } = liveJob(["de"]);
    job.id = 1;
    mockPayload.find.mockResolvedValue({ docs: [job] });
    mockPayload.db.updateOne.mockImplementation(async () => absorb("fr"));

    const result = await runner.enqueue([input({ targetLng: "fr" })]);

    expect(
      result?.[0]?.jobId,
      "an autoincrement id must not leak as a number where the type promises a string"
    ).toBe("1");
  });

  it("splits the answer when some locales join the live job and the rest need a new one", async () => {
    const { job, absorb } = liveJob(["de"]);
    mockPayload.find.mockResolvedValue({ docs: [job] });
    mockPayload.db.updateOne.mockImplementation(async () => absorb("fr"));

    const result = await runner.enqueue([
      input({ targetLng: "fr" }),
      input({ targetLng: "it", strategy: "skip_existing" }),
    ]);

    const byLocale = Object.fromEntries(result?.map((e) => [e.targetLng, e.jobId]) ?? []);
    expect(byLocale.fr).toBe("job-live");
    expect(byLocale.it, "a different request shape cannot share the live job").toBe("job-new");
  });

  it("queues everything afresh when the host finishes between the plan and the write", async () => {
    const { job, absorb } = liveJob(["de"]);
    const finished = { ...job, completedAt: "2026-01-01T00:01:00Z" };
    planSeesThenRereadSees(job, finished);
    mockPayload.db.updateOne.mockImplementation(async () => absorb("fr"));

    const result = await runner.enqueue([input({ targetLng: "de" }), input({ targetLng: "fr" })]);

    const byLocale = Object.fromEntries(result?.map((e) => [e.targetLng, e.jobId]) ?? []);
    expect(
      byLocale,
      "the host is finished and will run neither locale again — naming it for de would promise a re-translation nothing performs"
    ).toEqual({ de: "job-new", fr: "job-new" });
  });

  it("queues everything afresh when the host gives up between the plan and the write", async () => {
    const { job, absorb } = liveJob(["de"]);
    const exhausted = { ...job, hasError: true, input: job.input };
    planSeesThenRereadSees(job, exhausted);
    mockPayload.db.updateOne.mockImplementation(async () => absorb("fr"));

    const result = await runner.enqueue([input({ targetLng: "de" }), input({ targetLng: "fr" })]);

    const byLocale = Object.fromEntries(result?.map((e) => [e.targetLng, e.jobId]) ?? []);
    expect(
      byLocale,
      "a job that ran out of retries is as unreachable as a finished one — Payload's picker takes neither"
    ).toEqual({ de: "job-new", fr: "job-new" });
  });

  it("answers with nothing rather than a wrong id when the queue call reveals none", async () => {
    mockPayload.jobs.queue.mockResolvedValue(undefined);

    const result = await runner.enqueue([input({ targetLng: "de" })]);

    expect(result, "a missing id must not be invented").toEqual([]);
  });
});
