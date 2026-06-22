"use client";

import type { HeadingNode } from "../../../../../engine/types/analysis";
import { HeadingTreeRow } from "./HeadingTreeRow";
import { useHeadingRails } from "./useHeadingRails";

interface HeadingTreeNodeProps {
  node: HeadingNode;
  depth: number;
  globalFirst: boolean;
  collapsed: ReadonlySet<string>;
  onToggle: (id: string) => void;
  onBadgeMount?: (el: HTMLSpanElement | null) => void;
}

function HeadingTreeNode({
  node,
  depth,
  globalFirst,
  collapsed,
  onToggle,
  onBadgeMount,
}: HeadingTreeNodeProps) {
  const hasKids = node.children.length > 0;
  const isOpen = hasKids && !collapsed.has(node.id);

  const { containerRef, setBadgeRef, registerChildBadge, rails } = useHeadingRails({
    node,
    isOpen,
    collapsed,
    onBadgeMount,
  });

  return (
    <div ref={containerRef} className="relative">
      {rails ? (
        <>
          <span
            className="absolute w-[1.1px] bg-neutral-150"
            style={{
              left: rails.vertical.left,
              top: rails.vertical.top,
              height: rails.vertical.height,
            }}
          />

          {rails.elbows.map((elbow) => (
            <span
              key={elbow.id}
              className="absolute h-[1.1px] bg-neutral-150"
              style={{
                left: elbow.left,
                top: elbow.top,
                width: elbow.width,
              }}
            />
          ))}
        </>
      ) : null}

      <HeadingTreeRow
        node={node}
        depth={depth}
        hasKids={hasKids}
        isOpen={isOpen}
        globalFirst={globalFirst}
        onToggle={onToggle}
        badgeRef={setBadgeRef}
      />

      {isOpen ? (
        <div>
          {node.children.map((child) => (
            <HeadingTreeNode
              key={child.id}
              node={child}
              depth={depth + 1}
              globalFirst={false}
              collapsed={collapsed}
              onToggle={onToggle}
              onBadgeMount={registerChildBadge(child.id)}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}

interface HeadingTreeGroupProps {
  nodes: HeadingNode[];
  depth: number;
  collapsed: ReadonlySet<string>;
  onToggle: (id: string) => void;
}

export function HeadingTreeGroup({ nodes, depth, collapsed, onToggle }: HeadingTreeGroupProps) {
  return (
    <>
      {nodes.map((node, i) => (
        <HeadingTreeNode
          key={node.id}
          node={node}
          depth={depth}
          globalFirst={depth === 0 && i === 0}
          collapsed={collapsed}
          onToggle={onToggle}
        />
      ))}
    </>
  );
}
