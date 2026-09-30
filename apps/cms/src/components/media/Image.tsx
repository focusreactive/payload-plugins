import type { StaticImageData } from "next/image";

import { cn } from "@/components/utils";
import { IMAGE_QUALITY } from "@/lib/constants/imageDelivery.mjs";

import type { ImageAspectRatio, ImageOverrides, ImageVariant } from "./types";
import { VariantImage } from "./VariantImage";

interface ImageContainerProps {
  aspectRatio?: ImageAspectRatio;
  children: React.ReactNode;
}

function ImageContainer({ aspectRatio, children }: ImageContainerProps) {
  if (!aspectRatio || aspectRatio === ("auto" as ImageAspectRatio)) {
    return <>{children}</>;
  }

  return (
    <div className="relative mx-auto h-full max-w-full" style={{ aspectRatio }}>
      {children}
    </div>
  );
}

interface ImageProps {
  src: string | StaticImageData;
  alt?: string;
  width?: number;
  height?: number;
  onClick?: () => void;
  onLoad?: () => void;
  imageProps?: ImageOverrides;
  variants?: ImageVariant[];
}

export function Image({
  src,
  alt,
  width,
  height,
  onClick,
  onLoad,
  imageProps,
  variants,
}: ImageProps) {
  const {
    aspectRatio,
    fit,
    pictureClassName,
    className,
    fill,
    quality,
    priority,
    loading,
    style,
    ...rest
  } = imageProps ?? {};

  const resolvedLoading = loading ?? (priority ? undefined : "lazy");
  const mergedStyle = {
    ...style,
    ...(fit ? { objectFit: fit } : {}),
  };

  return (
    <ImageContainer aspectRatio={aspectRatio}>
      <picture className={cn(pictureClassName)}>
        <VariantImage
          alt={alt ?? ""}
          className={cn(className)}
          fill={fill}
          height={fill ? undefined : height}
          loading={resolvedLoading}
          onClick={onClick}
          onLoad={onLoad}
          priority={priority}
          quality={quality ?? IMAGE_QUALITY}
          src={src}
          style={Object.keys(mergedStyle).length > 0 ? mergedStyle : undefined}
          variants={variants}
          width={fill ? undefined : width}
          {...rest}
        />
      </picture>
    </ImageContainer>
  );
}
