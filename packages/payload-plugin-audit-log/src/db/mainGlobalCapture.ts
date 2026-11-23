type ReqWithContext = { context?: Record<string, unknown> } | undefined | null;

type StoredGlobal = Record<string, unknown> | null | undefined;
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

type FindGlobalArgs = {
  slug?: string;
  where?: unknown;
  req?: ReqWithContext;
};

type FindGlobalVersionsArgs = {
  global?: string;
  req?: ReqWithContext;
};

type WriteGlobalArgs = {
  slug?: string;
  select?: unknown;
  req?: ReqWithContext;
};

type GlobalVersions = { docs?: { version?: StoredGlobal }[] } | null | undefined;

type FindGlobal = (this: unknown, args: FindGlobalArgs) => Promise<StoredGlobal>;
type FindGlobalVersions = (this: unknown, args: FindGlobalVersionsArgs) => Promise<GlobalVersions>;
type WriteGlobal = (this: unknown, args: WriteGlobalArgs) => Promise<StoredGlobal>;

const CTX_MAIN_GLOBAL_READS = "__auditMainGlobalReads";
const CAPTURING_MARKER = Symbol.for("payload-plugin-audit-log.mainGlobalReadsCaptured");
const GLOBAL_WRITE_METHODS = ["updateGlobal", "createGlobal"] as const;

const isAccessFilter = (where: unknown): boolean => Boolean(where) && typeof where === "object";

const selectsFields = (args: object): boolean => "select" in args;

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

function keepMainGlobalRead(req: ReqWithContext, slug: string, where: unknown, doc: StoredGlobal) {
  const capture = innermostCaptureOf(req, slug);
  if (!capture?.open) return;
  capture.captured = { doc };
  if (!isAccessFilter(where)) capture.open = false;
}

function keepLatestVersionRead(req: ReqWithContext, slug: string, version: StoredGlobal) {
  const capture = innermostCaptureOf(req, slug);
  if (!capture?.open || capture.latestVersionRead) return;
  capture.latestVersionRead = { version };
}

function keepMainGlobalWrite(req: ReqWithContext, slug: string, doc: StoredGlobal) {
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

function captureMainGlobalWrites(db: Record<string | symbol, unknown>): void {
  for (const method of GLOBAL_WRITE_METHODS) {
    const original = db[method];
    if (typeof original !== "function") continue;
    db[method] = async function writeGlobal(this: unknown, args: WriteGlobalArgs) {
      const result = await (original as WriteGlobal).call(this ?? db, args);
      if (args && typeof args.slug === "string" && args.select === undefined) {
        keepMainGlobalWrite(args.req, args.slug, result);
      }
      return result;
    };
  }
}

export function captureMainGlobals(adapter: unknown): void {
  const db = adapter as Record<string | symbol, unknown> | undefined;
  if (!db || db[CAPTURING_MARKER]) return;
  const originalFindGlobal = db.findGlobal;
  if (typeof originalFindGlobal !== "function") return;
  db[CAPTURING_MARKER] = true;
  captureMainGlobalWrites(db);
  db.findGlobal = async function findGlobal(this: unknown, args: FindGlobalArgs) {
    const result = await (originalFindGlobal as FindGlobal).call(this ?? db, args);
    if (args && typeof args.slug === "string" && !selectsFields(args)) {
      keepMainGlobalRead(args.req, args.slug, args.where, result);
    }
    return result;
  };
  const originalFindGlobalVersions = db.findGlobalVersions;
  if (typeof originalFindGlobalVersions !== "function") return;
  db.findGlobalVersions = async function findGlobalVersions(
    this: unknown,
    args: FindGlobalVersionsArgs
  ) {
    const result = await (originalFindGlobalVersions as FindGlobalVersions).call(this ?? db, args);
    if (args && typeof args.global === "string" && !selectsFields(args)) {
      keepLatestVersionRead(args.req, args.global, result?.docs?.[0]?.version);
    }
    return result;
  };
}
