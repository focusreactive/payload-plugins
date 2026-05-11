export interface SessionSignature {
  dhm: string;
  src: string;
  dev: string;
  ctr: string;
  lp: string;
}

export function encodeSessionId(sig: SessionSignature): string {
  return Buffer.from(JSON.stringify(sig)).toString("base64");
}

export function decodeSessionId(id: string): SessionSignature | null {
  try {
    const parsed = JSON.parse(Buffer.from(id, "base64").toString("utf8")) as Partial<SessionSignature>;

    if (
      typeof parsed.dhm === "string"
      && typeof parsed.src === "string"
      && typeof parsed.dev === "string"
      && typeof parsed.ctr === "string"
      && typeof parsed.lp === "string"
    ) {
      return parsed as SessionSignature;
    }

    return null;
  } catch {
    return null;
  }
}
