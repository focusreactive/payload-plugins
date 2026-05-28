import { cn } from "../../../utils";
import { DisplayHeading } from "../../ui/DisplayHeading";
import { Image } from "../../ui/image";
import { Link } from "../../ui/link";
import { RichText } from "../../ui/richText";
import type { IHeroProps } from "./types";

export function Hero({ title, text, image, links }: IHeroProps) {
  const hasImage = typeof image?.src === "string" && image.src.length > 0;

  return (
    <div className={cn("grid grid-cols-1 items-center gap-10 lg:gap-16", hasImage && "lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]")}>
      <div className="flex flex-col gap-8 sm:gap-10">
        <DisplayHeading as="h1" text={title} size="xl" />

        <div className="prose prose-lg max-w-2xl text-foreground/80 prose-p:leading-relaxed">
          <RichText {...text} />
        </div>

        {links?.length > 0 && (
          <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
            <ul className="flex flex-wrap items-center gap-3">
              {links.map((link, i) => (
                <li key={i}>
                  <Link {...link} />
                </li>
              ))}
            </ul>
            <div className="hidden items-center gap-2 sm:flex">
              <span aria-hidden className="inline-block size-1.5 rounded-pill bg-primary" />
              <span className="text-sm text-muted-foreground">Live demo — no signup</span>
            </div>
          </div>
        )}
      </div>

      {hasImage && (
        <div className="relative aspect-square w-full overflow-hidden rounded-lg">
          <Image {...image} fit="cover" />
        </div>
      )}
    </div>
  );
}
