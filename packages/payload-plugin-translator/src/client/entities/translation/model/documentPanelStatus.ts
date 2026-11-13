import type { LocaleState } from "../../../../types/wire/DocumentTranslationState.js";
import type { RunState } from "../../../../types/wire/RunState.js";
import { localeRowOf } from "./localeRow.js";
import type { LocaleRow } from "./localeRow.js";
import type { PanelStatus } from "./panelStatus.js";

type RunCarrier = { run: RunState | null };

const isLive = (run: RunState | null): boolean =>
  run?.status === "queued" || run?.status === "running";

/** Any locale's run queued or running. */
export function hasLiveRun(locales: readonly RunCarrier[]): boolean {
  return locales.some(({ run }) => isLive(run));
}

/** The one dot on the document's trigger: failed, then in flight, then behind, then translated. */
export function documentPanelStatus(
  locales: readonly Pick<LocaleState, "locale" | "content" | "run">[]
): PanelStatus {
  const rows = locales.map((state) => ({ locale: state.locale, row: localeRowOf(state) }));
  const has = (...kinds: LocaleRow["kind"][]) => rows.some(({ row }) => kinds.includes(row.kind));

  if (has("failed", "not-started")) return { kind: "failed" };
  if (has("queued", "translating")) return { kind: "running" };
  const staleLocales = rows.filter(({ row }) => row.kind === "behind").map(({ locale }) => locale);
  if (staleLocales.length > 0) return { kind: "stale", staleLocales };
  if (has("up-to-date", "translated")) return { kind: "fresh" };
  return { kind: "none" };
}
