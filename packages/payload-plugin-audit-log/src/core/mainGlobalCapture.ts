import { CTX_MAIN_GLOBAL_READS } from "../constants";

type ReqWithContext = { context?: Record<string, unknown> } | undefined | null;

export type StoredGlobal = Record<string, unknown> | null | undefined;
export type CapturedMainGlobal = {
  doc: StoredGlobal;
  latestVersion?: StoredGlobal;
  written?: StoredGlobal;
};

type Capture = {
  open: boolean;
  hooksDone?: boolean;
  captured?: { doc: StoredGlobal };
  latestVersionRead?: { version: StoredGlobal };
  writeDone?: { doc: StoredGlobal };
};
type CaptureStacksBySlug = Map<string, Capture[]>;

const isAccessFilter = (where: unknown): boolean => Boolean(where) && typeof where === "object";

const captureStacksOf = (req: ReqWithContext): CaptureStacksBySlug | undefined => {
  const captures = req?.context?.[CTX_MAIN_GLOBAL_READS];
  return captures instanceof Map ? (captures as CaptureStacksBySlug) : undefined;
};

const innermostCaptureOf = (req: ReqWithContext, slug: string): Capture | undefined =>
  captureStacksOf(req)?.get(slug)?.at(-1);

export function openMainGlobalCapture(req: ReqWithContext, slug: string): void {
  if (!req) return;
  req.context ??= {};
  const captures = captureStacksOf(req) ?? new Map();
  captures.set(slug, [...(captures.get(slug) ?? []), { open: true }]);
  req.context[CTX_MAIN_GLOBAL_READS] = captures;
}

export function closeMainGlobalCapture(req: ReqWithContext, slug: string): void {
  const capture = innermostCaptureOf(req, slug);
  if (!capture) return;
  capture.open = false;
  capture.hooksDone = true;
}

export function captureMainGlobalRead(
  req: ReqWithContext,
  slug: string,
  where: unknown,
  doc: StoredGlobal
): void {
  const capture = innermostCaptureOf(req, slug);
  if (!capture?.open) return;
  capture.captured = { doc };
  if (!isAccessFilter(where)) capture.open = false;
}

export function captureLatestGlobalVersionRead(
  req: ReqWithContext,
  slug: string,
  version: StoredGlobal
): void {
  const capture = innermostCaptureOf(req, slug);
  if (!capture?.open || capture.latestVersionRead) return;
  capture.latestVersionRead = { version };
}

export function captureMainGlobalWrite(req: ReqWithContext, slug: string, doc: StoredGlobal): void {
  const capture = innermostCaptureOf(req, slug);
  if (!(capture?.captured && capture.hooksDone) || capture.writeDone) return;
  capture.writeDone = { doc };
}

export function takeCapturedMainGlobal(
  req: ReqWithContext,
  slug: string
): CapturedMainGlobal | undefined {
  const captures = captureStacksOf(req);
  const stack = captures?.get(slug);
  const capture = stack?.pop();
  if (stack?.length === 0) captures?.delete(slug);
  if (!capture?.captured) return undefined;
  const latestVersion = capture.latestVersionRead?.version;
  const written = capture.writeDone?.doc;
  return {
    ...capture.captured,
    ...(latestVersion ? { latestVersion } : {}),
    ...(written ? { written } : {}),
  };
}
