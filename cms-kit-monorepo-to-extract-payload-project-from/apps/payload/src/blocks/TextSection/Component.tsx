import { Copy } from "@shared/ui";
import React from "react";

import { SectionContainer } from "@/core/ui";
import { prepareRichTextProps } from "@/lib/adapters/prepareRichTextProps";
import type { TextSectionBlock as TextSectionBlockProps } from "@/payload-types";

export const TextSectionBlockComponent: React.FC<TextSectionBlockProps> = ({
  text,
  section,
  id,
}) => (
    <SectionContainer sectionData={{ ...section, id }}>
      <Copy columns={[prepareRichTextProps(text)]} isReversedOnMobile={false} />
    </SectionContainer>
  );
