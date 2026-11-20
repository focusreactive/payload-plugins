import { cn } from "@/components/utils";
import { Media } from "@/components/media";
import { ButtonVariant } from "@/components/button/types";
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
        variant={ButtonVariant.Default}
        className={cn(link?.className, "mx-auto h-full !p-0")}
      >
        {mediaEl}
      </Link>
    );
  }

  return <div className={cn("mx-auto h-full")}>{mediaEl}</div>;
}
