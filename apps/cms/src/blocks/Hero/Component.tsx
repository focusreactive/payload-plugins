import { Hero } from "@repo/ui";
import { ButtonSize } from "@repo/ui/components/ui/button/types";
import React from "react";

import { resolveLocale } from "@/core/lib/resolveLocale";
import { SectionContainer } from "@/core/ui";
import { prepareImageProps } from "@/lib/adapters/prepareImageProps";
import { prepareLinkProps } from "@/lib/adapters/prepareLinkProps";
import { prepareRichTextProps } from "@/lib/adapters/prepareRichTextProps";
import type { HeroBlock } from "@/payload-types";

type Props = HeroBlock;

export async function HeroBlockComponent({
  variant,
  eyebrow,
  title,
  richText,
  actions,
  image,
  section,
  id,
}: Props) {
  const locale = await resolveLocale();

  return (
    <SectionContainer sectionData={{ ...section, id }}>
      <Hero
        variant={variant}
        theme={section?.theme ?? null}
        badge={eyebrow}
        title={title ?? ""}
        text={prepareRichTextProps(richText)}
        image={prepareImageProps(image)}
        links={(actions ?? []).map((action) => ({
          ...prepareLinkProps(action, locale),
          size: ButtonSize.Large,
        }))}
      />
    </SectionContainer>
  );
}
