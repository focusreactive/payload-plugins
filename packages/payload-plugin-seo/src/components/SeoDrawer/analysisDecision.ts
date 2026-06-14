export type AutoAction = "skip" | "run";

export function decideAutoAction(args: { enabled: boolean; signature: string; lastSignature: string | null }): AutoAction {
  const { enabled, signature, lastSignature } = args;

  if (!enabled) return "skip";
  if (signature === lastSignature) return "skip";
  return "run";
}
