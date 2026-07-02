import type { Ref } from "react";
import type { HeadingNode } from "../../../../../engine/types/analysis";
import { cn } from "../../../../../utils/style";
import { formatSkippedLevels } from "../headingIssueCopy";
import { Chevron } from "./Chevron";

interface HeadingTreeRowProps {
  node: HeadingNode;
  depth: number;
  hasKids: boolean;
  isOpen: boolean;
  globalFirst: boolean;
  onToggle: (id: string) => void;
  rowRef?: Ref<HTMLDivElement>;
  badgeRef?: Ref<HTMLSpanElement>;
}

export function HeadingTreeRow({
  node,
  depth,
  hasKids,
  isOpen,
  globalFirst,
  onToggle,
  rowRef,
  badgeRef,
}: HeadingTreeRowProps) {
  return (
    <div
      ref={rowRef}
      className={cn(
        "relative flex items-center gap-[9px] h-[34px] box-border",
        hasKids &&
          "cursor-pointer focus-visible:outline-2 focus-visible:outline-neutral-400 focus-visible:-outline-offset-2"
      )}
      style={{ paddingLeft: depth * 20 }}
      role={hasKids ? "button" : undefined}
      tabIndex={hasKids ? 0 : undefined}
      aria-expanded={hasKids ? isOpen : undefined}
      onClick={hasKids ? () => onToggle(node.id) : undefined}
      onKeyDown={
        hasKids
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onToggle(node.id);
              }
            }
          : undefined
      }
      title={hasKids ? (isOpen ? "Collapse" : "Expand") : undefined}
    >
      <span
        ref={badgeRef}
        className="flex-none font-mono text-[9px] font-bold leading-[100%] text-neutral-1000 bg-neutral-150 rounded-rs px-[6px] py-[3px] min-w-[22px] text-center"
      >
        H{node.level}
      </span>

      <div
        className={cn(
          "flex-1 min-w-0 flex items-center gap-[9px] h-full",
          !globalFirst && "border-t border-neutral-150"
        )}
      >
        {node.text ? (
          <span
            className="flex-1 min-w-0 truncate text-[12px] font-medium text-neutral-800"
            title={node.text}
          >
            {node.text}
          </span>
        ) : (
          <span className="flex-1 min-w-0 truncate text-[12px] font-medium italic text-neutral-400">
            (empty heading)
          </span>
        )}

        {node.issue ? (
          <span className="flex-none inline-flex items-center rounded-[20px] bg-seo-warn-100 px-[8px] py-[2px] text-[9.5px] font-bold tracking-[0.02em] text-seo-warn">
            {formatSkippedLevels(node.issue.skipped)}
          </span>
        ) : null}

        {hasKids ? <Chevron open={isOpen} /> : null}
      </div>
    </div>
  );
}
