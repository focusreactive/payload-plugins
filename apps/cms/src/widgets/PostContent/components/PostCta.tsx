import { SectionContainer } from "@/core/ui";
import { CtaBandSection } from "@/core/ui/components/CtaBandSection";
import type { Post } from "@/payload-types";

interface PostCtaProps {
  cta: NonNullable<Post["cta"]>;
}

export function PostCta({ cta }: PostCtaProps) {
  return (
    <SectionContainer sectionData={{ paddingY: "none", theme: "dark" }}>
      <CtaBandSection eyebrow={cta.badge} heading={cta.heading} lead={cta.lead} actions={cta.actions} theme="dark" />
    </SectionContainer>
  );
}
