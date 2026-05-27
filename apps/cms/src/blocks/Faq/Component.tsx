import { FaqJsonLd } from "@/core/seo/components";
import { RichText, SectionContainer } from "@/core/ui";
import type { AccordionItemData } from "@/core/ui/components/Accordion";
import { Accordion } from "@/core/ui/components/Accordion";
import { DisplayHeading, Eyebrow } from "@repo/ui";
import type { FaqBlock as FaqBlockProps } from "@/payload-types";

const ArrowIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-4">
    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 19.5l15-15m0 0H8.25m11.25 0v11.25" />
  </svg>
);

export const FaqBlockComponent: React.FC<FaqBlockProps> = ({ heading, items, section, id, ...rest }) => {
  const accordionItems: AccordionItemData[] = (items ?? []).map((item, index) => ({
    content: <RichText content={item.answer} />,
    id: String(index),
    trigger: item.question,
  }));

  return (
    <SectionContainer sectionData={{ ...section, id }}>
      <FaqJsonLd faq={{ heading, items, ...rest } as FaqBlockProps} />
      <div className="mx-auto flex max-w-4xl flex-col gap-10">
        <div className="flex flex-col gap-4">
          <Eyebrow tone="primary">FAQ</Eyebrow>
          {heading && <DisplayHeading text={heading} size="lg" />}
          <p className="max-w-xl text-base text-muted-foreground sm:text-lg">If the answer isn’t here, drop us a line — engineering responds inside a business day.</p>
        </div>

        <div className="rounded-lg bg-gray-950 p-7 text-cream-50 sm:p-9">
          <div className="mb-4">
            <Eyebrow tone="primary" prefix="none">
              Need a human?
            </Eyebrow>
          </div>
          <p className="mb-6 font-display text-2xl italic leading-snug text-cream-50 sm:text-3xl">FocusReactive engineers respond inside 24 hours.</p>
          <a href="#contact" className="inline-flex items-center gap-2 rounded-pill bg-primary px-5 py-2.5 font-medium text-primary-foreground transition-colors hover:bg-orange-700">
            Book a call
            <ArrowIcon />
          </a>
        </div>

        <Accordion items={accordionItems} />
      </div>
    </SectionContainer>
  );
};
