import type { VideoEmbedInline } from "@/payload-types";

import { preparePosterUrl } from "./preparePoster";
import { VideoPlayer } from "./ui";

export function VideoEmbedInlineComponent({ videoId, title, poster, aspect }: VideoEmbedInline) {
  return (
    <div className="not-prose my-8">
      <VideoPlayer
        videoId={videoId}
        title={title}
        posterUrl={preparePosterUrl(poster)}
        aspect={aspect}
      />
    </div>
  );
}
