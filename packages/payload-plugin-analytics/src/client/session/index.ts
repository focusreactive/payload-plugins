import { SESSION_INACTIVITY_MS } from "../../constants/session";
import type { SessionContext, SessionRecord } from "./types";
import { readSessionRecord, writeSessionRecord } from "./store";
import { generateUuidV4 } from "./uuid";

function mintRecord(now: number): SessionRecord {
  return {
    id: generateUuidV4(),
    startedAt: now,
    lastActivityAt: now,
    eventSeq: 0,
  };
}

function shouldRotate(record: SessionRecord, now: number) {
  return now - record.lastActivityAt > SESSION_INACTIVITY_MS;
}

export function getSessionContext(): SessionContext {
  const now = Date.now();
  const existing = readSessionRecord();
  const base = !existing || shouldRotate(existing, now) ? mintRecord(now) : existing;

  const next: SessionRecord = {
    ...base,
    eventSeq: base.eventSeq + 1,
    lastActivityAt: now,
  };

  writeSessionRecord(next);

  return {
    id: next.id,
    eventSeq: next.eventSeq,
    elapsedMs: Math.max(0, now - next.startedAt),
    startedAtIso: new Date(next.startedAt).toISOString(),
  };
}
