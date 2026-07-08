"use client";

import { cn } from "@/components/utils";

import type { VideoOverrides } from "./types";

interface VideoProps {
  src: string;
  poster?: string;
  onClick?: () => void;
  videoProps?: VideoOverrides;
}

export function Video({ src, poster, onClick, videoProps }: VideoProps) {
  const { className, ...rest } = videoProps ?? {};

  return (
    <video
      autoPlay
      className={cn(className)}
      controls={false}
      loop
      muted
      onClick={onClick}
      playsInline
      poster={poster}
      {...rest}
    >
      <source src={src} />
    </video>
  );
}
