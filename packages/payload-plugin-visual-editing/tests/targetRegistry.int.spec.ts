import { beforeEach, describe, expect, it, vi } from "vitest";

import type { Marker } from "../src/client/overlay/markerExtractor";
import type { TargetRegistryCtx } from "../src/client/overlay/targetRegistry";

import { createTargetRegistry } from "../src/client/overlay/targetRegistry";
import { DATA_VE_PATH_ATTR } from "../src/constants";

const buildAdminEditUrl = vi.fn(({ path }: { path: string }) => `/admin/edit?path=${path}`);

const ctx: TargetRegistryCtx = {
  buildAdminEditUrl,
  adminOrigin: "https://admin.example.com",
  adminBasePath: "/admin",
  mode: "hover",
};

const markerA: Marker = {
  path: "hero.title",
  collectionSlug: "pages",
  kind: "collection",
  docId: "p-1",
};
const markerB: Marker = { ...markerA, path: "hero.subtitle" };

describe("createTargetRegistry", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
    buildAdminEditUrl.mockClear();
  });

  it("sets data-ve-target and caches the original outline on first upsert", () => {
    const el = document.createElement("div");
    el.style.outline = "2px dashed red";
    document.body.append(el);
    const registry = createTargetRegistry();

    const config = registry.upsert(el, markerA, ctx);

    expect(el.getAttribute("data-ve-target")).toBe("hero.title");
    expect(config.path).toBe("hero.title");
    expect(config.href).toBe("/admin/edit?path=hero.title");
    expect(config.originalOutline).toBe("2px dashed red");
  });

  it("re-upsert with a new marker path produces a fresh href and click handler (regression #8)", () => {
    const el = document.createElement("div");
    document.body.append(el);
    const registry = createTargetRegistry();

    const first = registry.upsert(el, markerA, ctx);
    const second = registry.upsert(el, markerB, ctx);

    expect(first.path).toBe("hero.title");
    expect(second.path).toBe("hero.subtitle");
    expect(second.href).toBe("/admin/edit?path=hero.subtitle");
    expect(second.clickHandler).not.toBe(first.clickHandler);
    // Re-upsert must keep the original outline snapshot — not reset it to the current (overlay-painted) value.
    expect(second.originalOutline).toBe(first.originalOutline);
    // And the live attribute must reflect the NEW path, not the old one.
    expect(el.getAttribute(DATA_VE_PATH_ATTR)).toBeNull();
    expect(el.getAttribute("data-ve-target")).toBe("hero.subtitle");
  });

  it("remove() restores the outline and drops the attribute", () => {
    const el = document.createElement("div");
    el.style.outline = "1px solid blue";
    document.body.append(el);
    const registry = createTargetRegistry();
    registry.upsert(el, markerA, ctx);

    registry.remove(el);

    expect(registry.has(el)).toBe(false);
    expect(el.hasAttribute("data-ve-target")).toBe(false);
    expect(el.style.outline).toBe("1px solid blue");
  });

  it("disposeAll() restores every tracked target", () => {
    const a = document.createElement("div");
    const b = document.createElement("div");
    a.style.outline = "1px solid red";
    b.style.outline = "2px dotted blue";
    document.body.append(a, b);
    const registry = createTargetRegistry();
    registry.upsert(a, markerA, ctx);
    registry.upsert(b, markerB, ctx);

    registry.disposeAll();

    expect(registry.has(a)).toBe(false);
    expect(registry.has(b)).toBe(false);
    expect(a.hasAttribute("data-ve-target")).toBe(false);
    expect(b.hasAttribute("data-ve-target")).toBe(false);
    expect(a.style.outline).toBe("1px solid red");
    expect(b.style.outline).toBe("2px dotted blue");
  });
});
