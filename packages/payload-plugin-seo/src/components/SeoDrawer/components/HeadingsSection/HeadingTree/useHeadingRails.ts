"use client";

import type { RefObject } from "react";
import { useLayoutEffect, useRef, useState } from "react";
import type { HeadingNode } from "../../../../../engine/types/analysis";

interface VerticalRail {
  left: number;
  top: number;
  height: number;
}

interface Elbow {
  id: string;
  left: number;
  top: number;
  width: number;
}

export interface RailGeometry {
  vertical: VerticalRail;
  elbows: Elbow[];
}

interface UseHeadingRailsParams {
  node: HeadingNode;
  isOpen: boolean;
  collapsed: ReadonlySet<string>;
  onBadgeMount?: (el: HTMLSpanElement | null) => void;
}

interface UseHeadingRailsResult {
  containerRef: RefObject<HTMLDivElement | null>;
  setBadgeRef: (el: HTMLSpanElement | null) => void;
  registerChildBadge: (childId: string) => (el: HTMLSpanElement | null) => void;
  rails: RailGeometry | null;
}

export function useHeadingRails({ node, isOpen, collapsed, onBadgeMount }: UseHeadingRailsParams): UseHeadingRailsResult {
  const containerRef = useRef<HTMLDivElement>(null);
  const badgeRef = useRef<HTMLSpanElement | null>(null);
  const childBadges = useRef(new Map<string, HTMLSpanElement>());
  const childSetters = useRef(new Map<string, (el: HTMLSpanElement | null) => void>());
  const [rails, setRails] = useState<RailGeometry | null>(null);

  const setBadgeRef = (el: HTMLSpanElement | null) => {
    badgeRef.current = el;
    onBadgeMount?.(el);
  };

  const registerChildBadge = (childId: string) => {
    let setter = childSetters.current.get(childId);

    if (!setter) {
      setter = (el: HTMLSpanElement | null) => {
        if (el) childBadges.current.set(childId, el);
        else childBadges.current.delete(childId);
      };

      childSetters.current.set(childId, setter);
    }

    return setter;
  };

  useLayoutEffect(() => {
    if (!isOpen) {
      setRails(null);
      return;
    }

    const container = containerRef.current;
    const parentBadge = badgeRef.current;
    if (!container || !parentBadge) return;

    const measure = () => {
      const containerRect = container.getBoundingClientRect();
      const parentBadgeRect = parentBadge.getBoundingClientRect();

      const railCenterX = parentBadgeRect.left + parentBadgeRect.width / 2 - containerRect.left;
      const railStartY = parentBadgeRect.bottom - containerRect.top;

      const elbows: Elbow[] = [];
      for (const child of node.children) {
        const childBadge = childBadges.current.get(child.id);
        if (!childBadge) continue;

        const childBadgeRect = childBadge.getBoundingClientRect();

        const childCenterX = childBadgeRect.left + childBadgeRect.width / 2 - containerRect.left;
        const childCenterY = childBadgeRect.top + childBadgeRect.height / 2 - containerRect.top;

        elbows.push({
          id: child.id,
          left: railCenterX,
          top: childCenterY,
          width: Math.max(0, childCenterX - railCenterX),
        });
      }

      if (elbows.length === 0) {
        setRails(null);
        return;
      }

      const lastChildCenterY = elbows.at(-1)?.top ?? railStartY;
      setRails({
        vertical: {
          left: railCenterX,
          top: railStartY,
          height: Math.max(0, lastChildCenterY - railStartY),
        },
        elbows,
      });
    };

    measure();

    const observer = new ResizeObserver(measure);

    observer.observe(container);

    return () => observer.disconnect();
  }, [isOpen, collapsed, node]);

  return {
    containerRef,
    setBadgeRef,
    registerChildBadge,
    rails,
  };
}
