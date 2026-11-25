import type { SerializedEditorState } from "@payloadcms/richtext-lexical/lexical";
import type { SectionHeadingContent } from "@/components/SectionHeading";
import { SectionHeading, hasSectionHeading } from "@/components/SectionHeading";

import { RichText } from "@/components/shared";
import type { AccordionItemData } from "@/components/Accordion";
import { Accordion } from "@/components/Accordion";

export interface FaqSectionItem {
  question: string;
  answer: SerializedEditorState;
  id?: string | null;
}

interface FaqSectionProps {
  heading?: SectionHeadingContent | null;
  items?: FaqSectionItem[] | null;
}

export function FaqSection({ heading, items }: FaqSectionProps) {
  const accordionItems: AccordionItemData[] = (items ?? []).map((item, index) => ({
    content: <RichText content={item.answer} />,
    id: item.id ?? String(index),
    trigger: item.question,
  }));

  const firstId = accordionItems[0]?.id ?? null;

  return (
    <div className="grid grid-cols-1 items-start gap-x-gridGap gap-y-10 lg:grid-cols-12">
      {hasSectionHeading(heading) ? (
        <SectionHeading {...heading} size="h-section" className="gap-8 lg:col-span-4" />
      ) : (
        <div aria-hidden className="lg:col-span-4" />
      )}
      <Accordion
        items={accordionItems}
        defaultOpenId={firstId}
        triggerHeadingLevel={3}
        className="lg:col-span-8"
      />
    </div>
  );
}
