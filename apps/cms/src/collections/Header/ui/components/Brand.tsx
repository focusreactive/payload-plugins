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
    className: "h-7 w-auto lg:h-8",
    priority: true,
  };

  return logo.data.kind === "video"
    ? { ...logo.data, visualEditing: logo.visualEditing, imageProps }
    : { ...logo.data, visualEditing: logo.visualEditing, imageProps, width: 150, height: 32 };
}

export function Brand({ brand }: BrandProps) {
  return (
    <NextLink
      href={brand.href}
      aria-label={brand.label ? `${brand.label} — home` : "Home"}
      className="flex min-h-11 shrink-0 items-center"
    >
      {brand.logo ? (
        <Media {...toLogoMediaProps(brand.logo)} />
      ) : (
        <span className="text-xl font-bold text-ct-green-600">{brand.label}</span>
      )}
    </NextLink>
  );
}
