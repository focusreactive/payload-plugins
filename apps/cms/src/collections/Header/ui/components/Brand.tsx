import NextLink from "next/link";

import { Media } from "@/components/media";
import type { MediaProps, PreparedMedia } from "@/components/media";
import type { HeaderBrand } from "../types";

interface BrandProps {
  brand: HeaderBrand;
}

function toLogoMediaProps(logo: PreparedMedia): MediaProps {
  const imageProps = {
    ...logo.imageProps,
    className: "h-6 w-auto",
  };

  return logo.data.kind === "video"
    ? { ...logo.data, visualEditing: logo.visualEditing, imageProps }
    : { ...logo.data, visualEditing: logo.visualEditing, imageProps, width: 128, height: 24 };
}

export function Brand({ brand }: BrandProps) {
  return (
    <NextLink href={brand.href} aria-label={brand.label} className="inline-flex items-center">
      {brand.logo && <Media {...toLogoMediaProps(brand.logo)} />}
    </NextLink>
  );
}
