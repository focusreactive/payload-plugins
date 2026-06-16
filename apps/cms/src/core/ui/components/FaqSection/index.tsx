import type { SerializedEditorState } from "@payloadcms/richtext-lexical/lexical";
import { SectionHeader } from "@repo/ui";

import { RichText } from "@/core/ui";
import type { AccordionItemData } from "@/core/ui/components/Accordion";
import { Accordion } from "@/core/ui/components/Accordion";
import { prepareSectionHeaderProps } from "@/lib/adapters/prepareSectionHeaderProps";

export interface FaqSectionItem {
  question: string;
  answer: SerializedEditorState;
  id?: string | null;
}

interface FaqSectionProps {
  eyebrow?: string | null;
  heading?: string | null;
  description?: string | null;
  items?: FaqSectionItem[] | null;
}

export function FaqSection({ eyebrow, heading, description, items }: FaqSectionProps) {
  const accordionItems: AccordionItemData[] = (items ?? []).map((item, index) => ({
    content: <RichText content={item.answer} />,
    id: item.id ?? String(index),
    trigger: item.question,
  }));

  const firstId = accordionItems[0]?.id ?? null;
  const header = prepareSectionHeaderProps({ eyebrow, size: "h-section", description, heading });

  return (
    <div className="grid grid-cols-1 items-start gap-[clamp(32px,6vw,80px)] min-[861px]:grid-cols-[0.8fr_1.2fr]">
      {header ? <SectionHeader {...header} /> : <div aria-hidden />}

      <Accordion items={accordionItems} defaultOpenId={firstId} />
    </div>
  );
}
