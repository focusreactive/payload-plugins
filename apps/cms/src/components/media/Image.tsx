import NextImage from "next/image";
import type { StaticImageData } from "next/image";

import { cn } from "@/components/utils";

import type { ImageAspectRatio, ImageOverrides } from "./types";

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
}

export function Image({ src, alt, width, height, onClick, onLoad, imageProps }: ImageProps) {
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
        <NextImage
          alt={alt ?? ""}
          className={cn(className)}
          fill={fill}
          height={fill ? undefined : height}
          loading={resolvedLoading}
          onClick={onClick}
          onLoad={onLoad}
          priority={priority}
          quality={quality ?? 85}
          src={src}
          style={Object.keys(mergedStyle).length > 0 ? mergedStyle : undefined}
          width={fill ? undefined : width}
          {...rest}
        />
      </picture>
    </ImageContainer>
  );
}
