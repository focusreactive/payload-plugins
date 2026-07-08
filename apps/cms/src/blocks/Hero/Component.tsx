import { Hero } from "./ui";
import { ButtonSize } from "@/components/button/types";
import React from "react";

import { resolveLocale } from "@/lib/utils/resolveLocale";
import { SectionContainer } from "@/components/shared";
import { prepareMediaProps } from "@/lib/adapters/prepareMediaProps";
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
        image={prepareMediaProps(image)}
        links={(actions ?? []).map((action) => ({
          ...prepareLinkProps(action, locale),
          size: ButtonSize.Large,
        }))}
      />
    </SectionContainer>
  );
}
