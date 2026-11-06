import { KEYPHRASES_ENDPOINT_PATH, KEYPHRASE_SAVE_DELAY_MS } from "../../constants";
import type { KeyphraseEntry } from "./keyphraseState";
import { toStored } from "./keyphraseStorage";

const noop = () => undefined;

interface RemoteSaverTarget {
  apiRoute: string;
  collection: string;
  docId: string;
  locale: string;
}

interface SaveOptions {
  ifAbsent?: boolean;
}

export interface RemoteSaver {
  schedule: (list: KeyphraseEntry[]) => void;
  save: (list: KeyphraseEntry[], options?: SaveOptions) => Promise<boolean>;
  flush: () => void;
}

export function createRemoteSaver(
  target: RemoteSaverTarget,
  delay = KEYPHRASE_SAVE_DELAY_MS
): RemoteSaver {
  let timer: ReturnType<typeof setTimeout> | null = null;
  let pending: KeyphraseEntry[] | null = null;

  const save = async (list: KeyphraseEntry[], { ifAbsent }: SaveOptions = {}): Promise<boolean> => {
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

    return res?.ok === true;
  };

  const flush = () => {
    if (timer) clearTimeout(timer);
    timer = null;

    if (!pending) return;

    const list = pending;
    pending = null;
    void save(list);
  };

  const schedule = (list: KeyphraseEntry[]) => {
    pending = list;
    if (timer) clearTimeout(timer);
    timer = setTimeout(flush, delay);
  };

  return { schedule, save, flush };
}
