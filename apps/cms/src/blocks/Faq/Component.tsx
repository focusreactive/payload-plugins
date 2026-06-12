import { SectionHeader } from "@repo/ui";

import { FaqJsonLd } from "@/core/seo/components";
import { RichText, SectionContainer } from "@/core/ui";
import type { AccordionItemData } from "@/core/ui/components/Accordion";
import { Accordion } from "@/core/ui/components/Accordion";
import { prepareSectionHeaderProps } from "@/lib/adapters/prepareSectionHeaderProps";
import type { FaqBlock as FaqBlockProps } from "@/payload-types";

export const FaqBlockComponent: React.FC<FaqBlockProps> = ({ eyebrow, heading, lead, items, section, id, ...rest }) => {
  const accordionItems: AccordionItemData[] = (items ?? []).map((item, index) => ({
    content: <RichText content={item.answer} />,
    id: item.id ?? String(index),
    trigger: item.question,
  }));

  const firstId = accordionItems[0]?.id ?? null;
  const header = prepareSectionHeaderProps({ eyebrow, size: "h-section", subtitle: lead, title: heading });

  return (
    <SectionContainer sectionData={{ ...section, id }}>
      <FaqJsonLd faq={{ eyebrow, heading, lead, items, section, id, ...rest } as FaqBlockProps} />
      <div className="grid grid-cols-1 items-start gap-[clamp(32px,6vw,80px)] md:grid-cols-[0.8fr_1.2fr]">
        {header ? <SectionHeader {...header} /> : <div aria-hidden />}

        <Accordion items={accordionItems} defaultOpenId={firstId} />
      </div>
    </SectionContainer>
  );
};
