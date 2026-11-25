import { Hero } from "./ui";
import { ButtonSize } from "@/components/button/types";
import React from "react";

import { resolveLocale } from "@/lib/utils/resolveLocale";
import { Container } from "@/components/shared";
import { prepareMediaProps } from "@/lib/adapters/prepareMediaProps";
import { prepareLinkProps } from "@/lib/adapters/prepareLinkProps";
import type { HeroBlock } from "@/payload-types";

type Props = HeroBlock;

export async function HeroBlockComponent({ variant, heading, actions, image, section, id }: Props) {
  const locale = await resolveLocale();

  // The hero owns its shell instead of using SectionContainer: it slides under the
  // sticky header, fills the first viewport and rounds off its bottom corners.
  return (
    <section
      id={id ?? undefined}
      className="relative isolate -mt-header flex min-h-[clamp(640px,62.5vw,900px)] flex-col overflow-clip rounded-b-2xl border-b border-border bg-ink-950 pt-header"
    >
      <Container
        containerData={{ maxWidth: section?.maxWidth, paddingX: section?.paddingX }}
        className="flex flex-1 items-center py-14 md:py-20"
      >
        <Hero
          variant={variant}
          heading={heading}
          image={prepareMediaProps(image)}
          links={(actions ?? []).map((action) => ({
            ...prepareLinkProps(action.link, locale),
            size: ButtonSize.Large,
          }))}
        />
      </Container>
    </section>
  );
}
