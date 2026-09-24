const MEGABYTE = 1024 * 1024;

export const MAX_UPLOAD_BYTES = 100 * MEGABYTE;

export const MAX_VIDEO_BYTES = 30 * MEGABYTE;

/** Inline autoplay only supports these containers. */
export const ALLOWED_VIDEO_MIME_TYPES = ["video/mp4", "video/webm"] as const;
