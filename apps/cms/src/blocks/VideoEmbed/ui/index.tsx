"use client";

import { useState } from "react";

import { cn } from "@/components/utils";

export interface VideoPlayerProps {
  videoId?: string | null;
  title: string;
  posterUrl?: string | null;
  aspect?: "16/9" | "4/3" | null;
}

const RINGS = [60, 95, 130, 165, 200, 235];

/**
 * Click-to-load YouTube (§5.10): until the visitor presses play nothing is requested from YouTube;
 * then a youtube-nocookie iframe replaces the poster. Without a video id the poster stays static.
 */
export function VideoPlayer({ videoId, title, posterUrl, aspect }: VideoPlayerProps) {
  const [playing, setPlaying] = useState(false);
  const ratio = aspect === "4/3" ? "aspect-[4/3]" : "aspect-video";

  return (
    <div className={cn("relative w-full overflow-hidden rounded-lg bg-ct-dark-blue", ratio)}>
      {playing && videoId ? (
        <iframe
          className="absolute inset-0 size-full"
          src={`https://www.youtube-nocookie.com/embed/${encodeURIComponent(videoId)}?autoplay=1&rel=0`}
          title={title}
          allow="autoplay; encrypted-media; picture-in-picture"
          allowFullScreen
        />
      ) : (
        <button
          type="button"
          disabled={!videoId}
          onClick={() => setPlaying(true)}
          aria-label={videoId ? `Play video: ${title}` : `${title} (video coming soon)`}
          className="group absolute inset-0 flex size-full flex-col justify-end p-6 text-left disabled:cursor-default sm:p-8"
        >
          {posterUrl ? (
            // eslint-disable-next-line @next/next/no-img-element -- poster from the CMS, any size
            <img
              src={posterUrl}
              alt=""
              loading="lazy"
              className="absolute inset-0 size-full object-cover"
            />
          ) : (
            <svg
              aria-hidden
              viewBox="0 0 480 270"
              className="absolute inset-0 size-full"
              preserveAspectRatio="xMaxYMid slice"
            >
              {RINGS.map((r) => (
                <circle
                  key={r}
                  cx="400"
                  cy="70"
                  r={r}
                  fill="none"
                  stroke="var(--color-ct-electric-green)"
                  strokeOpacity="0.18"
                  strokeWidth="1.2"
                />
              ))}
            </svg>
          )}
          {posterUrl && <span aria-hidden className="absolute inset-0 bg-ct-dark-blue/55" />}
          <span
            aria-hidden
            className="absolute left-1/2 top-1/2 flex size-16 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-pill bg-ct-electric-green transition-transform group-hover:scale-105 group-disabled:opacity-60"
          >
            <svg viewBox="0 0 24 24" className="ml-1 size-7 fill-ct-dark-blue">
              <path d="M7 4.5v15l13-7.5z" />
            </svg>
          </span>
          <span className="relative max-w-[32ch] text-lg font-semibold leading-snug text-ct-white sm:text-xl">
            {title}
          </span>
          {!videoId && (
            <span className="relative mt-1 text-eyebrow text-ct-electric-green">Coming soon</span>
          )}
        </button>
      )}
    </div>
  );
}
