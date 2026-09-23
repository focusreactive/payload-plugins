import { Media } from "@/components/media";
import { cn } from "@/components/utils";

import type {
  PhotoPanelObjectPosition,
  PhotoPanelOverlayIntensity,
  PhotoPanelProps,
  PhotoPanelScrim,
} from "./types";

/**
 * Photographic scrims rather than tokens - multi-stop gradients tuned per panel have no token
 * form. The `hero` three match `HeroSpotlight/ui/index.tsx`'s `TOP_LEFT_GLOW` / `BOTTOM_LEFT_GLOW`
 * / `BOTTOM_SCRIM` constants exactly; that block predates this shared primitive and is a call site
 * to migrate onto it, not a second source of truth.
 */
const HERO_TOP_LEFT_GLOW =
  "radial-gradient(120% 100% at 0% 0%, rgba(0,0,0,0.3) 0%, rgba(0,0,0,0.12) 45%, rgba(0,0,0,0) 78%)";
const HERO_BOTTOM_LEFT_GLOW =
  "radial-gradient(110% 100% at 0% 100%, rgba(0,0,0,0.28) 0%, rgba(0,0,0,0.1) 48%, rgba(0,0,0,0) 80%)";
const HERO_BOTTOM_SCRIM =
  "linear-gradient(to top, rgba(0,0,0,0.3) 0%, rgba(0,0,0,0.16) 28%, rgba(0,0,0,0) 52%)";
const DIAGONAL_160_SCRIM =
  "linear-gradient(160deg, rgba(0,0,0,0.44) 0%, rgba(0,0,0,0.26) 42%, rgba(0,0,0,0.36) 100%)";
const DIAGONAL_120_SCRIM =
  "linear-gradient(120deg, rgba(0,0,0,0.52) 0%, rgba(0,0,0,0.34) 55%, rgba(0,0,0,0.42) 100%)";

const OVERLAY_INTENSITY_OPACITY: Record<PhotoPanelOverlayIntensity, number> = {
  medium: 0.14,
  none: 0,
  subtle: 0.06,
};

/** Mirrors `HeroSpotlight/Component.tsx`'s `FOCAL_POINT_OBJECT_POSITIONS` - see `types.ts`. */
const OBJECT_POSITIONS: Record<PhotoPanelObjectPosition, string> = {
  bottom: "center 85%",
  centre: "center 50%",
  "lower-middle": "center 68%",
  top: "center 15%",
  "upper-middle": "center 42%",
};

interface HeroScrimProps {
  overlayOpacity: number;
  /** Rounds the two full-bleed layers when the panel itself isn't clipping (see `PhotoPanelProps.clip`). */
  radiused: boolean;
}

function HeroScrim({ overlayOpacity, radiused }: HeroScrimProps) {
  return (
    <>
      <div
        aria-hidden
        className="pointer-events-none absolute top-0 left-0 h-[56%] w-[min(62%,900px)]"
        style={{ backgroundImage: HERO_TOP_LEFT_GLOW }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute bottom-0 left-0 h-[38%] w-[min(56%,760px)]"
        style={{ backgroundImage: HERO_BOTTOM_LEFT_GLOW }}
      />
      <div
        aria-hidden
        className={cn("pointer-events-none absolute inset-0", radiused && "rounded-2xl")}
        style={{ backgroundImage: HERO_BOTTOM_SCRIM }}
      />
      {overlayOpacity > 0 && (
        <div
          aria-hidden
          className={cn("pointer-events-none absolute inset-0 bg-black", radiused && "rounded-2xl")}
          style={{ opacity: overlayOpacity }}
        />
      )}
    </>
  );
}

interface DiagonalScrimProps {
  gradient: string;
  overlayOpacity: number;
  radiused: boolean;
}

function DiagonalScrim({ gradient, overlayOpacity, radiused }: DiagonalScrimProps) {
  return (
    <>
      <div
        aria-hidden
        className={cn("pointer-events-none absolute inset-0", radiused && "rounded-2xl")}
        style={{ backgroundImage: gradient }}
      />
      {overlayOpacity > 0 && (
        <div
          aria-hidden
          className={cn("pointer-events-none absolute inset-0 bg-black", radiused && "rounded-2xl")}
          style={{ opacity: overlayOpacity }}
        />
      )}
    </>
  );
}

const DIAGONAL_SCRIM_GRADIENTS: Record<Exclude<PhotoPanelScrim, "hero">, string> = {
  "diagonal-120": DIAGONAL_120_SCRIM,
  "diagonal-160": DIAGONAL_160_SCRIM,
};

/**
 * The dark photographic ground the concept uses as a full-section background three times - the
 * hero, the pricing panel, and the free-ebook banner. Sets no height of its own; callers size it,
 * because the three instances differ (a viewport-driven hero vs. content-driven banners).
 */
export function PhotoPanel({
  image,
  clip = true,
  scrim = "hero",
  overlayIntensity = "subtle",
  objectPosition = "centre",
  className,
  children,
}: PhotoPanelProps) {
  const hasImage = typeof image?.data?.src === "string" && image.data.src.length > 0;
  const overlayOpacity = OVERLAY_INTENSITY_OPACITY[overlayIntensity];
  // Unclipped is the ebook shape: no ancestor may clip its overhanging book cover, so there is no
  // container-level ground either - the concept never sets one there, only on the two clipped panels.
  const radiused = !clip;

  return (
    <div
      className={cn(
        "relative w-full",
        clip && "overflow-hidden rounded-2xl bg-primary-soft",
        className
      )}
    >
      {hasImage && image && (
        <Media
          {...image.data}
          className="absolute inset-0"
          imageProps={{
            ...image.imageProps,
            className: cn("object-cover", radiused && "rounded-2xl", image.imageProps?.className),
            fill: true,
            style: {
              objectPosition: OBJECT_POSITIONS[objectPosition],
              ...image.imageProps?.style,
            },
          }}
          visualEditing={image.visualEditing}
        />
      )}

      {scrim === "hero" ? (
        <HeroScrim overlayOpacity={overlayOpacity} radiused={radiused} />
      ) : (
        <DiagonalScrim
          gradient={DIAGONAL_SCRIM_GRADIENTS[scrim]}
          overlayOpacity={overlayOpacity}
          radiused={radiused}
        />
      )}

      {children && <div className="relative">{children}</div>}
    </div>
  );
}
