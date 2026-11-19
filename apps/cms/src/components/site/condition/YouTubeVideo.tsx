"use client";

import React, { useState } from "react";

import { YOUTUBE_PLAYER_PERMISSIONS } from "./youTubeEmbed";

/** The bare player the original places straight into a section. */
export function YouTubeFrame({ embedUrl }: { embedUrl: string }) {
  return (
    <iframe
      allow={YOUTUBE_PLAYER_PERMISSIONS}
      allowFullScreen
      height="515"
      referrerPolicy="strict-origin-when-cross-origin"
      src={embedUrl}
      title="YouTube video player"
      width="660"
    />
  );
}

interface YouTubeCoverProps {
  embedUrl: string;
  cover?: string;
  /** Visual-editing attributes of the field holding the still. */
  target?: Record<string, string>;
}

/** `div.video-container`: a still that, once pressed, gives way to the playing YouTube player. */
export function YouTubeCover({ embedUrl, cover, target }: YouTubeCoverProps) {
  const [playing, setPlaying] = useState(false);

  return (
    <div className="video-container">
      <div className={playing ? "playing" : undefined}>
        {!playing && (
          <button
            aria-label="Play Video"
            className="thumbnail"
            onClick={() => setPlaying(true)}
            style={cover ? { backgroundImage: `url("${cover}")` } : undefined}
            {...target}
            type="button"
          />
        )}
        <figure className="video">
          <iframe
            allow={YOUTUBE_PLAYER_PERMISSIONS}
            allowFullScreen
            src={playing ? `${embedUrl}?autoplay=1&rel=0` : undefined}
            title="YouTube video player"
          />
        </figure>
      </div>
    </div>
  );
}
