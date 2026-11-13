import { describe, expect, it } from "vitest";

import {
  applyDrawerSave,
  initialDrawerDraftState,
  isAutosaveEvent,
  pickDrawerDraft,
  shouldDiscardDraft,
} from "../../src/admin/Create/drawerDraft.js";

const autosave = { context: { getDocPermissions: false, incrementVersionCount: true } };

describe("the create drawer's draft", () => {
  it("tells an autosave from a save the editor asked for", () => {
    expect(isAutosaveEvent(autosave)).toBe(true);
    expect(isAutosaveEvent({ context: { incrementVersionCount: false } })).toBe(true);
    expect(isAutosaveEvent({})).toBe(false);
    expect(isAutosaveEvent({ context: null })).toBe(false);
  });

  it("discards the draft of a drawer nobody saved, however often it autosaved", () => {
    const state = applyDrawerSave(applyDrawerSave(initialDrawerDraftState, autosave), autosave);

    expect(shouldDiscardDraft(initialDrawerDraftState)).toBe(true);
    expect(shouldDiscardDraft(state)).toBe(true);
  });

  it("keeps the draft once the editor has saved, whatever the autosave does after", () => {
    const saved = applyDrawerSave(applyDrawerSave(initialDrawerDraftState, autosave), {});

    expect(shouldDiscardDraft(saved)).toBe(false);
    expect(shouldDiscardDraft(applyDrawerSave(saved, autosave))).toBe(false);
  });

  it("picks the one draft that carries the segment the drawer was given", () => {
    const found = [
      { _status: "published", id: 1, slug: "new-page" },
      { _status: "draft", id: 2, slug: "other" },
      { _status: "draft", id: 3, slug: "new-page" },
    ];

    expect(pickDrawerDraft(found, { segmentField: "slug", slug: "new-page" })).toBe(3);
  });

  it("guesses nothing when no draft or several match", () => {
    const twice = [
      { _status: "draft", id: 3, slug: "new-page" },
      { _status: "draft", id: 4, slug: "new-page" },
    ];

    expect(pickDrawerDraft([], { segmentField: "slug", slug: "new-page" })).toBeNull();
    expect(pickDrawerDraft(twice, { segmentField: "slug", slug: "new-page" })).toBeNull();
    expect(
      pickDrawerDraft([{ _status: "draft", id: 5, slug: "renamed" }], {
        segmentField: "slug",
        slug: "new-page",
      })
    ).toBeNull();
  });
});
