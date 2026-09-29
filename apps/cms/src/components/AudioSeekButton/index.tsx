"use client";

import { Button, ButtonVariant } from "@/components/button";

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
    <Button
      aria-label={`Play the audio from ${timestampLabel}`}
      onClick={handleClick}
      type="button"
      variant={ButtonVariant.Badge}
    >
      Listen at {timestampLabel}
    </Button>
  );
}
