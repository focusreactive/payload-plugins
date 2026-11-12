import { KEYPHRASES_ENDPOINT_PATH, KEYPHRASE_SAVE_DELAY_MS } from "../../constants";
import { sanitizeStoredKeyphrases } from "../../keyphrases/stored";
import type { StoredKeyphrase } from "../../keyphrases/stored";
import type { KeyphraseEntry } from "./keyphraseState";
import { clearKeyphrases, saveKeyphrases, toStored, unsavedStorageKey } from "./keyphraseStorage";

const noop = () => undefined;

interface RemoteSaverTarget {
  apiRoute: string;
  collection: string;
  docId: string;
  locale: string;
}

interface RemoteSaverOptions {
  delay?: number;
  onOutcome?: (outcome: SaveOutcome) => void;
}

interface SaveOptions {
  ifAbsent?: boolean;
}

export type SaveOutcome =
  | { status: "saved" }
  | { status: "failed" }
  | { status: "exists"; keyphrases: StoredKeyphrase[] };

export interface RemoteSaver {
  schedule: (list: KeyphraseEntry[]) => void;
  save: (list: KeyphraseEntry[], options?: SaveOptions) => Promise<SaveOutcome>;
  flush: () => Promise<void>;
}

async function readStoredKeyphrases(res: Response): Promise<StoredKeyphrase[]> {
  const body: unknown = await res.json().catch(noop);
  const { keyphrases } = (body ?? {}) as { keyphrases?: unknown };

  return sanitizeStoredKeyphrases(keyphrases);
}

async function toOutcome(res: Response | undefined): Promise<SaveOutcome> {
  if (res?.ok) return { status: "saved" };
  if (res?.status === 409) return { status: "exists", keyphrases: await readStoredKeyphrases(res) };

  return { status: "failed" };
}

export function createRemoteSaver(
  target: RemoteSaverTarget,
  { delay = KEYPHRASE_SAVE_DELAY_MS, onOutcome = noop }: RemoteSaverOptions = {}
): RemoteSaver {
  const backupKey = unsavedStorageKey(target.collection, target.docId, target.locale);
  let timer: ReturnType<typeof setTimeout> | null = null;
  let pending: KeyphraseEntry[] | null = null;
  let inFlight: Promise<SaveOutcome> | null = null;

  const send = async (list: KeyphraseEntry[], { ifAbsent }: SaveOptions): Promise<SaveOutcome> => {
    const res = await fetch(`${target.apiRoute}${KEYPHRASES_ENDPOINT_PATH}`, {
      method: "PUT",
      credentials: "include",
      keepalive: true,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        collection: target.collection,
        docId: target.docId,
        locale: target.locale,
        keyphrases: toStored(list),
        ...(ifAbsent ? { ifAbsent } : {}),
      }),
    }).catch(noop);
    const outcome = await toOutcome(res);

    onOutcome(outcome);
    return outcome;
  };

  const sendAfter = async (
    previous: Promise<SaveOutcome> | null,
    list: KeyphraseEntry[],
    options: SaveOptions
  ): Promise<SaveOutcome> => {
    if (previous) await previous;

    return send(list, options);
  };

  const forgetWhenSettled = async (outcome: Promise<SaveOutcome>) => {
    await outcome;
    if (inFlight === outcome) inFlight = null;
  };

  const save = (list: KeyphraseEntry[], options: SaveOptions = {}): Promise<SaveOutcome> => {
    const outcome = sendAfter(inFlight, list, options);

    inFlight = outcome;
    void forgetWhenSettled(outcome);

    return outcome;
  };

  const keepForRetry = (list: KeyphraseEntry[], outcome: SaveOutcome) => {
    if (outcome.status === "failed") {
      pending ??= list;
    } else if (!pending) {
      clearKeyphrases(backupKey);
    }
  };

  const flush = async () => {
    if (timer) clearTimeout(timer);
    timer = null;

    if (!pending) return;

    const list = pending;
    pending = null;
    keepForRetry(list, await save(list));
  };

  const schedule = (list: KeyphraseEntry[]) => {
    pending = list;
    saveKeyphrases(backupKey, list);
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => void flush(), delay);
  };

  return { schedule, save, flush };
}
