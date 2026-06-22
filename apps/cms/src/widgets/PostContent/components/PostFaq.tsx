import { SectionContainer } from "@/components/shared";
import { FaqSection } from "@/components/FaqSection";
import type { Post } from "@/payload-types";

interface PostFaqProps {
  faq: NonNullable<Post["faq"]>;
}

export function PostFaq({ faq }: PostFaqProps) {
  const items = faq.items ?? [];

  if (items.length === 0) {
    return null;
  }

  return (
    <SectionContainer sectionData={{}}>
      <FaqSection heading={faq.heading} items={items} />
    </SectionContainer>
  );
}
