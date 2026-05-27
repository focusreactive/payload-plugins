import { cn } from "../../../utils";
import { Image } from "../../ui/image";
import { ImageAspectRatio } from "../../ui/image/types";
import { RichText } from "../../ui/richText";
import type { ICarouselCardProps } from "./types";

export default function CarouselCard({ image, text, isActive, effect }: ICarouselCardProps) {
  const imageWrapperProps = {
    className: "h-56 w-full overflow-hidden rounded-md bg-gradient-to-br from-orange-500 to-orange-700",
    style: {
      aspectRatio: ImageAspectRatio[image.aspectRatio as ImageAspectRatio],
    },
  };

  return (
    <article
      className={cn("user-select-none flex h-full flex-col gap-6 bg-surface p-6 sm:p-8 border border-border transition-all duration-300", {
        "opacity-60 scale-[0.97]": !isActive && effect !== "fade" && effect !== "slide",
        "border-none": effect === "fade",
        "rounded-lg": effect !== "cube",
      })}
    >
      <div {...imageWrapperProps}>{image?.src && <Image {...image} fit="contain" />}</div>
      {text && (
        <div
          className={cn(
            "prose max-w-none",
            "prose-headings:font-display prose-headings:text-2xl sm:prose-headings:text-3xl prose-headings:leading-tight prose-headings:tracking-tight prose-headings:mb-3",
            "prose-em:font-display prose-em:not-italic prose-em:italic prose-em:text-primary",
            "prose-p:text-foreground/80 prose-p:text-sm sm:prose-p:text-base",
            "prose-a:text-foreground prose-a:underline-offset-4 prose-a:font-medium"
          )}
        >
          <RichText {...text} />
        </div>
      )}
    </article>
  );
}
