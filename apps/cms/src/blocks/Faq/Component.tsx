import { FaqJsonLd } from "@/core/seo/components";
import { RichText, SectionContainer } from "@/core/ui";
import type { AccordionItemData } from "@/core/ui/components/Accordion";
import { Accordion } from "@/core/ui/components/Accordion";
import { SectionHeader } from "@repo/ui";
import type { FaqBlock as FaqBlockProps } from "@/payload-types";

export const FaqBlockComponent: React.FC<FaqBlockProps> = ({ badge, heading, lead, items, section, id, ...rest }) => {
  const accordionItems: AccordionItemData[] = (items ?? []).map((item, index) => ({
    content: <RichText content={item.answer} />,
    id: item.id ?? String(index),
    trigger: item.question,
  }));

  const firstId = accordionItems[0]?.id ?? null;

  return (
    <SectionContainer sectionData={{ ...section, id }}>
      <FaqJsonLd faq={{ badge, heading, lead, items, section, id, ...rest } as FaqBlockProps} />
      <div className="grid grid-cols-1 items-start gap-[clamp(32px,6vw,80px)] md:grid-cols-[0.8fr_1.2fr]">
        <SectionHeader badge={badge} heading={heading} headingSize="h-section" lead={lead} />

        <Accordion items={accordionItems} defaultOpenId={firstId} />
      </div>
    </SectionContainer>
  );
};
