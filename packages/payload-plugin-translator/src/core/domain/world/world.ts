export type WorldKind = World<unknown>["kind"];

export type HostVersionSwitches = {
  readonly drafts: boolean;
  readonly autosave: boolean;
};

export type World<Read> =
  | {
      readonly kind: "layered";
      readonly autosave: boolean;
      readonly read: { readonly latest: Read; readonly published: Read };
    }
  | {
      readonly kind: "single-layer";
      readonly read: { readonly latest: Read };
    };

type ReadsOfEachLayer<Read> = {
  readonly latest: Read;
  readonly published: Read;
};

export function resolveWorld<Read>(
  switches: HostVersionSwitches,
  reads: ReadsOfEachLayer<Read>
): World<Read> {
  if (!switches.drafts) return { kind: "single-layer", read: { latest: reads.latest } };

  return {
    kind: "layered",
    autosave: switches.autosave,
    read: { latest: reads.latest, published: reads.published },
  };
}
