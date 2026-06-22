import NextLink from "next/link";

import type { HeaderBrand } from "../types";
import Image from "next/image";

interface BrandProps {
  brand: HeaderBrand;
}

export function Brand({ brand }: BrandProps) {
  return <NextLink href={brand.href}>{brand.logo && <Image className="w-full min-w-20 max-w-30" width={120} height={40} alt={brand.logo.alt} src={brand.logo.src} />}</NextLink>;
}
