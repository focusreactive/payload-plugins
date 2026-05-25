import { FaqJsonLd } from "@/core/seo/components";
import { RichText, SectionContainer, SectionHeader } from "@/core/ui";
import type { AccordionItemData } from "@/core/ui/components/Accordion";
import { Accordion } from "@/core/ui/components/Accordion";
import type { FaqBlock as FaqBlockProps } from "@/payload-types";

export const FaqBlockComponent: React.FC<FaqBlockProps> = ({
  heading,
  items,
  section,
  id,
  ...rest
}) => {
  const accordionItems: AccordionItemData[] = (items ?? []).map(
    (item, index) => ({
      content: <RichText content={item.answer} />,
      id: String(index),
      trigger: item.question,
    })
  );

  return (
    <SectionContainer sectionData={{ ...section, id }}>
      <FaqJsonLd faq={{ heading, items, ...rest } as FaqBlockProps} />
      <div className="mx-auto max-w-4xl">
        {heading && <SectionHeader heading={heading} />}
        <Accordion items={accordionItems} />
      </div>
    </SectionContainer>
  );
};
