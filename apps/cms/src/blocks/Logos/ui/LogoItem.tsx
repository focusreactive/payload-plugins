import { cn } from "@/components/ui/utils";
import { Image } from "@/components/ui/primitives/image";
import { ImageAspectRatio } from "@/components/ui/primitives/image/types";
import { Link } from "@/components/ui/primitives/link";
import type { ILogoItem } from "./types";

export default function LogoItem({ image, link }: ILogoItem) {
  const imageWrapperProps = {
    className: cn(link?.className, "mx-auto", "h-full"),
    style: {
      aspectRatio: ImageAspectRatio[image.aspectRatio as ImageAspectRatio],
    },
  };

  if (link) {
    return (
      <Link
        {...link}
        style={imageWrapperProps.style}
        className={cn(
          imageWrapperProps.className,
          "bg-transparent hover:bg-transparent focus:bg-transparent px-0 py-0"
        )}
      >
        {image && <Image {...image} fit="contain" quality={85} className="h-full w-full" />}
      </Link>
    );
  }

  return (
    <div {...imageWrapperProps}>
      <Image {...image} fit="contain" quality={85} className="h-full w-full" />
    </div>
  );
}
