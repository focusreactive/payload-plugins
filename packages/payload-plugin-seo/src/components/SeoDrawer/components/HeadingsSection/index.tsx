"use client";

import type { HeadingStructure } from "../../../../engine/types/analysis";
import { SectionCard } from "../../../../ui/SectionCard";
import { HeadingIssueBanner } from "./HeadingIssueBanner";
import { HeadingIssuePills } from "./HeadingIssuePills";
import { HeadingLevelTiles } from "./HeadingLevelTiles";
import { HeadingTree } from "./HeadingTree";
import { countHeadingWarnings } from "./HeadingTree/headingTreeView";

interface HeadingsSectionProps {
  data: HeadingStructure;
}

export function HeadingsSection({ data }: HeadingsSectionProps) {
  const warnings = countHeadingWarnings(data.tree);

  return (
    <SectionCard
      title="Headings"
      widget={
        <HeadingIssuePills errors={data.issues.length} warnings={warnings} total={data.total} />
      }
    >
      {data.issues.map((issue) => (
        <HeadingIssueBanner key={issue.type} issue={issue} />
      ))}

      <div className="text-[9.5px] font-semibold uppercase tracking-[0.05em] text-neutral-500 px-[15px] pt-[11px]">
        Levels
      </div>
      <HeadingLevelTiles levels={data.levels} />
      <HeadingTree tree={data.tree} />
    </SectionCard>
  );
}
