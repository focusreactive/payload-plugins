"use client";

import { useConfig } from "@payloadcms/ui";
import { Loader2 } from "lucide-react";
import { docTargetKey } from "../../../keyphrases/docTarget";
import { adminDocHref } from "../../../keyphrases/usage";
import { SectionCard } from "../../../ui/SectionCard";
import { cn, OUTLINE_BUTTON_CLASS } from "../../../utils/style";
import { useSeoTranslation } from "../../../translations/useSeoTranslation";
import { TabWrapper } from "../components/TabWrapper";
import type { LinkSuggestionsState } from "../links/useLinkSuggestions";
import { LinkSuggestionRow } from "./links/LinkSuggestionRow";

const MESSAGE_CLASS = cn("px-[15px] py-[12px] text-[12px]");

function SuggestionsBody({ state }: { state: LinkSuggestionsState }) {
  const { config } = useConfig();
  const { t } = useSeoTranslation();

  if (state.status === "loading") {
    return (
      <div className={cn(MESSAGE_CLASS, "flex items-center gap-[8px] text-neutral-500")}>
        <Loader2 aria-hidden="true" className="w-[14px] h-[14px] animate-spin" />
        {t("links.loading")}
      </div>
    );
  }

  if (state.status === "error") {
    return (
      <div className={cn(MESSAGE_CLASS, "text-seo-bad")} role="alert">
        {t("links.error")}
      </div>
    );
  }

  if (state.status === "idle") return null;

  if (state.suggestions.length === 0) {
    return <div className={cn(MESSAGE_CLASS, "text-neutral-500")}>{t("links.empty")}</div>;
  }

  return (
    <ul className="m-0 p-0 list-none">
      {state.suggestions.map((suggestion) => (
        <LinkSuggestionRow
          adminHref={adminDocHref(config.routes.admin, suggestion)}
          key={docTargetKey(suggestion.collection, suggestion.id)}
          suggestion={suggestion}
        />
      ))}
    </ul>
  );
}

export interface LinksTabProps {
  state: LinkSuggestionsState;
  onFind: () => void;
}

export function LinksTab({ state, onFind }: LinksTabProps) {
  const { t } = useSeoTranslation();
  const loading = state.status === "loading";

  return (
    <TabWrapper>
      <section className="flex flex-col gap-[13px]">
        <SectionCard
          title={t("links.title")}
          widget={
            <button
              aria-disabled={loading}
              className={OUTLINE_BUTTON_CLASS}
              onClick={onFind}
              type="button"
            >
              {t("links.find")}
            </button>
          }
        >
          <p className={cn(MESSAGE_CLASS, "m-0 text-neutral-500")}>{t("links.description")}</p>
          <div aria-busy={loading} aria-live="polite">
            <SuggestionsBody state={state} />
          </div>
        </SectionCard>
      </section>
    </TabWrapper>
  );
}
