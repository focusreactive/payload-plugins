import type { FaqBlock } from "@/payload-types";

import { RichText } from "../RichText";

export function Faq({ block }: { block: FaqBlock }) {
  return (
    <section className="faq">
      {block.heading ? <h2>{block.heading}</h2> : null}
      {block.items?.map((item) => (
        <details key={item.id ?? item.question}>
          <summary>{item.question}</summary>
          <RichText data={item.answer} />
        </details>
      ))}
    </section>
  );
}
