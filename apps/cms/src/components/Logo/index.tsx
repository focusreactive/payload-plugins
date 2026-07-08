import Image from "next/image";
import React from "react";

import { cn } from "@/components/utils";
import { Media } from "@/components/media";
import { prepareMediaProps } from "@/lib/adapters/prepareMediaProps";
import type { Media as MediaType } from "@/payload-types";

interface Props {
  resource?: MediaType | null;
  className?: string;
  imgClassName?: string;
  alt?: string;
  priority?: boolean;
  loading?: "eager" | "lazy";
}

export const Logo = ({
  resource,
  className,
  imgClassName,
  alt = "Logo",
  priority = true,
  loading = "eager",
}: Props) => {
  if (resource) {
    const media = prepareMediaProps({ image: resource });
    return (
      <Media
        {...media.data}
        visualEditing={media.visualEditing}
        className={className}
        imageProps={{
          ...media.imageProps,
          className: cn("size-9 object-contain", imgClassName),
          priority: true,
          loading,
          sizes: "(max-width: 768px) 150px, 200px",
        }}
      />
    );
  }

  return (
    <Image
      src="/logo-placeholder.webp"
      alt={alt}
      fetchPriority={priority ? "high" : "auto"}
      loading={loading}
      width={200}
      height={36}
      className={cn("size-9 object-contain", imgClassName, className)}
    />
  );
};
