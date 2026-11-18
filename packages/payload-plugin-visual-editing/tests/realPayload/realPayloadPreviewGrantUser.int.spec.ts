import type { Access, Payload } from "payload";

import { createLocalReq } from "payload";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { signPreviewGrant } from "../../src/server/previewGrant";
import { VE_UNSAVED_RICH_TEXT_PATH } from "../../src/shared/protocol";
import { documentAddressOf } from "../../src/shared/veDocument";

import { START_TIMEOUT_MS, startRealPayload } from "../support/realPayload";
import { page, seedPages } from "../support/richTextPages";
import { EDITOR } from "../support/unsavedRichTextRequests";

describe("the user a preview grant reads as", () => {
  let payload: Payload;
  let teamOfReader: unknown = null;

  const rememberTheTeam: Access = ({ req }) => {
    teamOfReader = req.user?.team;
    return true;
  };

  beforeAll(async () => {
    payload = await startRealPayload({
      canRead: rememberTheTeam,
      name: "preview-grant-user-depth",
      plugin: { instantPreview: true },
      userDepth: 1,
    });
  }, START_TIMEOUT_MS);

  afterAll(() => payload.destroy());

  it("is loaded with the depth of its collection, as Payload loads the user of a session", async () => {
    const pages = await seedPages(payload);
    const team = await payload.create({ collection: "authors", data: { name: "Editors" } });
    const user = await payload.create({
      collection: "users",
      data: { ...EDITOR, team: team.id },
    });
    const grant = signPreviewGrant(
      {
        document: documentAddressOf(page(pages.landing)),
        expiresAt: Date.now() + 60_000,
        userCollection: "users",
        userId: user.id,
      },
      payload.secret
    );
    const endpoint = payload.config.endpoints.find(
      (candidate) => candidate.path === VE_UNSAVED_RICH_TEXT_PATH
    );
    const req = await createLocalReq({}, payload);
    req.text = async () =>
      JSON.stringify({ grant, request: { field: { ...page(pages.landing), key: "body" } } });

    const response = (await endpoint!.handler(req)) as Response;

    expect(((await response.json()) as { value: unknown }).value).not.toBeNull();
    expect(teamOfReader).toMatchObject({ id: team.id });
  });
});
