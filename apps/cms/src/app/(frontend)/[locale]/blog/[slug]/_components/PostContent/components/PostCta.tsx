import { SectionContainer } from "@/components/shared";
import { CtaBandSection } from "@/components/CtaBandSection";
import type { Post } from "@/payload-types";

interface PostCtaProps {
  cta: NonNullable<Post["cta"]>;
}

export function PostCta({ cta }: PostCtaProps) {
  return (
    <SectionContainer sectionData={{ paddingY: "none", theme: "dark" }}>
      <CtaBandSection heading={cta.heading} actions={cta.actions} theme="dark" />
    </SectionContainer>
  );
}
