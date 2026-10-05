import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { bootTestPayload } from "./bootTestPayload";
import type { TestPayload } from "./bootTestPayload";

// bootTestPayload caches one Payload per process, so a boot with different options needs its own file.

const tr = (locale: string, text: string) => `${locale}:${text}`;

describe("auto-translate on a collection that chose skip_existing", () => {
  let auto: TestPayload;

  beforeAll(async () => {
    auto = await bootTestPayload({
      autoTranslate: { targets: ["de"], strategy: "skip_existing" },
    });
  });
  afterAll(async () => {
    await auto?.cleanup();
  });

  it("refreshes the leaf whose source moved and leaves a hand correction alone", async () => {
    const made = await auto.payload.create({
      collection: "docs",
      locale: "en",
      data: { _status: "published", title: "Skip title", note: "Skip note" },
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
      data: { _status: "published", title: "Skip title", note: "Skip note, rewritten" },
    });

    const de = (await auto.payload.findByID({ collection: "docs", id, locale: "de" })) as Record<
      string,
      unknown
    >;
    expect(de.note, "its source moved").toBe(tr("de", "Skip note, rewritten"));
    expect(de.title, "its source did not — and here the strategy is honoured").toBe("KORRIGIERT");
  });
});
