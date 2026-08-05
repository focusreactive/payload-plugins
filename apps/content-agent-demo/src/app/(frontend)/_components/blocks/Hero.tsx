import type { HeroBlock } from "@/payload-types";

export function Hero({ block }: { block: HeroBlock }) {
  return (
    <section className="hero">
      <h1>{block.heading}</h1>
      {block.subheading ? <p className="muted">{block.subheading}</p> : null}
    </section>
  );
}
