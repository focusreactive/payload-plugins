import { cn } from "@/components/utils";
import { Media } from "@/components/media";
import { Link } from "@/components/link";
import type { ILogoItem } from "./types";

export default function LogoItem({ image, link }: ILogoItem) {
  const mediaEl = (
    <Media
      {...image.data}
      className="h-full"
      visualEditing={image.visualEditing}
      imageProps={{
        ...image.imageProps,
        fit: "contain",
        className: "h-full w-full",
      }}
    />
  );

  if (link) {
    return (
      <Link
        {...link}
        className={cn(
          link?.className,
          "mx-auto h-full",
          "bg-transparent hover:bg-transparent focus:bg-transparent px-0 py-0"
        )}
      >
        {mediaEl}
      </Link>
    );
  }

  return <div className={cn("mx-auto h-full")}>{mediaEl}</div>;
}
