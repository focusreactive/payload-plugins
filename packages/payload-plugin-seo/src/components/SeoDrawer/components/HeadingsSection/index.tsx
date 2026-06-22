"use client";

import type { HeadingStructure } from "../../../../engine/types/analysis";
import { SectionCard } from "../../../../ui/SectionCard";
import { Pill } from "../../../../ui/Pill";
import { HeadingLevelTiles } from "./HeadingLevelTiles";
import { HeadingTree } from "./HeadingTree";

interface HeadingsSectionProps {
  data: HeadingStructure;
}

export function HeadingsSection({ data }: HeadingsSectionProps) {
  return (
    <SectionCard title="Headings" widget={<Pill variant="neutral">{data.total}</Pill>}>
      <div className="text-[9.5px] font-semibold uppercase tracking-[0.05em] text-neutral-500 px-[15px] pt-[11px]">
        Levels
      </div>
      <HeadingLevelTiles levels={data.levels} />
      <HeadingTree tree={data.tree} />
    </SectionCard>
  );
}
