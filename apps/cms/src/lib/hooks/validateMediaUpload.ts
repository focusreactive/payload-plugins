import { APIError } from "payload";
import type { CollectionBeforeValidateHook } from "payload";

import {
  ALLOWED_VIDEO_MIME_TYPES,
  MAX_UPLOAD_BYTES,
  MAX_VIDEO_BYTES,
} from "@/lib/constants/uploadLimits";
import type { Media } from "@/payload-types";

const allowedVideoMimes: readonly string[] = ALLOWED_VIDEO_MIME_TYPES;

function megabytesLabel(bytes: number): string {
  const rounded = Math.round((bytes / (1024 * 1024)) * 10) / 10;
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
}

export function readableAltFromFilename(filename: string): string {
  const baseName = filename.split(/[/\\]/u).pop() ?? filename;
  const withoutExtension = baseName.replace(/\.[^.]+$/u, "");
  const withoutHash = withoutExtension.replace(/[-_][a-f0-9]{8,}$/iu, "");
  const words = withoutHash.replace(/[-_]+/gu, " ").replace(/\s+/gu, " ").trim();
  return words || "Image";
}

function baseMimeType(mimeType: string): string {
  return mimeType.split(";")[0]?.trim().toLowerCase() ?? "";
}

function isVideoMime(mimeType: string | null | undefined): mimeType is string {
  return typeof mimeType === "string" && baseMimeType(mimeType).startsWith("video/");
}

function isMissingAlt(alt: unknown): boolean {
  if (alt == null) {
    return true;
  }

  if (typeof alt === "string") {
    return alt.trim() === "";
  }

  return false;
}

/**
 * Client uploads store the file in Blob before this hook runs. Reject only
 * size and type. Fill a missing alt so a required field cannot orphan the file.
 */
export const validateMediaUpload: CollectionBeforeValidateHook<Media> = ({
  data,
  originalDoc,
  operation,
  req,
}) => {
  if (!data) {
    return data;
  }

  const file = req.file;
  const mimeType =
    (typeof data.mimeType === "string" && data.mimeType) ||
    (typeof file?.mimetype === "string" ? file.mimetype : undefined);
  const nextSize =
    typeof file?.size === "number"
      ? file.size
      : typeof data.filesize === "number"
        ? data.filesize
        : undefined;
  const previousSize = typeof originalDoc?.filesize === "number" ? originalDoc.filesize : undefined;
  const isNewUpload =
    Boolean(file) ||
    operation === "create" ||
    (typeof nextSize === "number" && nextSize !== previousSize);

  if (isNewUpload && typeof nextSize === "number" && nextSize > MAX_UPLOAD_BYTES) {
    throw new APIError(
      `This file is ${megabytesLabel(nextSize)} MB. The maximum is ${megabytesLabel(MAX_UPLOAD_BYTES)} MB - please compress it and try again.`,
      400,
      undefined,
      true
    );
  }

  if (
    isNewUpload &&
    isVideoMime(mimeType) &&
    typeof nextSize === "number" &&
    nextSize > MAX_VIDEO_BYTES
  ) {
    throw new APIError(
      `This video is ${megabytesLabel(nextSize)} MB. The maximum for video is ${megabytesLabel(MAX_VIDEO_BYTES)} MB - please compress it and try again.`,
      400,
      undefined,
      true
    );
  }

  if (isNewUpload && isVideoMime(mimeType) && !allowedVideoMimes.includes(baseMimeType(mimeType))) {
    throw new APIError(
      "Videos must be MP4 or WebM so they can play inline. Export the file as MP4 or WebM and try again.",
      400,
      undefined,
      true
    );
  }

  const filename =
    (typeof data.filename === "string" && data.filename) ||
    (typeof file?.name === "string" && file.name) ||
    (typeof originalDoc?.filename === "string" ? originalDoc.filename : undefined);
  const hasAltKey = Object.hasOwn(data, "alt");

  if (isMissingAlt(data.alt) && filename && (hasAltKey || !originalDoc)) {
    data.alt = readableAltFromFilename(filename);
  }

  return data;
};
