import { Logos } from "@/components/ui";
import { AlignVariant } from "@/components/ui/sections/logos/types";
import type { ILogoItem } from "@/components/ui/sections/logos/types";

import { resolveLocale } from "@/core/lib/resolveLocale";
import { prepareImageProps } from "@/lib/adapters/prepareImageProps";
import { prepareLinkProps } from "@/lib/adapters/prepareLinkProps";
import type { LogosInlineBlock } from "@/payload-types";

export const LogosInlineComponent: React.FC<LogosInlineBlock> = async ({ items, alignVariant }) => {
  const locale = await resolveLocale();

  const logoItems: ILogoItem[] = (items ?? []).map((item) => ({
    image: prepareImageProps(item.image),
    link: item.link ? prepareLinkProps(item.link, locale) : undefined,
  }));

  return (
    <div className="prose-embedded-block">
      <Logos items={logoItems} alignVariant={(alignVariant as AlignVariant) ?? AlignVariant.Center} />
    </div>
  );
};
