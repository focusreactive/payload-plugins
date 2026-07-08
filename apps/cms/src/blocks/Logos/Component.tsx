import { Logos } from "./ui";
import { AlignVariant } from "./ui/types";
import type { ILogoItem } from "./ui/types";
import React from "react";

import { resolveLocale } from "@/lib/utils/resolveLocale";
import { SectionContainer } from "@/components/shared";
import { prepareMediaProps } from "@/lib/adapters/prepareMediaProps";
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
    const width = typeof rawImage === "number" ? 90 : (rawImage.width ?? 90);
    const height = typeof rawImage === "number" ? 30 : (rawImage.height ?? 30);

    return {
      image: prepareMediaProps({
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
