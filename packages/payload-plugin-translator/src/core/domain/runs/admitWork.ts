export type OnADocument = {
  collectionSlug: string;
  collectionId: string;
};

export type Admission<Work> = {
  admitted: Work[];
  busyDocumentIds: string[];
};

/** Cannot occur in a slug or an id, so no two documents share an address. */
const SEPARATOR_NO_IDENTIFIER_CARRIES = "\u0000";

const addressOf = (document: OnADocument): string => {
  return `${document.collectionSlug}${SEPARATOR_NO_IDENTIFIER_CARRIES}${document.collectionId}`;
};

/**
 * One run per document at a time: Payload rebuilds the whole document from the state a run read, so
 * a later write puts the earlier run's locales back as they were. Any unsettled run blocks, however
 * few locales it covers.
 */
export function admitWork<Work extends OnADocument>(args: {
  work: readonly Work[];
  inFlight: readonly OnADocument[];
}): Admission<Work> {
  const busyAddresses = new Set(args.inFlight.map(addressOf));
  const admitted: Work[] = [];
  const busy = new Set<string>();

  for (const item of args.work) {
    if (busyAddresses.has(addressOf(item))) busy.add(item.collectionId);
    else admitted.push(item);
  }

  return { admitted, busyDocumentIds: [...busy] };
}
