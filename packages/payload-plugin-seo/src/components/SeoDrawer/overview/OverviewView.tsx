"use client";

import { Button } from "@payloadcms/ui";
import { Monitor, Smartphone } from "lucide-react";
import { useMemo, useState } from "react";
import type { AnalysisResult } from "../../../engine/types/analysis";
import { SegmentedControl } from "../../../ui/SegmentedControl";
import { cn } from "../../../utils/style";
import { useSeoTranslation } from "../../../translations/useSeoTranslation";
import { SerpPreview } from "../components/SerpPreview";
import type { SerpMode } from "../components/SerpPreview";
import { buildIssues } from "./buildIssues";
import type { IssueCategory } from "./buildIssues";
import { IssueList } from "./IssueList";
import { ScoreSummary } from "./ScoreSummary";

interface OverviewViewProps {
  result: AnalysisResult;
  keyphrase: string;
  synonyms: string[];
  faviconUrl: string;
  onEditKeyphrases: () => void;
}

const CARD = cn("rounded-rm border border-neutral-150 bg-neutral-0");
const SIDE_TITLE = cn("m-0 text-[13px] font-semibold text-neutral-800");

export function OverviewView({
  result,
  keyphrase,
  synonyms,
  faviconUrl,
  onEditKeyphrases,
}: OverviewViewProps) {
  const { t } = useSeoTranslation();
  const [category, setCategory] = useState<IssueCategory | null>(null);
  const [mode, setMode] = useState<SerpMode>("mobile");

  const breakdown = useMemo(() => buildIssues(result), [result]);
  const inCategory = <T extends { category: IssueCategory }>(items: T[]) =>
    category ? items.filter((item) => item.category === category) : items;

  const open = inCategory(breakdown.open);
  const passed = inCategory(breakdown.passed);
  const problems = breakdown.open.filter((issue) => issue.status === "bad").length;
  const improvements = breakdown.open.length - problems;
  const hasKeyphrase = keyphrase.trim().length > 0;

  return (
    <div className="grid grid-cols-[minmax(0,1fr)_400px] gap-[24px] items-start pt-[20px] max-[1100px]:grid-cols-1">
      <div className="flex flex-col gap-[20px] min-w-0">
        <ScoreSummary
          score={result.overall.seoScore}
          status={result.overall.status}
          problems={problems}
          improvements={improvements}
          categories={breakdown.categories}
          selected={category}
          onSelect={setCategory}
        />

        <section className="flex flex-col gap-[10px]">
          <div className="flex items-baseline gap-[8px]">
            <h3 className="m-0 text-[15px] font-semibold text-neutral-800">
              {t("overview.toFix")}
            </h3>
            <span className="text-[13px] text-neutral-500 tabular-nums">{open.length}</span>
            {category && (
              <button
                type="button"
                onClick={() => setCategory(null)}
                className="ml-auto p-0 border-0 bg-transparent text-[12.5px] text-neutral-600 underline underline-offset-2 font-[inherit] cursor-pointer hover:text-neutral-800"
              >
                {t("overview.allCategories")}
              </button>
            )}
          </div>
          <IssueList open={open} passed={passed} />
        </section>
      </div>

      <aside className="flex flex-col gap-[16px] min-w-0">
        <section className={cn(CARD, "p-[16px] flex flex-col gap-[10px]")}>
          {hasKeyphrase ? (
            <>
              <h3 className={SIDE_TITLE}>{t("keyphrase.focusLabel")}</h3>
              <p className="m-0 text-[16px] font-semibold text-neutral-800 break-words">
                {keyphrase}
              </p>
              {synonyms.length > 0 && (
                <p className="m-0 text-[12px] text-neutral-500">{synonyms.join(", ")}</p>
              )}
            </>
          ) : (
            <>
              <h3 className={SIDE_TITLE}>{t("overview.noKeyphrase")}</h3>
              <p className="m-0 text-[12.5px] leading-[1.45] text-neutral-600">
                {t("overview.noKeyphraseHint")}
              </p>
            </>
          )}
          <div>
            <Button buttonStyle="secondary" size="small" margin={false} onClick={onEditKeyphrases}>
              {t(hasKeyphrase ? "overview.editKeyphrase" : "overview.addKeyphrase")}
            </Button>
          </div>
        </section>

        <section className={cn(CARD, "overflow-hidden")}>
          <div className="flex items-center justify-between gap-[12px] px-[16px] py-[12px] border-b border-neutral-150">
            <h3 className={SIDE_TITLE}>{t("serp.title")}</h3>
            <SegmentedControl
              options={[
                {
                  value: "mobile",
                  label: t("serp.mobile"),
                  icon: <Smartphone aria-hidden="true" className="w-[13px] h-[13px]" />,
                },
                {
                  value: "desktop",
                  label: t("serp.desktop"),
                  icon: <Monitor aria-hidden="true" className="w-[13px] h-[13px]" />,
                },
              ]}
              value={mode}
              onChange={setMode}
              label={t("serp.device")}
            />
          </div>
          <div className="p-[16px]">
            <SerpPreview
              data={result.serp}
              keyphrase={keyphrase}
              synonyms={synonyms}
              faviconUrl={faviconUrl}
              mode={mode}
            />
          </div>
          <p className="m-0 px-[16px] py-[10px] border-t border-neutral-150 text-[12px] text-neutral-500">
            {t("overview.wordsRead", {
              words: result.vitals.words.toLocaleString(),
              minutes: result.vitals.readingTimeMinutes,
            })}
          </p>
        </section>
      </aside>
    </div>
  );
}
