import type { ContentBlock } from "@/payload-types";

import { RichText } from "../RichText";

export function Content({ block }: { block: ContentBlock }) {
  return (
    <section>
      <RichText data={block.body} />
    </section>
  );
}
