import type { BuildAdminEditUrl } from "../buildAdminEditUrl.js";
import type { Marker } from "./markerExtractor.js";

import { spreadVeIdentity } from "../../internal/shared.js";
import { buildOverlayClickHandler } from "../overlayClickHandler.js";
import { DATA_VE_TARGET_ATTR, OUTLINE_STYLE } from "./constants.js";

export type TargetConfig = {
  /** The marker path currently bound to this target. Used by callers to detect path changes
   *  on the same DOM element (the React-reuses-the-node-with-new-content case). */
  path: string;
  href: string;
  clickHandler: (event: MouseEvent) => void;
  originalOutline: string;
  /** Whether the badge owns outline paint/restore for this target. True in hover mode,
   *  false in 'always' mode where the registry already painted the outline. */
  paintOutline: boolean;
};

export type TargetRegistryCtx = {
  buildAdminEditUrl: BuildAdminEditUrl;
  adminOrigin: string;
  adminBasePath: string;
  locale?: string;
  /** 'always' paints outlines on every registered target; 'hover' leaves painting to the badge. */
  mode: "always" | "hover";
};

export interface TargetRegistry {
  /** Register or replace the config bound to `target`. Re-registration keeps the outline snapshot
   *  but produces a fresh href + click handler so a re-rendered element with a new marker path
   *  does not retain stale click targets. */
  upsert(target: HTMLElement, marker: Marker, ctx: TargetRegistryCtx): TargetConfig;
  get(target: HTMLElement): TargetConfig | undefined;
  has(target: HTMLElement): boolean;
  /** Remove the config, restore original outline, and drop the `data-ve-target` attribute. */
  remove(target: HTMLElement): void;
  /** Remove every still-tracked target (used on overlay teardown). */
  disposeAll(): void;
}

export function createTargetRegistry(): TargetRegistry {
  const configs = new Map<HTMLElement, TargetConfig>();

  const buildBindings = (marker: Marker, ctx: TargetRegistryCtx) => {
    const href = ctx.buildAdminEditUrl({
      ...spreadVeIdentity(marker),
      locale: ctx.locale,
      adminBasePath: ctx.adminBasePath,
    });
    const clickHandler = buildOverlayClickHandler({
      ...spreadVeIdentity(marker),
      href,
      adminOrigin: ctx.adminOrigin,
      locale: ctx.locale,
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
      // Always re-write the target attr — `marker.path` may have changed for the same element.
      target.setAttribute(DATA_VE_TARGET_ATTR, marker.path);
      const originalOutline = existing?.originalOutline ?? target.style.outline;
      // 'always' mode paints the outline at registration so every editable shows it persistently.
      // First registration only — re-upserts (marker path change) leave the painted outline intact.
      if (ctx.mode === "always" && !existing) {
        target.style.outline = OUTLINE_STYLE;
      }
      const next: TargetConfig = {
        path: marker.path,
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
