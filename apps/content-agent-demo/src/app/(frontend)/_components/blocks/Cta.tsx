import Link from "next/link";

import type { CtaBlock } from "@/payload-types";

export function Cta({ block }: { block: CtaBlock }) {
  return (
    <section className="cta">
      <h2>{block.heading}</h2>
      <Link href={block.buttonUrl}>{block.buttonLabel}</Link>
    </section>
  );
}
