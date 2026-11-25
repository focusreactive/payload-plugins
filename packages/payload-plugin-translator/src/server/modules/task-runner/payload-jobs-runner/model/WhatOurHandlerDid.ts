/**
 * How far this plugin's own handler got with one locale. No entry is the fourth answer and means
 * one thing only — the handler was never reached, so the queue failed before it and no text was
 * written. Kept per locale, because an entry saying the work is done outlives the locale that set
 * it and the next one must not read it.
 */
export type OurHandlerDid =
  | { kind: "started" }
  | { kind: "translated" }
  | { kind: "failed"; error: unknown };

export class WhatOurHandlerDid {
  private readonly byJob = new WeakMap<object, Map<string, OurHandlerDid>>();

  note(job: object, targetLng: string, did: OurHandlerDid): void {
    const forJob = this.byJob.get(job) ?? new Map<string, OurHandlerDid>();
    forJob.set(targetLng, did);
    this.byJob.set(job, forJob);
  }

  forLocale(job: object, targetLng: string): OurHandlerDid | undefined {
    return this.byJob.get(job)?.get(targetLng);
  }
}
