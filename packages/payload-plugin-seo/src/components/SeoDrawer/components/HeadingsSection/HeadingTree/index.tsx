"use client";

import { useMemo, useState } from "react";
import type { HeadingNode } from "../../../../../engine/types/analysis";
import { cn } from "../../../../../utils/style";
import { collectParentIds } from "./headingTreeView";
import { HeadingTreeGroup } from "./HeadingTreeGroup";

export interface HeadingTreeProps {
  tree: HeadingNode[];
}

const SUB_LABEL = "text-[9.5px] font-semibold uppercase tracking-[0.05em] text-neutral-500";

export function HeadingTree({ tree }: HeadingTreeProps) {
  const parentIds = useMemo(() => collectParentIds(tree), [tree]);
  const [collapsed, setCollapsed] = useState<Set<string>>(() => new Set());

  const empty = tree.length === 0;
  const allCollapsed = parentIds.length > 0 && parentIds.every((id) => collapsed.has(id));

  const toggleAll = () => setCollapsed(allCollapsed ? new Set() : new Set(parentIds));
  const toggle = (id: string) =>
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  return (
    <div className="px-[15px] pt-[11px] border-t border-neutral-150">
      <div className={cn(SUB_LABEL, "flex items-center justify-between")}>
        <span>Structure</span>

        {!empty && (
          <button
            type="button"
            onClick={toggleAll}
            className="text-[11px] font-medium normal-case tracking-normal text-neutral-600 hover:text-neutral-1000 hover:underline underline-offset-2 bg-transparent border-0 p-0 cursor-pointer"
          >
            {allCollapsed ? "Expand all" : "Collapse all"}
          </button>
        )}
      </div>
      {empty ? (
        <div className="px-[15px] pt-[20px] pb-[24px] text-center text-[12px] text-neutral-500">No headings found in this content.</div>
      ) : (
        <div className="relative pt-[5px] pb-[7px]">
          <HeadingTreeGroup nodes={tree} depth={0} collapsed={collapsed} onToggle={toggle} />
        </div>
      )}
    </div>
  );
}
