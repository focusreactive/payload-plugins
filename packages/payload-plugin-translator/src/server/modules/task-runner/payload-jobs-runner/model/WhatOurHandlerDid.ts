/**
 * How far this plugin's own handler got with one locale. No entry is the third answer: it never
 * ran, so the failure came from the queue before this plugin was reached and the text is not
 * written. Kept per locale, because an entry saying the work is done outlives the locale that set
 * it and the next one must not read it.
 */
export type OurHandlerDid = { kind: "translated" } | { kind: "failed"; error: unknown };

export class WhatOurHandlerDid {
  private readonly byJob = new WeakMap<object, Map<string, OurHandlerDid>>();

  note(job: object | undefined, targetLng: string, did: OurHandlerDid): void {
    if (!job) return;
    const forJob = this.byJob.get(job) ?? new Map<string, OurHandlerDid>();
    forJob.set(targetLng, did);
    this.byJob.set(job, forJob);
  }

  forLocale(job: object, targetLng: string): OurHandlerDid | undefined {
    return this.byJob.get(job)?.get(targetLng);
  }
}
