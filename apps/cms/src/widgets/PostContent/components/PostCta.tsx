import { SectionContainer } from "@/core/ui";
import { CtaBandSection } from "@/core/ui/components/CtaBandSection";
import type { Post } from "@/payload-types";

interface PostCtaProps {
  cta: NonNullable<Post["cta"]>;
}

export function PostCta({ cta }: PostCtaProps) {
  return (
    <SectionContainer sectionData={{ paddingY: "none", theme: "dark" }}>
      <CtaBandSection
        eyebrow={cta.eyebrow}
        heading={cta.heading}
        description={cta.description}
        actions={cta.actions}
        theme="dark"
      />
    </SectionContainer>
  );
}
