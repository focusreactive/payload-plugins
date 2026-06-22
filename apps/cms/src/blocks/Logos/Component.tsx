import { Logos } from "./ui";
import { AlignVariant } from "./ui/types";
import type { ILogoItem } from "./ui/types";
import React from "react";

import { resolveLocale } from "@/core/lib/resolveLocale";
import { SectionContainer } from "@/components/shared";
import { prepareImageProps } from "@/lib/adapters/prepareImageProps";
import { prepareLinkProps } from "@/lib/adapters/prepareLinkProps";
import type { LogosBlock } from "@/payload-types";

export const LogosBlockComponent: React.FC<LogosBlock> = async ({
  items,
  alignVariant,
  label,
  section,
  id,
}) => {
  const locale = await resolveLocale();

  const logoItems: ILogoItem[] = (items ?? []).map(({ image, link }) => {
    const { image: rawImage } = image;
    const width = typeof rawImage === "number" ? 120 : (rawImage.width ?? 120);
    const height = typeof rawImage === "number" ? 40 : (rawImage.height ?? 40);

    return {
      image: prepareImageProps({
        ...image,
        fill: false,
        width,
        height,
      }),
      link: link ? prepareLinkProps(link, locale) : undefined,
    };
  });

  return (
    <SectionContainer sectionData={{ ...section, id }} className="overflow-x-visible!">
      <Logos
        items={logoItems}
        alignVariant={(alignVariant as AlignVariant) ?? AlignVariant.Center}
        label={label}
      />
    </SectionContainer>
  );
};
