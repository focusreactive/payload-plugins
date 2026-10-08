import type { JSONField } from "payload";
import { jsonErrors } from "./checks.js";
import { deepMerge } from "./deepMerge.js";
import { flattenTypedJson } from "./flatten.js";

export type BuildGate = boolean | string | string[] | ((args: { user: unknown }) => boolean);

export const MARKER = "jsonFormBuilder";

export type JsonFieldOptions = {
  build?: BuildGate;
  shares?: boolean;
};

export type Mark = { build?: BuildGate; library?: boolean; shares?: boolean };

export const jsonField = ({
  build,
  shares,
  ...overrides
}: JsonFieldOptions & Partial<JSONField> = {}): JSONField =>
  deepMerge<JSONField>(
    {
      name: "settings",
      type: "json",
      hooks: { afterRead: [flattenTypedJson] },
      // Replaces Payload's own, so `jsonError` — its report for json that does not parse — is kept.
      validate: (value, { jsonError, required }) => jsonError || jsonErrors(value, required),
      admin: { editorOptions: { insertSpaces: true, tabSize: 3 }, maxHeight: 600 },
      custom: { [MARKER]: { build, shares } },
    },
    overrides
  );

export const allows = (gate: BuildGate | undefined, user: unknown): boolean => {
  if (typeof gate === "function") return gate({ user });
  if (gate === undefined || typeof gate === "boolean") return gate ?? true;
  const wanted = Array.isArray(gate) ? gate : [gate];
  const holder = user as { role?: unknown; roles?: unknown } | null;
  const held = [holder?.role, ...(Array.isArray(holder?.roles) ? holder.roles : [])];
  return held.some((role) => typeof role === "string" && wanted.includes(role));
};
