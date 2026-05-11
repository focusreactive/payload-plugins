export interface SessionRecord {
  id: string;
  startedAt: number;
  lastActivityAt: number;
  eventSeq: number;
}

export interface SessionContext {
  id: string;
  eventSeq: number;
  elapsedMs: number;
}
