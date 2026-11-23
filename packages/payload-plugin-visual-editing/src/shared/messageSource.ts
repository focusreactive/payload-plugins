export const isMessageFrom = (event: MessageEvent, origin: string, source: unknown): boolean =>
  event.origin === origin && event.source === source;
