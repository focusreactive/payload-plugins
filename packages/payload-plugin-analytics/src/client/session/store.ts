import { SESSION_STORAGE_KEY } from "../../constants/session";
import type { SessionRecord } from "./types";

let inMemoryRecord: SessionRecord | null = null;

function isValidRecord(value: unknown): value is SessionRecord {
  if (typeof value !== "object" || value === null) return false;
  const r = value as Partial<SessionRecord>;

  return (
    typeof r.id === "string" &&
    typeof r.startedAt === "number" &&
    typeof r.lastActivityAt === "number" &&
    typeof r.eventSeq === "number"
  );
}

function tryRead(storage: Storage | undefined): SessionRecord | null {
  if (!storage) return null;

  try {
    const raw = storage.getItem(SESSION_STORAGE_KEY);
    if (!raw) return null;

    const parsed: unknown = JSON.parse(raw);

    return isValidRecord(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function tryWrite(storage: Storage | undefined, record: SessionRecord): boolean {
  if (!storage) return false;

  try {
    storage.setItem(SESSION_STORAGE_KEY, JSON.stringify(record));

    return true;
  } catch {
    return false;
  }
}

function getLocal(): Storage | undefined {
  return typeof window !== "undefined" ? window.localStorage : undefined;
}
function getSession(): Storage | undefined {
  return typeof window !== "undefined" ? window.sessionStorage : undefined;
}

export function readSessionRecord(): SessionRecord | null {
  return tryRead(getLocal()) ?? tryRead(getSession()) ?? inMemoryRecord;
}

export function writeSessionRecord(record: SessionRecord) {
  inMemoryRecord = record;

  if (tryWrite(getLocal(), record)) return;

  tryWrite(getSession(), record);
}

export function __resetInMemoryStore() {
  inMemoryRecord = null;
}
