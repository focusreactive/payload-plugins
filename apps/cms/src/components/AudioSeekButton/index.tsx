"use client";

/**
 * Seeks an <audio> element already rendered on the same page and starts it playing.
 *
 * This has to be a client component. The version it replaces linked to
 * `<audio src>#t=<seconds>`, on the belief that a media fragment seeks the player in place - it
 * does not. A media fragment is resolved by whatever loads the resource, so it only applies when
 * the browser navigates TO the media file; against an <audio> element that is already mounted it
 * is inert, and the anchor instead took the reader off the page to the bare audio file. Nothing
 * in HTML seeks a mounted media element, so `currentTime` has to be assigned, which needs
 * JavaScript and therefore a client boundary. Do not put the anchor back.
 *
 * The target is addressed by the id the page hands in, never by a tag selector: a second audio
 * element on the page would otherwise silently win.
 */

import { useState } from "react";

interface AudioSeekButtonProps {
  audioElementId: string;
  startSeconds: number;
  timestampLabel: string;
}

export function AudioSeekButton({
  audioElementId,
  startSeconds,
  timestampLabel,
}: AudioSeekButtonProps) {
  const [hasVisibleFocus, setHasVisibleFocus] = useState(false);

  const handleClick = async () => {
    const audioElement = document.querySelector(`#${audioElementId}`);
    // A gated talk has no audioUrl and so renders no player. Being absent is a normal state, not
    // an error - the click is simply dropped.
    if (!(audioElement instanceof HTMLAudioElement)) return;

    audioElement.currentTime = startSeconds;
    try {
      await audioElement.play();
    } catch {
      // play() rejects when the browser blocks playback (autoplay policy, or the media failing to
      // load). The seek above has already happened, so the reader can press play on the element.
    }
  };

  return (
    <button
      aria-label={`Play the audio from ${timestampLabel}`}
      onBlur={() => setHasVisibleFocus(false)}
      onClick={handleClick}
      onFocus={(event) => setHasVisibleFocus(event.currentTarget.matches(":focus-visible"))}
      style={{
        background: "transparent",
        border: "1px solid #d4d4d4",
        borderRadius: 4,
        color: "#444",
        cursor: "pointer",
        // A bare <button> would otherwise fall back to the browser's UI font next to the prose.
        fontFamily: "inherit",
        fontSize: 12,
        // Strengthened for keyboard focus only, and left unset otherwise so the browser's own
        // focus ring stays the floor - never `outline: none`, which would leave nothing at all if
        // `:focus-visible` did not match.
        outline: hasVisibleFocus ? "2px solid #111" : undefined,
        outlineOffset: 2,
        padding: "2px 8px",
      }}
      type="button"
    >
      Listen at {timestampLabel}
    </button>
  );
}
