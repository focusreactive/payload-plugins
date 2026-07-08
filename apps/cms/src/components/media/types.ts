import type { ImageProps as NextImageProps, StaticImageData } from "next/image";
import type { ElementType, VideoHTMLAttributes } from "react";

export enum ImageAspectRatio {
  "16/9" = "16/9",
  "3/2" = "3/2",
  "4/3" = "4/3",
  "1/1" = "1/1",
  "9/16" = "9/16",
  "1/2" = "1/2",
  "4/1" = "4/1",
  "3/1" = "3/1",
  "auto" = "auto",
}

export type VisualEditingAttrs = Record<string, string | undefined>;

export type MediaData =
  | {
      kind: "image";
      src: string | StaticImageData;
      alt?: string;
      width?: number;
      height?: number;
    }
  | {
      kind: "video";
      src: string;
      poster?: string;
    };

export type ImageOverrides = Omit<Partial<NextImageProps>, "src" | "alt" | "width" | "height"> & {
  fit?: "cover" | "contain";
  aspectRatio?: ImageAspectRatio;
  pictureClassName?: string;
};

export type VideoOverrides = Partial<Omit<VideoHTMLAttributes<HTMLVideoElement>, "src">>;

export type MediaProps = MediaData & {
  className?: string;
  htmlElement?: ElementType | null;
  onClick?: () => void;
  onLoad?: () => void;
  visualEditing?: VisualEditingAttrs;
  imageProps?: ImageOverrides;
  videoProps?: VideoOverrides;
};

export type PreparedMedia = {
  data: MediaData;
  visualEditing?: VisualEditingAttrs;
  imageProps?: ImageOverrides;
};
