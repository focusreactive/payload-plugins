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
    className: "w-auto h-7.5",
  };

  return logo.data.kind === "video"
    ? { ...logo.data, visualEditing: logo.visualEditing, imageProps }
    : { ...logo.data, visualEditing: logo.visualEditing, imageProps, width: 120, height: 30 };
}

export function Brand({ brand }: BrandProps) {
  return (
    <NextLink href={brand.href}>
      {brand.logo && <Media {...toLogoMediaProps(brand.logo)} />}
    </NextLink>
  );
}
