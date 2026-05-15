interface MimeSignature {
  bytes: number[];
  mime: string;
  ext: string;
}

const MIME_SIGNATURES: MimeSignature[] = [
  { bytes: [0xff, 0xd8, 0xff], ext: "jpg", mime: "image/jpeg" },
  { bytes: [0x89, 0x50, 0x4e, 0x47], ext: "png", mime: "image/png" },
  { bytes: [0x47, 0x49, 0x46, 0x38], ext: "gif", mime: "image/gif" },
  { bytes: [0x52, 0x49, 0x46, 0x46], ext: "webp", mime: "image/webp" },
];

export function detectMimeType(buffer: Buffer): Omit<MimeSignature, "bytes"> {
  for (const signature of MIME_SIGNATURES) {
    if (signature.bytes.every((b, i) => buffer[i] === b)) {
      if (signature.mime === "image/webp") {
        if (buffer.subarray(8, 12).toString("ascii") === "WEBP") {
          return {
            ext: "webp",
            mime: "image/webp",
          };
        }

        continue;
      }

      return {
        ext: signature.ext,
        mime: signature.mime,
      };
    }
  }

  if (buffer.subarray(4, 8).toString("ascii") === "ftyp") {
    const brand = buffer.subarray(8, 12).toString("ascii");

    if (brand === "avif" || brand === "avis") {
      return {
        ext: "avif",
        mime: "image/avif",
      };
    }
  }

  return {
    ext: "jpg",
    mime: "image/jpeg",
  };
}
