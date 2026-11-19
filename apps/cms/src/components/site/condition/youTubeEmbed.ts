const YOUTUBE_ID =
  /(?:youtu\.be\/|youtube(?:-nocookie)?\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/|v\/))([\w-]{11})/u;

export const YOUTUBE_PLAYER_PERMISSIONS =
  "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share";

/** The embed address of a YouTube watch, share or embed URL, or null for anything else. */
export function youTubeEmbedUrl(url: string | null | undefined): string | null {
  const id = url ? YOUTUBE_ID.exec(url)?.[1] : undefined;

  return id ? `https://www.youtube.com/embed/${id}` : null;
}
