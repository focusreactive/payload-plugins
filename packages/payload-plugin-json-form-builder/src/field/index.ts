import type { JSONField } from "payload";
import { jsonErrors } from "./checks.js";
import { deepMerge } from "./deepMerge.js";
import { flattenTypedJson } from "./flatten.js";

// Who may build the shape. Answered on the server, where the user is, and never sent to the browser.
export type BuildGate = boolean | string | string[] | ((args: { user: unknown }) => boolean);

// How the plugin finds its own fields in a config it did not write.
export const MARKER = "jsonFormBuilder";

export type JsonFieldOptions = {
  /** Overrides the plugin's own `build` for this one field. */
  build?: BuildGate;
};

// A json field drawn as admin fields. Everything the admin needs is attached by the plugin, which
// is the only thing that can know the anchor's path — so this marks the field and stops there.
export const jsonField = ({
  build,
  ...overrides
}: JsonFieldOptions & Partial<JSONField> = {}): JSONField =>
  deepMerge<JSONField>(
    {
      name: "settings",
      type: "json",
      hooks: { afterRead: [flattenTypedJson] },
      // Replaces Payload's own, so `jsonError` — its report for json that does not parse — is kept.
      // What the editor filled in is judged here; whether the shape holds together is the builder's
      // business, since the builder is the only thing that writes it.
      validate: (value, { jsonError, required }) => jsonError || jsonErrors(value, required),
      admin: { editorOptions: { insertSpaces: true, tabSize: 3 }, maxHeight: 600 },
      custom: { [MARKER]: { build } },
    },
    overrides
  );

// `true` and `false` are the whole answer; a role or a list of them reads `user.role` or `user.roles`,
// which is where most projects keep it. A predicate is the way out when it is kept somewhere else.
export const allows = (gate: BuildGate | undefined, user: unknown): boolean => {
  if (typeof gate === "function") return gate({ user });
  if (gate === undefined || typeof gate === "boolean") return gate ?? true;
  const wanted = Array.isArray(gate) ? gate : [gate];
  const holder = user as { role?: unknown; roles?: unknown } | null;
  const held = [holder?.role, ...(Array.isArray(holder?.roles) ? holder.roles : [])];
  return held.some((role) => typeof role === "string" && wanted.includes(role));
};
