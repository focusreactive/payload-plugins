import type { BuildAdminEditUrl } from "../../shared/buildAdminEditUrl.js";
import type { Marker } from "./markerExtractor.js";

import { spreadVeIdentity } from "../../shared/shared.js";
import { documentAddressOf } from "../../shared/veDocument.js";
import { buildOverlayClickHandler } from "../overlayClickHandler.js";
import { DATA_VE_TARGET_ATTR, OUTLINE_STYLE } from "./constants.js";

export type TargetConfig = {
  path: string;
  key?: string;
  locale?: string;
  documentAddress: string;
  href: string;
  clickHandler: (event: MouseEvent) => void;
  originalOutline: string;
  paintOutline: boolean;
};

export type TargetRegistryCtx = {
  buildAdminEditUrl: BuildAdminEditUrl;
  adminOrigin: string;
  adminBasePath: string;
  locale?: string;
  mode: "always" | "hover";
};

export interface TargetRegistry {
  upsert(target: HTMLElement, marker: Marker, ctx: TargetRegistryCtx): TargetConfig;
  get(target: HTMLElement): TargetConfig | undefined;
  has(target: HTMLElement): boolean;
  targets(): HTMLElement[];
  remove(target: HTMLElement): void;
  disposeAll(): void;
}

export function createTargetRegistry(): TargetRegistry {
  const configs = new Map<HTMLElement, TargetConfig>();

  const buildBindings = (marker: Marker, ctx: TargetRegistryCtx) => {
    const locale = marker.locale ?? ctx.locale;
    const href = ctx.buildAdminEditUrl({
      ...spreadVeIdentity(marker),
      locale,
      adminBasePath: ctx.adminBasePath,
    });
    const clickHandler = buildOverlayClickHandler({
      ...spreadVeIdentity(marker),
      key: marker.key,
      href,
      adminOrigin: ctx.adminOrigin,
      locale,
    });
    return { href, clickHandler };
  };

  const clearTarget = (target: HTMLElement, originalOutline: string) => {
    target.style.outline = originalOutline;
    target.removeAttribute(DATA_VE_TARGET_ATTR);
  };

  return {
    upsert(target, marker, ctx) {
      const existing = configs.get(target);
      const { href, clickHandler } = buildBindings(marker, ctx);
      target.setAttribute(DATA_VE_TARGET_ATTR, marker.path);
      const originalOutline = existing?.originalOutline ?? target.style.outline;
      const isFirstBinding = !existing;
      if (ctx.mode === "always" && isFirstBinding) {
        target.style.outline = OUTLINE_STYLE;
      }
      const next: TargetConfig = {
        path: marker.path,
        key: marker.key,
        locale: marker.locale,
        documentAddress: documentAddressOf(marker),
        href,
        clickHandler,
        originalOutline,
        paintOutline: ctx.mode === "hover",
      };
      configs.set(target, next);
      return next;
    },
    get(target) {
      return configs.get(target);
    },
    has(target) {
      return configs.has(target);
    },
    targets: () => [...configs.keys()],
    remove(target) {
      const config = configs.get(target);
      if (!config) return;
      clearTarget(target, config.originalOutline);
      configs.delete(target);
    },
    disposeAll() {
      for (const [target, config] of configs) {
        clearTarget(target, config.originalOutline);
      }
      configs.clear();
    },
  };
}
