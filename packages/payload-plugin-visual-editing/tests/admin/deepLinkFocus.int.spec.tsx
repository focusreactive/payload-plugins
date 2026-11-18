import type { FormState } from "payload";
import type { ReactNode } from "react";
import type { Root } from "react-dom/client";

import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { OpenFormAnnouncer } from "../../src/admin/openField/OpenFormAnnouncer";
import { OPEN_FORM_BUDGET_MS } from "../../src/admin/openField/openForms";
import { VisualEditingBridgeProvider } from "../../src/admin/VisualEditingBridgeProvider";

type DocumentInfo = { collectionSlug?: string; globalSlug?: string; id?: number | string };

const admin = vi.hoisted(() => ({
  documentInfo: {} as DocumentInfo,
  expandAndFocus: vi.fn(),
  getEntityConfig: () => null,
}));

vi.mock("@payloadcms/ui", () => ({
  useConfig: () => ({ getEntityConfig: admin.getEntityConfig }),
  useDocumentInfo: () => admin.documentInfo,
  useForm: () => ({ getFields: () => ({}) as FormState }),
}));

vi.mock("../../src/admin/expandAndFocus", () => ({ expandAndFocus: admin.expandAndFocus }));

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

const SLOW_ADMIN_MS = 6000;

const originalLocation = window.location;

let root: Root | null = null;

const openAdminAt = (pathname: string, search: string): void => {
  const url = new URL(`http://localhost:3000${pathname}${search}`);
  Object.defineProperty(window, "location", {
    configurable: true,
    value: { ...originalLocation, href: url.toString(), origin: url.origin, pathname },
  });
};

const renderAdmin = (documentView: ReactNode = null): void => {
  if (!root) {
    const container = document.createElement("div");
    document.body.append(container);
    root = createRoot(container);
  }
  act(() => {
    root?.render(<VisualEditingBridgeProvider>{documentView}</VisualEditingBridgeProvider>);
  });
};

const pass = (ms: number) => act(() => vi.advanceTimersByTimeAsync(ms));

beforeEach(() => {
  vi.useFakeTimers();
  admin.expandAndFocus.mockReset();
  admin.documentInfo = {};
});

afterEach(() => {
  act(() => root?.unmount());
  root = null;
  vi.useRealTimers();
  Object.defineProperty(window, "location", { configurable: true, value: originalLocation });
});

describe("a link to the admin with a field to focus", () => {
  it("focuses the field once the form of the document is open, however long that takes", async () => {
    openAdminAt("/admin/collections/pages/7", "?veFocus=hero.title");
    renderAdmin();

    await pass(SLOW_ADMIN_MS);
    expect(admin.expandAndFocus).not.toHaveBeenCalled();

    admin.documentInfo = { collectionSlug: "pages", id: 7 };
    renderAdmin(<OpenFormAnnouncer />);
    await pass(0);

    expect(admin.expandAndFocus).toHaveBeenCalledTimes(1);
    expect(admin.expandAndFocus).toHaveBeenCalledWith([], "field-hero__title");
  });

  it("focuses the field at once when the form is open before the bridge looks", async () => {
    openAdminAt("/admin/globals/header", "?veFocus=title");
    admin.documentInfo = { globalSlug: "header" };
    renderAdmin(<OpenFormAnnouncer />);
    await pass(0);

    expect(admin.expandAndFocus).toHaveBeenCalledWith([], "field-title");
  });

  it("does not take the form of another document for the one in the link", async () => {
    openAdminAt("/admin/collections/pages/7", "?veFocus=title");
    admin.documentInfo = { collectionSlug: "media", id: 7 };
    renderAdmin(<OpenFormAnnouncer />);

    await pass(SLOW_ADMIN_MS);

    expect(admin.expandAndFocus).not.toHaveBeenCalled();
  });

  it("keeps the field in the address until the walk to it ends, so an admin that mounts again starts it again", async () => {
    const replaceState = vi
      .spyOn(window.history, "replaceState")
      .mockImplementation(() => undefined);
    const walk = { end: (): void => undefined };
    admin.expandAndFocus.mockReturnValue(
      new Promise<void>((resolve) => {
        walk.end = resolve;
      })
    );
    openAdminAt("/admin/collections/pages/7", "?veFocus=hero.title&locale=en");
    admin.documentInfo = { collectionSlug: "pages", id: 7 };
    renderAdmin(<OpenFormAnnouncer />);
    await pass(SLOW_ADMIN_MS);

    expect(admin.expandAndFocus).toHaveBeenCalledTimes(1);
    expect(replaceState).not.toHaveBeenCalled();

    walk.end();
    await pass(0);

    expect(replaceState).toHaveBeenCalledWith(
      null,
      "",
      "http://localhost:3000/admin/collections/pages/7?locale=en"
    );
    replaceState.mockRestore();
  });

  it("walks to the field once when the bridge looks again while the walk runs", async () => {
    admin.expandAndFocus.mockReturnValue(new Promise<void>(() => undefined));
    openAdminAt("/admin/collections/pages/7", "?veFocus=hero.title");
    admin.documentInfo = { collectionSlug: "pages", id: 7 };
    renderAdmin(<OpenFormAnnouncer />);
    await pass(0);

    admin.getEntityConfig = () => null;
    renderAdmin(<OpenFormAnnouncer />);
    await pass(SLOW_ADMIN_MS);

    expect(admin.expandAndFocus).toHaveBeenCalledTimes(1);
  });

  it("stops waiting for a form that never opens and tries the field once", async () => {
    openAdminAt("/admin/collections/pages/7", "?veFocus=title");
    renderAdmin();

    await pass(OPEN_FORM_BUDGET_MS);

    expect(admin.expandAndFocus).toHaveBeenCalledTimes(1);

    admin.documentInfo = { collectionSlug: "pages", id: 7 };
    renderAdmin(<OpenFormAnnouncer />);
    await pass(SLOW_ADMIN_MS);

    expect(admin.expandAndFocus).toHaveBeenCalledTimes(1);
  });
});
