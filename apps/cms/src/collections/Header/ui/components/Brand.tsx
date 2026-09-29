import NextLink from "next/link";

import { Media } from "@/components/media";
import type { MediaProps, PreparedMedia } from "@/components/media";
import type { HeaderBrand } from "../types";

interface BrandProps {
  brand: HeaderBrand;
}

const logoClassName = "block h-[clamp(26px,2.4vw,40px)] w-auto max-w-full";

/**
 * Only used when the upload carries no dimensions of its own. Stating a ratio the logo does not
 * have would crop it, because prepared media defaults to object-fit cover.
 */
const FALLBACK_LOGO_WIDTH_PX = 240;
const FALLBACK_LOGO_HEIGHT_PX = 40;

function toLogoMediaProps(logo: PreparedMedia): MediaProps {
  const imageProps = {
    ...logo.imageProps,
    className: logoClassName,
    fit: "contain" as const,
  };

  if (logo.data.kind === "video") {
    return {
      ...logo.data,
      className: "flex items-center",
      visualEditing: logo.visualEditing,
      imageProps,
    };
  }

  return {
    ...logo.data,
    className: "flex items-center",
    visualEditing: logo.visualEditing,
    imageProps,
    width: logo.data.width ?? FALLBACK_LOGO_WIDTH_PX,
    height: logo.data.height ?? FALLBACK_LOGO_HEIGHT_PX,
  };
}

export function Brand({ brand }: BrandProps) {
  return (
    <NextLink href={brand.href} className="flex min-w-0 shrink items-center">
      {brand.logo && <Media {...toLogoMediaProps(brand.logo)} />}
    </NextLink>
  );
}
