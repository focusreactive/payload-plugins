export type AutoAction = "reset" | "skip" | "run";

export function hasKeyphrase(keyphrase: string): boolean {
  return keyphrase.trim().length > 0;
}

export function decideAutoAction(args: { enabled: boolean; hasKeyphrase: boolean; signature: string; lastSignature: string | null }): AutoAction {
  const { enabled, hasKeyphrase: keyphrasePresent, signature, lastSignature } = args;

  if (!enabled) return "skip";
  if (!keyphrasePresent) return "reset";
  if (signature === lastSignature) return "skip";
  return "run";
}
