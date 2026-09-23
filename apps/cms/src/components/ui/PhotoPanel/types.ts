import type { ReactNode } from "react";

import type { PreparedMedia } from "@/components/media";

/**
 * The named focal points from `HeroSpotlight/Component.tsx`'s `FOCAL_POINT_OBJECT_POSITIONS`,
 * reproduced here so this primitive stays import-free from `src/blocks/` while keeping the same
 * vocabulary an editor already knows.
 */
export type PhotoPanelObjectPosition =
  | "top"
  | "upper-middle"
  | "centre"
  | "lower-middle"
  | "bottom";

/**
 * `hero` is the four-layer corner-anchored glow from `02-hero.html`. `diagonal-160` and
 * `diagonal-120` are the single full-bleed gradients from the pricing slice and
 * the ebook slice, named by their angle since neither concept slice names them.
 */
export type PhotoPanelScrim = "hero" | "diagonal-160" | "diagonal-120";

/**
 * The extra flat-black wash on top of the scrim, bound to an editor-facing knob in the concept
 * (`{{ extraOverlay }}`) - the same role `photoDarkening` plays on `HeroSpotlight`.
 */
export type PhotoPanelOverlayIntensity = "none" | "subtle" | "medium";

export interface PhotoPanelProps {
  /** Pure-rendering primitive: pass the already-resolved media, never a Payload upload field. */
  image?: PreparedMedia | null;
  /**
   * True clips the image and overlays to the panel's own rounded corners (the hero and
   * pricing slices). False moves the radius onto the image and overlay
   * individually instead, and drops the container's ground colour - the ebook slice's shape,
   * because its book cover is deliberately positioned to overhang the panel edge and an
   * `overflow-hidden` ancestor would clip it.
   */
  clip?: boolean;
  scrim?: PhotoPanelScrim;
  overlayIntensity?: PhotoPanelOverlayIntensity;
  objectPosition?: PhotoPanelObjectPosition;
  /** Stacked above every overlay layer. */
  children?: ReactNode;
  className?: string;
}
