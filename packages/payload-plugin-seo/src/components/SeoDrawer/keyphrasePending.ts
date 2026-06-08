export function isKeyphrasePending(liveKeyphrase: string, analyzedKeyphrase: string | null): boolean {
  if (liveKeyphrase.trim().length === 0) return false;
  return liveKeyphrase !== analyzedKeyphrase;
}
