import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { bootTestPayload } from "./bootTestPayload";
import type { TestPayload } from "./bootTestPayload";

// bootTestPayload caches one Payload per process, so a boot with different options needs its own file.

const tr = (locale: string, text: string) => `${locale}:${text}`;

describe("what auto-translate still does to a field nobody edited", () => {
  let auto: TestPayload;

  beforeAll(async () => {
    auto = await bootTestPayload({ autoTranslate: { targets: ["de"] } });
  });
  afterAll(async () => {
    await auto?.cleanup();
  });

  it("still overwrites a hand-corrected target when a sibling's source changes (overwrite, the default)", async () => {
    const made = await auto.payload.create({
      collection: "docs",
      locale: "en",
      data: { _status: "published", title: "Auto title", note: "Auto note" },
    });
    const id = String(made.id);

    await auto.payload.update({
      collection: "docs",
      id,
      locale: "de",
      data: { _status: "published", title: "KORRIGIERT" },
    });
    await auto.payload.update({
      collection: "docs",
      id,
      locale: "en",
      data: { _status: "published", title: "Auto title", note: "Auto note, rewritten" },
    });

    const de = (await auto.payload.findByID({ collection: "docs", id, locale: "de" })) as Record<
      string,
      unknown
    >;
    expect(de.note).toBe(tr("de", "Auto note, rewritten"));
    expect(de.title, "the correction is lost — this is the limitation, not the fix").toBe(
      tr("de", "Auto title")
    );
  });
});
