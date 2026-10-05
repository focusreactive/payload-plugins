import { getServerSideURL } from "./getURL";

const isAbsoluteUrl = (url: string) => url.startsWith("http://") || url.startsWith("https://");

export function getMediaUrl(url: string | null | undefined, filesize?: number | null): string {
  if (!url) {
    return "";
  }

  if (typeof filesize !== "number" || !Number.isFinite(filesize)) {
    return url;
  }

  const joiner = url.includes("?") ? "&" : "?";
  return `${url}${joiner}v=${filesize}`;
}

export function getAbsoluteMediaUrl(url: string | null | undefined, filesize?: number | null) {
  const mediaUrl = getMediaUrl(url, filesize);

  if (!mediaUrl || isAbsoluteUrl(mediaUrl)) {
    return mediaUrl;
  }

  return `${getServerSideURL()}${mediaUrl}`;
}
