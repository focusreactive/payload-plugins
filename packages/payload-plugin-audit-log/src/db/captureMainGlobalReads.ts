import {
  captureLatestGlobalVersionRead,
  captureMainGlobalRead,
  captureMainGlobalWrite,
} from "../core/mainGlobalCapture";
import type { StoredGlobal } from "../core/mainGlobalCapture";

type ReqOfRead = { context?: Record<string, unknown> };

type FindGlobalArgs = {
  slug?: string;
  where?: unknown;
  req?: ReqOfRead;
};

type FindGlobalVersionsArgs = {
  global?: string;
  req?: ReqOfRead;
};

type WriteGlobalArgs = {
  slug?: string;
  select?: unknown;
  req?: ReqOfRead;
};

type GlobalVersions = { docs?: { version?: StoredGlobal }[] } | null | undefined;

type FindGlobal = (this: unknown, args: FindGlobalArgs) => Promise<StoredGlobal>;
type FindGlobalVersions = (this: unknown, args: FindGlobalVersionsArgs) => Promise<GlobalVersions>;
type WriteGlobal = (this: unknown, args: WriteGlobalArgs) => Promise<StoredGlobal>;

const CAPTURING_MARKER = Symbol.for("payload-plugin-audit-log.mainGlobalReadsCaptured");

const selectsFields = (args: object): boolean => "select" in args;

const GLOBAL_WRITE_METHODS = ["updateGlobal", "createGlobal"] as const;

function captureMainGlobalWrites(db: Record<string | symbol, unknown>): void {
  for (const method of GLOBAL_WRITE_METHODS) {
    const original = db[method];
    if (typeof original !== "function") continue;
    db[method] = async function writeGlobal(this: unknown, args: WriteGlobalArgs) {
      const result = await (original as WriteGlobal).call(this ?? db, args);
      if (args && typeof args.slug === "string" && args.select === undefined) {
        captureMainGlobalWrite(args.req, args.slug, result);
      }
      return result;
    };
  }
}

export function captureMainGlobalReads(adapter: unknown): void {
  const db = adapter as Record<string | symbol, unknown> | undefined;
  if (!db || db[CAPTURING_MARKER]) return;
  const originalFindGlobal = db.findGlobal;
  if (typeof originalFindGlobal !== "function") return;
  db[CAPTURING_MARKER] = true;
  captureMainGlobalWrites(db);
  db.findGlobal = async function findGlobal(this: unknown, args: FindGlobalArgs) {
    const result = await (originalFindGlobal as FindGlobal).call(this ?? db, args);
    if (args && typeof args.slug === "string" && !selectsFields(args)) {
      captureMainGlobalRead(args.req, args.slug, args.where, result);
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
      captureLatestGlobalVersionRead(args.req, args.global, result?.docs?.[0]?.version);
    }
    return result;
  };
}
