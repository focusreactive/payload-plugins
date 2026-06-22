import { SectionContainer } from "@/components/shared";
import type { RawHtmlBlock as RawHtmlBlockProps } from "@/payload-types";

export const RawHtmlBlockComponent: React.FC<RawHtmlBlockProps> = ({ html, section, id }) => (
  <SectionContainer sectionData={{ ...section, id }}>
    <div dangerouslySetInnerHTML={{ __html: html ?? "" }} />
  </SectionContainer>
);
