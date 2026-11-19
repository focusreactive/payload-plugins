"use client";

import React, { useRef, useState } from "react";

interface Props {
  src: string;
  poster?: string;
  /** Visual-editing attributes of the field holding the still. */
  target?: Record<string, string>;
}

/** A video behind a still: the still is a button, and a click swaps it for the playing video. */
export function SiteVideo({ src, poster, target }: Props) {
  const [playing, setPlaying] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  const play = () => {
    setPlaying(true);
    void videoRef.current?.play();
  };

  return (
    <div className={playing ? "playing" : undefined}>
      {!playing && (
        <button
          aria-label="Play Video"
          className="thumbnail"
          onClick={play}
          style={poster ? { backgroundImage: `url("${poster}")` } : undefined}
          {...target}
          type="button"
        />
      )}
      <figure className="video">
        <video controls playsInline preload="none" ref={videoRef} src={src} />
      </figure>
    </div>
  );
}
